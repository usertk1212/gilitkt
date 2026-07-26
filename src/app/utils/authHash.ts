/**
 * Password hashing for the Superuser gate.
 *
 * WHAT THIS DOES
 * The plaintext password exists nowhere in GILI — not in the source, not in the
 * JS bundle, not in the network tab, not in Appwrite. Only a PBKDF2-SHA256
 * digest is stored (see ../authConfig.ts). Unlocking hashes what you typed and
 * compares digests.
 *
 * WHAT THIS DOES NOT DO
 * It is not encryption, and it is not a security boundary. GILI is a static
 * client-side bundle with no backend, so the comparison happens in the browser.
 * Anyone who opens devtools can still walk past the gate by setting the unlock
 * flag in sessionStorage by hand — no amount of hashing changes that. Real
 * enforcement would mean Appwrite accounts plus collection-level permissions.
 *
 * What hashing genuinely buys us: the password can no longer be *read* out of
 * the app by someone poking around, and it can't leak from the database,
 * because it was never put there.
 *
 * PARAMETERS — do not change these without regenerating the stored digest,
 * since every one of them is an input to the result.
 */
const SALT = 'gili.superuser.v1';
const ITERATIONS = 200_000;
const KEY_BITS = 256;

/**
 * Web Crypto is only exposed on secure origins (https, or localhost). On a
 * plain-http deployment crypto.subtle is undefined, and we'd rather say so
 * loudly than fall back to something weaker or, worse, let everyone in.
 */
export function isHashingAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PBKDF2-SHA256(password, SALT, 200k) as a 64-character hex string. */
export async function hashPassword(password: string): Promise<string> {
  if (!isHashingAvailable()) {
    throw new Error(
      'This browser will not expose Web Crypto on an insecure origin. Open GILI over https (or on localhost).'
    );
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  );
  return toHex(bits);
}

/**
 * Compare in constant time.
 *
 * Honestly, timing-attacking a client-side comparison is absurd when you could
 * just edit the JS — but a length-independent compare costs three lines, so
 * there's no reason to write the sloppy version.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when `input` hashes to `expectedHex`. Empty input never matches. */
export async function verifyPassword(input: string, expectedHex: string): Promise<boolean> {
  if (!input || !expectedHex) return false;
  const actual = await hashPassword(input);
  return constantTimeEquals(actual.toLowerCase(), expectedHex.trim().toLowerCase());
}

/** Exposed so the Settings screen can show which parameters produced a digest. */
export const HASH_PARAMS = { algorithm: 'PBKDF2-SHA256', salt: SALT, iterations: ITERATIONS, bits: KEY_BITS };
