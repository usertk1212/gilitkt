/**
 * Password hashing for the Superuser gate.
 *
 * ── WHAT IS STORED ─────────────────────────────────────────────────────────────
 * Never the password. Only a self-describing string:
 *
 *   pbkdf2-sha256$600000$<salt base64url>$<digest base64url>
 *
 * The parameters travel with the digest, so raising ITERATIONS later doesn't
 * invalidate credentials created today — verification uses whatever the stored
 * string says, while new passwords get the current settings.
 *
 * ── HOW HARD IS THIS TO BRUTE-FORCE ────────────────────────────────────────────
 * Three things make offline guessing expensive:
 *
 *   1. 600,000 PBKDF2-SHA256 iterations. Every single guess costs the attacker
 *      the same ~600k compressions it costs us. On a high-end GPU rig that's
 *      roughly 10^4 guesses/second, versus ~10^10/s for a plain SHA-256.
 *   2. A random 16-byte salt per password. No rainbow tables, no precomputation,
 *      and no sharing work between two GILI installs.
 *   3. A minimum strength requirement on new passwords (see estimateStrength).
 *
 * That third one is the only one that actually decides the outcome. Iterations
 * multiply the cost per guess by a constant; password length multiplies the
 * NUMBER of guesses exponentially. A short or dictionary-based password falls in
 * minutes no matter how high the iteration count, because the attacker tries
 * likely candidates rather than enumerating the whole keyspace. This is why the
 * Settings screen refuses weak passwords instead of just warning about them.
 *
 * ── WHAT THIS STILL DOESN'T DO ─────────────────────────────────────────────────
 * It does not make the Superuser menu secure. GILI is a static site with no
 * backend: the comparison runs in your browser, so someone with devtools can set
 * the unlock flag by hand and never touch a password. Hashing protects the
 * password. Only real accounts and server-side permissions protect the menu.
 */

const ALGORITHM = 'pbkdf2-sha256';
/** Iterations for newly created credentials. Verification honours what's stored. */
export const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export function isHashingAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && !!crypto.getRandomValues;
}

function assertAvailable() {
  if (!isHashingAvailable()) {
    throw new Error(
      'This browser will not expose Web Crypto on an insecure origin. Open GILI over https, or on localhost.'
    );
  }
}

// base64url, so the encoded credential is safe in JSON, URLs and source files.
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  assertAvailable();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** Hash a password with a fresh random salt. Returns the encoded credential. */
export async function createCredential(password: string): Promise<string> {
  assertAvailable();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(digest)}`;
}

/** Constant-time byte comparison. */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** True when `password` matches the encoded credential. Malformed input is false. */
export async function verifyCredential(password: string, encoded: string): Promise<boolean> {
  if (!password || !encoded) return false;
  const parts = encoded.trim().split('$');
  if (parts.length !== 4) return false;
  const [algorithm, iterationsRaw, saltRaw, digestRaw] = parts;
  if (algorithm !== ALGORITHM) return false;

  const iterations = Number.parseInt(iterationsRaw, 10);
  // Guard against a tampered credential specifying 1 iteration (which would make
  // guessing cheap) or something absurd enough to hang the tab.
  if (!Number.isFinite(iterations) || iterations < 100_000 || iterations > 5_000_000) return false;

  try {
    const salt = fromBase64Url(saltRaw);
    const expected = fromBase64Url(digestRaw);
    const actual = await derive(password, salt, iterations);
    return constantTimeEquals(actual, expected);
  } catch {
    return false; // unparseable base64 — treat as a non-match, never as a pass
  }
}

/** Iteration count baked into a stored credential, for display. Null if unknown. */
export function credentialIterations(encoded: string): number | null {
  const n = Number.parseInt(encoded.split('$')[1] ?? '', 10);
  return Number.isFinite(n) ? n : null;
}

// ── Strength estimation ───────────────────────────────────────────────────────
//
// Deliberately pessimistic. It assumes the attacker knows the password's shape
// and only has to search that shape, which is how real cracking works — a
// wordlist plus mangling rules, not a blind enumeration of every byte string.

const COMMON_WORDS = [
  'password', 'passw0rd', 'gili', 'tiket', 'admin', 'superuser', 'joy', 'welcome',
  'qwerty', 'letmein', 'secret', 'illustration', 'design', 'asset', 'library',
];

export interface Strength {
  /** Estimated bits of entropy, after penalties. */
  bits: number;
  verdict: 'unacceptable' | 'weak' | 'fair' | 'strong';
  /** Passes the minimum bar the Settings screen enforces. */
  acceptable: boolean;
  /** Plain-language reasons, shown to the user. */
  reasons: string[];
  /** Time for an offline attacker at the assumed rate. */
  crackTime: string;
}

/**
 * Assumed attacker: a GPU rig managing 100,000 PBKDF2-SHA256(600k) guesses per
 * second. That is generous — a single high-end card is closer to 10,000 — so
 * treat the resulting estimate as a floor, not a promise.
 */
const ASSUMED_GUESSES_PER_SEC = 100_000;

function humanDuration(seconds: number): string {
  if (seconds < 1) return 'instantly';
  const units: [number, string][] = [
    [60, 'seconds'], [60, 'minutes'], [24, 'hours'], [365, 'days'], [1000, 'years'],
  ];
  let value = seconds;
  let label = 'seconds';
  for (const [factor, next] of units) {
    if (value < factor) break;
    value /= factor;
    label = next;
  }
  if (label === 'years' && value >= 1000) return 'longer than anyone will wait';
  return `about ${value < 10 ? value.toFixed(1) : Math.round(value)} ${label}`;
}

export function estimateStrength(password: string): Strength {
  const reasons: string[] = [];
  if (!password) {
    return { bits: 0, verdict: 'unacceptable', acceptable: false, reasons: [], crackTime: 'instantly' };
  }

  const lower = password.toLowerCase();
  let charset = 0;
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charset += 33;

  let bits = password.length * Math.log2(Math.max(charset, 2));

  // Penalties for the patterns crackers try first.
  const matchedWord = COMMON_WORDS.find((w) => lower.includes(w));
  if (matchedWord) {
    bits -= 14;
    reasons.push(`Contains "${matchedWord}", which is on every wordlist — and on one aimed at this project in particular.`);
  }
  if (/^[a-z]+[0-9]{1,4}$/.test(password)) {
    bits -= 12;
    reasons.push('Word-then-digits is the single most common password shape, so it gets tried early.');
  }
  if (/(.)\1{2,}/.test(password)) {
    bits -= 4;
    reasons.push('Repeated characters add length without adding unpredictability.');
  }
  if (/^(?:0123|1234|abcd|qwer)/i.test(password)) {
    bits -= 10;
    reasons.push('Starts with a keyboard or counting sequence.');
  }
  if (password.length < 12) {
    reasons.push('Under 12 characters. Length is the only lever that scales against offline guessing.');
  }
  bits = Math.max(bits, 0);

  const seconds = Math.pow(2, bits) / 2 / ASSUMED_GUESSES_PER_SEC;

  // The bar: 12+ characters AND at least 60 bits after penalties. 60 bits at the
  // assumed rate is ~180 years, which is where this stops being the weak link.
  const acceptable = password.length >= 12 && bits >= 60;
  const verdict: Strength['verdict'] =
    bits < 40 ? 'unacceptable' : !acceptable ? 'weak' : bits < 75 ? 'fair' : 'strong';

  return { bits: Math.round(bits), verdict, acceptable, reasons, crackTime: humanDuration(seconds) };
}
