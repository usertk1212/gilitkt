/**
 * First-run Superuser credential.
 *
 * This is a salted PBKDF2-SHA256 credential, NOT a password. Reading it tells you
 * nothing about what to type, and it's safe in git, in the bundle, in a
 * screenshot.
 *
 * It is only a FALLBACK. Once you change the password in Superuser → Settings,
 * the new credential is stored in Appwrite Storage and this value is ignored
 * everywhere, on every device. It exists so a fresh deployment isn't locked out
 * before anyone has set a password.
 *
 * Because it ships in the source, the initial password should be treated as
 * public knowledge among anyone who can see the repo — change it once in Settings
 * and it stops mattering.
 */
export const DEFAULT_SUPERUSER_CREDENTIAL =
  'pbkdf2-sha256$600000$w3EmmDgHMkr1iF-tJOpoug$9SIJZY384Hko9rMbdVMAhc2TtuhBSdlV7eXNwMP3Px0';
