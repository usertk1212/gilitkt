/* Appwrite client configuration.
   These values come from your Appwrite project's Settings page, and from
   the Database / Table you create for the "assets" table. */

import { Client, Databases, Storage, ID, Query } from 'appwrite';

export const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;
export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
// Hardcoded, not read from env — the "assets" table's ID in Appwrite is
// literally the string "assets" (set when the table was created), so this
// removes one env var you'd otherwise have to set correctly in Vercel.
// If you ever recreate the table with a different ID, update this value.
export const APPWRITE_ASSETS_COLLECTION_ID = 'assets';
// Storage bucket holding app settings: the About-dialog image and the Superuser
// credential. Named "gili-settings" in the console; this is its generated ID.
//
// Appwrite assigns an ID when you leave the Bucket ID field blank, and the ID —
// not the display name — is what the API takes. Renaming the bucket is fine;
// changing its ID means updating this line.
//
// Bucket settings this code assumes:
//   File security  off, so the bucket-level permissions apply
//   Permissions    Any → Create, Read, Update, Delete
export const APPWRITE_SETTINGS_BUCKET_ID = '6a664fbd002089a25aa0';

// Fixed file IDs, so each setting is always the same object — saving replaces it
// instead of piling up orphans.
export const ABOUT_IMAGE_FILE_ID = 'about_image';
export const SUPERUSER_CREDENTIAL_FILE_ID = 'superuser_auth';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };
