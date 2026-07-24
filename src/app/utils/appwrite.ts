/* Appwrite client configuration.
   These values come from your Appwrite project's Settings page, and from
   the Database / Table you create for the "assets" table. */

import { Client, Databases, ID, Query } from 'appwrite';

export const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;
export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
// Hardcoded, not read from env — the "assets" table's ID in Appwrite is
// literally the string "assets" (set when the table was created), so this
// removes one env var you'd otherwise have to set correctly in Vercel.
// If you ever recreate the table with a different ID, update this value.
export const APPWRITE_ASSETS_COLLECTION_ID = 'assets';
// Small table used only to store the admin-menu password (a single document).
// Create it once in the Appwrite console: Table ID "settings", with String
// columns "key" and "value". No need to insert any row manually — the app
// creates the first row itself the first time the password is changed.
export const APPWRITE_SETTINGS_COLLECTION_ID = 'settings';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export { ID, Query };
