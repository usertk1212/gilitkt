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
// Storage bucket holding the About-dialog image.
//
// Create it once in the Appwrite console → Storage → Create bucket:
//   Bucket ID   gili-settings   (must match exactly — it's referenced here)
//   Permissions Any → Create, Read, Update, Delete
//   File security  off, so the bucket permissions above apply
//
// A bucket rather than a database column because the cropped JPEG is ~50-100 KB.
// As a file it stays binary and is served from Appwrite's CDN; as a base64 string
// in a document it would be ~35% larger and bump against attribute size limits.
export const APPWRITE_SETTINGS_BUCKET_ID = 'gili-settings';

// Fixed file ID, so "the About image" is always the same object — saving again
// replaces it instead of piling up orphans.
export const ABOUT_IMAGE_FILE_ID = 'about_image';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };
