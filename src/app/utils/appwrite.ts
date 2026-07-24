/* Appwrite client configuration.
   Replaces the old Supabase project connection (see utils/supabase/info.tsx).
   These values come from your Appwrite project's Settings page, and from
   the Database / Collection you create for the "assets" table. */

import { Client, Databases, ID, Query } from 'appwrite';

export const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;
export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
export const APPWRITE_ASSETS_COLLECTION_ID = import.meta.env
  .VITE_APPWRITE_ASSETS_COLLECTION_ID as string;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export { ID, Query };
