/**
 * The one and only Superuser credential.
 *
 * This is a PBKDF2-SHA256 digest, NOT the password. Reading this file tells you
 * nothing about what to type. Nothing here is secret in the sense that it needs
 * protecting — it's safe in git, safe in the bundle, safe in a screenshot.
 *
 * ── TO CHANGE THE PASSWORD ──────────────────────────────────────────────────
 * The digest is compiled into the app, so changing it needs a rebuild — you
 * cannot change it from the UI alone, and GILI no longer pretends otherwise.
 *
 *   1. Open Superuser → Settings and type the new password.
 *   2. Press "Generate hash", then Copy.
 *   3. Send that line back, or paste it over SUPERUSER_PASSWORD_HASH below.
 *   4. Rebuild and redeploy.
 *
 * The generator runs entirely in your browser and never transmits the password.
 *
 * ── CURRENT VALUE ───────────────────────────────────────────────────────────
 * Digest of the initial password, using the parameters in
 * utils/authHash.ts (salt "gili.superuser.v1", 200,000 iterations, SHA-256).
 * Regenerating with different parameters will invalidate this value.
 */
export const SUPERUSER_PASSWORD_HASH =
  'c0703f4558b7850cee2ffaf59e1f5d50a4b67e9ec16d18cea7ad869c4e65468a';
