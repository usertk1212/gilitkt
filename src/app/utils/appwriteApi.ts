/* Data access layer for the "assets" table in Appwrite.
   See ./appwrite.ts for the client/config setup. */
import { databases, ID, Query, APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, APPWRITE_SETTINGS_COLLECTION_ID } from './appwrite';

export interface Asset {
  id: string; // Appwrite's own document $id — always unique, use this for React keys etc.
  nama_file: string; // Business key (filename) — NOT guaranteed unique if a file got imported more than once
  asset_name: string;
  url_lightroom: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  updatedCount?: number;
  source?: string;
  errors?: string[];
}

// Appwrite stores its own document id ($id) and timestamps ($createdAt/$updatedAt)
// alongside our fields. We read the timestamps from those built-in fields (instead
// of maintaining our own created_at/updated_at columns) and expose them under the
// same created_at/updated_at names components already expect.
function toAsset(doc: any): Asset {
  return {
    id: doc.$id,
    nama_file: doc.nama_file,
    asset_name: doc.asset_name,
    url_lightroom: doc.url_lightroom,
    type: doc.type,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error occurred';
}

// Look up the underlying Appwrite document by our logical key (nama_file),
// since Appwrite's own document id is a separate, auto-generated value.
async function findDocumentByFilename(nama_file: string): Promise<any | null> {
  const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, [
    Query.equal('nama_file', nama_file),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}

// Initialize the asset management system.
// With Appwrite, the Database/Collection/Attributes are created once up front
// in the Appwrite console (or via CLI), so there's no schema migration to run
// here at app start. Kept as a no-op health-style call so existing call sites
// (App startup, useAssetData hook) don't need to change.
export async function initializeAssetSystem(): Promise<ApiResponse<any>> {
  console.log('🚀 Checking asset management system...');
  try {
    await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, [Query.limit(1)]);
    return { success: true, message: 'System ready' };
  } catch (error) {
    console.error('🚨 Failed to reach Appwrite:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// --- Local cache for the full asset list ---
// Every load of the app used to re-fetch ALL documents from Appwrite (dozens of
// paginated requests for a few thousand rows), even when nothing had changed —
// slow and wasteful on bandwidth. This caches the result in localStorage for a
// few minutes so opening/reopening the app feels instant, while still fetching
// fresh data automatically once the cache goes stale, or immediately after any
// write (create/update/delete/import) so you never see outdated data.
const ASSETS_CACHE_KEY = 'gili_assets_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readAssetsCache(): { data: Asset[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(ASSETS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAssetsCache(data: Asset[]) {
  try {
    localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full/unavailable — skip caching silently, app still works, just slower.
  }
}

// Call after any write so stale cached data never lingers.
export function invalidateAssetsCache() {
  try {
    localStorage.removeItem(ASSETS_CACHE_KEY);
  } catch {
    // no-op
  }
}

// Get all assets. Pass { forceRefresh: true } (e.g. from a manual "Refresh" button)
// to skip the cache and hit Appwrite directly.
export async function getAllAssets(options?: { forceRefresh?: boolean }): Promise<ApiResponse<Asset[]>> {
  if (!options?.forceRefresh) {
    const cached = readAssetsCache();
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`📦 Using cached assets (${cached.data.length}) — no request sent to Appwrite.`);
      return { success: true, data: cached.data, count: cached.data.length };
    }
  }

  console.log('📋 Fetching all assets from Appwrite...');
  try {
    const assets: Asset[] = [];
    let cursor: string | undefined;

    // Page through all documents (Appwrite caps a single list call at 100 by default)
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
      res.documents.forEach((doc: any) => assets.push(toAsset(doc)));

      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }

    writeAssetsCache(assets);
    return { success: true, data: assets, count: assets.length };
  } catch (error) {
    console.error('🚨 Failed to fetch assets:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Get single asset by filename (CRUD - READ)
export async function getAssetByFilename(nama_file: string): Promise<ApiResponse<Asset>> {
  console.log('🔍 Fetching asset by filename:', nama_file);
  try {
    const doc = await findDocumentByFilename(nama_file);
    if (!doc) {
      return { success: false, error: 'Asset not found', message: `No asset found with filename: ${nama_file}` };
    }
    return { success: true, data: toAsset(doc) };
  } catch (error) {
    console.error('🚨 Failed to fetch asset:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Create a single asset (CRUD - CREATE)
export async function createAsset(asset: Omit<Asset, 'created_at' | 'updated_at'>): Promise<ApiResponse<Asset>> {
  console.log('➕ Creating asset with filename key:', asset.nama_file);
  try {
    const existing = await findDocumentByFilename(asset.nama_file);
    if (existing) {
      return { success: false, error: `Asset already exists: ${asset.nama_file}` };
    }

    // Not passing created_at/updated_at — Appwrite sets $createdAt/$updatedAt automatically.
    const doc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, ID.unique(), {
      nama_file: asset.nama_file,
      asset_name: asset.asset_name,
      url_lightroom: asset.url_lightroom,
      type: asset.type,
    });

    invalidateAssetsCache();
    return { success: true, data: toAsset(doc), message: 'Asset created successfully' };
  } catch (error) {
    console.error('🚨 Failed to create asset:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Update asset by filename (CRUD - UPDATE)
export async function updateAsset(nama_file: string, asset: Omit<Asset, 'nama_file' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Asset>> {
  console.log('📝 Updating asset by filename:', nama_file);
  try {
    const existing = await findDocumentByFilename(nama_file);
    if (!existing) {
      return { success: false, error: 'Asset not found', message: `No asset found with filename: ${nama_file}` };
    }

    // Not passing updated_at — Appwrite bumps $updatedAt automatically on every update.
    const doc = await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, existing.$id, {
      asset_name: asset.asset_name,
      url_lightroom: asset.url_lightroom,
      type: asset.type,
    });

    invalidateAssetsCache();
    return { success: true, data: toAsset(doc), message: 'Asset updated successfully' };
  } catch (error) {
    console.error('🚨 Failed to update asset:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Delete asset by filename (CRUD - DELETE)
export async function deleteAsset(nama_file: string): Promise<ApiResponse<Asset>> {
  console.log('🗑️ Deleting asset by filename:', nama_file);
  try {
    const existing = await findDocumentByFilename(nama_file);
    if (!existing) {
      return { success: false, error: 'Asset not found', message: `No asset found with filename: ${nama_file}` };
    }

    await databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, existing.$id);
    invalidateAssetsCache();
    return { success: true, data: toAsset(existing), message: 'Asset deleted successfully' };
  } catch (error) {
    console.error('🚨 Failed to delete asset:', error);
    return { success: false, error: errorMessage(error) };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Bulk create assets (filename-based keys)
//
// Rewritten to avoid hammering Appwrite Cloud's rate limit: the old version made
// TWO API calls per row (a listDocuments duplicate-check + a createDocument), all
// fired back-to-back with no pacing — for a few thousand rows that's thousands of
// rapid sequential requests, which is what was causing imports to stall partway
// and throw "Failed to fetch" elsewhere in the app.
//
// This version fetches existing filenames ONCE up front (so re-running an import
// that partially succeeded skips already-created rows with zero extra API calls),
// then creates only the missing ones directly (skipping the redundant per-row
// duplicate check), with a small delay between requests to stay well under
// Appwrite's rate limit.
/**
 * Every `nama_file` currently in the database, as a Set for O(1) lookups.
 *
 * Used by the CSV Viewer to tell you which rows are genuinely new before you
 * import anything. Same pagination as getAllAssets(), but only keeps filenames
 * so a 5k-row library stays cheap to hold in memory.
 */
export async function getExistingFilenames(
  onProgress?: (fetched: number) => void
): Promise<ApiResponse<Set<string>>> {
  const filenames = new Set<string>();
  try {
    let cursor: string | undefined;
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
      res.documents.forEach((doc: any) => {
        if (doc.nama_file) filenames.add(doc.nama_file);
      });
      onProgress?.(filenames.size);
      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
      await sleep(50);
    }
    return { success: true, data: filenames, count: filenames.size };
  } catch (error) {
    return { success: false, error: `Failed to read existing filenames: ${errorMessage(error)}` };
  }
}

export async function bulkCreateAssets(
  assets: Omit<Asset, 'created_at' | 'updated_at'>[],
  onProgress?: (done: number, total: number) => void,
  options?: {
    // When true, rows whose filename already exists in the database get their
    // `type` field updated to match the CSV instead of being skipped untouched.
    // Only `type` is touched — asset_name/url_lightroom on existing rows are
    // left alone. Off by default so re-running an import is always a no-op
    // for rows that already exist, unless you explicitly opt in.
    updateExistingType?: boolean;
    /**
     * Lets the caller pause / resume / cancel a long import without losing the
     * rows already written. Checked once per row, so a paused import stops at a
     * clean boundary rather than mid-write.
     */
    control?: {
      isPaused: () => boolean;
      isCancelled: () => boolean;
    };
    /** Fires whenever the loop parks on a pause, so the UI can say so. */
    onPausedChange?: (paused: boolean) => void;
  }
): Promise<ApiResponse<Asset[]>> {
  console.log(`📦 Bulk creating ${assets.length} assets with filename keys...`);
  const created: Asset[] = [];
  const errors: string[] = [];
  const seenFilenames = new Set<string>();
  const total = assets.length;

  // Fetch every existing nama_file → $id once, paginating like getAllAssets() does.
  // Keeping the $id (not just the filename) lets us update-in-place when
  // updateExistingType is on, without an extra lookup per row.
  const existingByFilename = new Map<string, string>();
  try {
    let cursor: string | undefined;
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
      res.documents.forEach((doc: any) => existingByFilename.set(doc.nama_file, doc.$id));
      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
      await sleep(50);
    }
  } catch (error) {
    return { success: false, error: `Failed to check existing assets before import: ${errorMessage(error)}` };
  }
  console.log(`📋 Found ${existingByFilename.size} assets already in the database.`);

  const DELAY_MS = 80; // pace requests to stay under Appwrite Cloud's rate limit
  let processed = 0;
  let updatedCount = 0;
  onProgress?.(0, total);

  let cancelled = false;
  let announcedPause = false;

  for (const asset of assets) {
    // --- pause / cancel gate, evaluated once per row ---
    while (options?.control?.isPaused() && !options?.control?.isCancelled()) {
      if (!announcedPause) {
        announcedPause = true;
        options?.onPausedChange?.(true);
      }
      await sleep(250);
    }
    if (announcedPause) {
      announcedPause = false;
      options?.onPausedChange?.(false);
    }
    if (options?.control?.isCancelled()) {
      cancelled = true;
      break;
    }

    const filename = asset.nama_file?.trim();
    if (!filename || !asset.asset_name || !asset.url_lightroom || !asset.type) {
      errors.push(`Invalid asset data: ${filename || 'unknown'}`);
      processed++;
      onProgress?.(processed, total);
      continue;
    }
    if (seenFilenames.has(filename)) {
      errors.push(`Duplicate filename in batch: ${filename}`);
      processed++;
      onProgress?.(processed, total);
      continue;
    }
    seenFilenames.add(filename);

    const existingId = existingByFilename.get(filename);
    if (existingId) {
      if (options?.updateExistingType) {
        try {
          await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, existingId, {
            type: asset.type,
          });
          updatedCount++;
        } catch (error) {
          errors.push(`Failed to update type for: ${filename} — ${errorMessage(error)}`);
        }
        await sleep(DELAY_MS);
      }
      // Already exists and either updated above or left untouched — no create needed.
      processed++;
      onProgress?.(processed, total);
      continue;
    }

    try {
      // Not passing created_at/updated_at — Appwrite sets $createdAt/$updatedAt automatically.
      const doc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, ID.unique(), {
        nama_file: filename,
        asset_name: asset.asset_name,
        url_lightroom: asset.url_lightroom,
        type: asset.type,
      });
      created.push(toAsset(doc));
    } catch (error) {
      errors.push(`Failed to create: ${filename} — ${errorMessage(error)}`);
    }

    processed++;
    onProgress?.(processed, total);

    await sleep(DELAY_MS);
  }

  // A cancelled run is still a success for everything it managed to write —
  // reporting it as a failure would imply nothing landed, which is wrong.
  if (!cancelled && created.length === 0 && updatedCount === 0 && existingByFilename.size === 0) {
    return { success: false, error: 'No valid assets found in the provided data', errors };
  }

  if (created.length > 0 || updatedCount > 0) {
    invalidateAssetsCache();
  }

  const skippedUnchanged = existingByFilename.size - updatedCount;
  const messageParts = [`${created.length} new asset${created.length === 1 ? '' : 's'} created`];
  if (options?.updateExistingType) {
    messageParts.push(`${updatedCount} existing asset${updatedCount === 1 ? '' : 's'} had their type updated`);
  }
  if (skippedUnchanged > 0) {
    messageParts.push(`${skippedUnchanged} already existed and were left unchanged`);
  }

  return {
    success: true,
    data: created,
    count: created.length,
    updatedCount,
    errors: errors.length > 0 ? errors : undefined,
    message: messageParts.join(', '),
  };
}

// Hard reset: permanently delete every asset document in the table.
// Used by the Admin "Hard Reset Database" screen, which itself requires the
// admin password plus a typed confirmation phrase before calling this — this
// function does no confirmation of its own, it just does the deletion.
export async function deleteAllAssets(
  onProgress?: (done: number, total: number) => void
): Promise<ApiResponse<null>> {
  console.log('🧨 Hard reset requested — deleting ALL assets from Appwrite...');
  try {
    // Collect every document id first (paginated, same pattern as getAllAssets).
    const ids: string[] = [];
    let cursor: string | undefined;
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
      res.documents.forEach((doc: any) => ids.push(doc.$id));
      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
      await sleep(50);
    }

    const total = ids.length;
    let done = 0;
    const errors: string[] = [];
    onProgress?.(0, total);

    for (const id of ids) {
      try {
        await databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, id);
      } catch (error) {
        errors.push(`Failed to delete ${id}: ${errorMessage(error)}`);
      }
      done++;
      onProgress?.(done, total);
      await sleep(80); // pace requests to stay under Appwrite Cloud's rate limit
    }

    invalidateAssetsCache();

    if (errors.length > 0 && done - errors.length === 0 && total > 0) {
      return { success: false, error: `Failed to delete any assets. ${errors[0]}`, errors };
    }

    return {
      success: true,
      message: `Deleted ${done - errors.length} of ${total} assets${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('🚨 Hard reset failed:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Export assets to CSV
// Generated entirely client-side now, since there's no server-side function to build the file.
export async function exportAssetsToCSV(): Promise<{ success: boolean; error?: string; filename?: string }> {
  try {
    console.log('📤 Exporting assets to CSV...');

    const result = await getAllAssets();
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to load assets for export' };
    }

    const headers = ['nama_file', 'asset_name', 'url_lightroom', 'type', 'created_at', 'updated_at'];
    const escape = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
    const rows = result.data.map((asset) =>
      headers.map((h) => escape(String((asset as any)[h] ?? ''))).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');

    const filename = `assets-export-${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log(`✅ CSV exported successfully: ${filename}`);
    return { success: true, filename };
  } catch (error) {
    console.error('🚨 Export CSV Failed:', error);
    return { success: false, error: errorMessage(error) };
  }
}

// Health check
export async function healthCheck(): Promise<ApiResponse<any>> {
  try {
    await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, [Query.limit(1)]);
    return { success: true, message: 'Asset management API is healthy', data: { timestamp: new Date().toISOString() } };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

// Search assets (client-side filtering for now)
export function searchAssets(assets: Asset[], query: string): Asset[] {
  if (!query.trim()) return assets;
  
  const lowercaseQuery = query.toLowerCase();
  // Guard each field against undefined (e.g. rows added manually in the Appwrite
  // console without every field filled in) so search never crashes the app.
  return assets.filter(asset =>
    (asset.asset_name || "").toLowerCase().includes(lowercaseQuery) ||
    (asset.nama_file || "").toLowerCase().includes(lowercaseQuery) ||
    (asset.type || "").toLowerCase().includes(lowercaseQuery)
  );
}

// Filter assets by category (client-side filtering)
export function filterAssetsByCategory(assets: Asset[], category: string): Asset[] {
  if (category === "All Assets") {
    return assets;
  }
  
  const categoryMap: Record<string, string[]> = {
    "Spot Illus": ["Spot"],
    "Micro Illustration": ["Micro"],
    "Icons": ["Icon"],
    "Supergraphic": ["Supergraphic"],
    "Other": ["Other"]
  };
  
  const allowedTypes = categoryMap[category];
  
  if (!allowedTypes) {
    return assets;
  }
  
  return assets.filter(asset => allowedTypes.includes(asset.type));
}

// Get asset counts for sidebar
export function getAssetCounts(assets: Asset[]): Record<string, number> {
  const counts = {
    "All Assets": assets.length,
    "Spot Illus": assets.filter(a => a.type === "Spot").length,
    "Micro Illustration": assets.filter(a => a.type === "Micro").length,
    "Icons": assets.filter(a => a.type === "Icon").length,
    "Supergraphic": assets.filter(a => a.type === "Supergraphic").length,
    "Other": assets.filter(a => a.type === "Other").length
  };
  
  return counts;
}

// Generate thumbnail URL (placeholder for now)
export function generateThumbnail(asset: Asset): string {
  // For now, return the Lightroom URL, but in a real app you might generate thumbnails
  return asset.url_lightroom || `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop&crop=center`;
}

// Generate tags based on asset properties
export function generateTags(asset: Asset): string[] {
  const tags: string[] = [];
  
  // Add type-based tags
  if (asset.type === "Spot") {
    tags.push("Illustration", "Visual", "Graphic");
  } else if (asset.type === "Micro") {
    tags.push("Micro", "Small", "Icon");
  } else if (asset.type === "Icon") {
    tags.push("Icon", "UI", "Interface");
  }
  
  // Add name-based tags (simple word extraction)
  const nameWords = asset.asset_name.split(" ");
  nameWords.forEach(word => {
    if (word.length > 2) {
      tags.push(word.toLowerCase());
    }
  });
  
  return [...new Set(tags)]; // Remove duplicates
}

// Validate filename format
export function validateFilename(nama_file: string): { isValid: boolean; error?: string } {
  if (!nama_file || typeof nama_file !== 'string' || nama_file.trim() === '') {
    return { isValid: false, error: 'Filename is required' };
  }
  
  const trimmed = nama_file.trim();
  
  // Check for valid file extension
  if (!/\.(png|jpg|jpeg|svg)$/i.test(trimmed)) {
    return { isValid: false, error: 'Filename must have a valid image extension (.png, .jpg, .jpeg, .svg)' };
  }
  
  // Check for invalid characters (basic validation)
  if (/[\\/<>:"|?*]/.test(trimmed)) {
    return { isValid: false, error: 'Filename contains invalid characters' };
  }
  
  return { isValid: true };
}

// Extract asset type from filename prefix
export function extractTypeFromFilename(nama_file: string): string {
  if (nama_file.startsWith("tds_si_")) return "Spot";
  if (nama_file.startsWith("tds_mi_")) return "Micro";
  if (nama_file.startsWith("tds_ic_")) return "Icon";
  // Real exports use both bare ("sg_"/"ot_") and tds_-prefixed ("tds_sg_"/"tds_ot_")
  // forms for these two, so match either — mirrors csvParser.ts's generateTypeFromFilename.
  if (nama_file.startsWith("sg_") || nama_file.startsWith("tds_sg_")) return "Supergraphic";
  if (nama_file.startsWith("ot_") || nama_file.startsWith("tds_ot_")) return "Other";
  return "General";
}

// Generate asset name from filename
export function generateAssetNameFromFilename(nama_file: string): string {
  return nama_file
    .replace(/\.(png|jpg|jpeg|svg)$/i, '') // Remove file extension
    .replace(/^(tds_si_|tds_mi_|tds_ic_)/, '') // Remove prefixes
    .replace(/_/g, ' ') // Replace underscores with spaces
    .trim();
}

// --- Admin menu password ---
// NOTE: this is a soft gate, not real security. The app is a static client-side
// bundle (Vite/React) with no backend of its own — anyone who opens devtools can
// read the network response containing the password, or just view the app's
// source. It's meant to keep casual users from wandering into the admin menu,
// not to protect genuinely sensitive data. Don't rely on it for anything more
// than that.
const DEFAULT_ADMIN_PASSWORD = 'gili1212';
const ADMIN_PASSWORD_DOC_ID = 'admin_password'; // fixed custom $id, used as a simple key-value row

export async function getAdminPassword(): Promise<string> {
  try {
    const doc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_SETTINGS_COLLECTION_ID, ADMIN_PASSWORD_DOC_ID);
    return (doc as any).value || DEFAULT_ADMIN_PASSWORD;
  } catch {
    // Row (or even the table) doesn't exist yet — nobody has changed the
    // password before, so the default is still in effect.
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export async function setAdminPassword(newPassword: string): Promise<ApiResponse<null>> {
  try {
    try {
      await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_SETTINGS_COLLECTION_ID, ADMIN_PASSWORD_DOC_ID, {
        key: 'admin_password',
        value: newPassword,
      });
    } catch {
      // Row doesn't exist yet — create it the first time the password is changed.
      await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_SETTINGS_COLLECTION_ID, ADMIN_PASSWORD_DOC_ID, {
        key: 'admin_password',
        value: newPassword,
      });
    }
    return { success: true, message: 'Password updated' };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}