/* Data access layer for the "assets" table in Appwrite.
   See ./appwrite.ts for the client/config setup. */
import {
  databases,
  storage,
  ID,
  Query,
  APPWRITE_DATABASE_ID,
  APPWRITE_ASSETS_COLLECTION_ID,
  APPWRITE_SETTINGS_BUCKET_ID,
  ABOUT_IMAGE_FILE_ID,
  SUPERUSER_CREDENTIAL_FILE_ID,
} from './appwrite';

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

// --- Persistent asset cache (IndexedDB) + one-request freshness check ---
//
// The old design cached in localStorage with a 5-minute TTL. Two problems:
//   1. Almost every visit landed outside the 5-minute window, so opening GILI
//      meant ~45 paginated requests and a 1.84 MB download, every time.
//   2. At 4,486 assets the payload is ~3.67 MB in localStorage's UTF-16 storage
//      against a ~5 MB quota — and it fails silently on overflow.
//
// Now: the cache never expires on a timer. Instead each load asks Appwrite ONE
// cheap question — "how many documents, and when was the newest one touched?" —
// and only re-downloads when the answer differs from what the cache recorded.
// Unchanged libraries cost a single small request instead of forty-five.
import {
  readCachedAssets,
  writeCachedAssets,
  clearCachedAssets,
  isPersistentCacheAvailable,
  localSettingGet,
  localSettingSet,
  localSettingDelete,
  type CacheMeta,
} from './assetStore';

export type { CacheMeta };

/** Emitted whenever the cache state changes, so the UI can show "last synced". */
export type SyncStatus = 'cache-hit' | 'synced' | 'offline-cache' | 'no-cache';

let lastSync: { status: SyncStatus; meta: CacheMeta | null } = { status: 'no-cache', meta: null };
const syncListeners = new Set<(s: typeof lastSync) => void>();

export function getSyncState() {
  return lastSync;
}

export function onSyncStateChange(fn: (s: typeof lastSync) => void) {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

function setSyncState(status: SyncStatus, meta: CacheMeta | null) {
  lastSync = { status, meta };
  syncListeners.forEach((fn) => fn(lastSync));
}

/**
 * The whole point of this module: one request that answers "did anything change?"
 *
 * `total` comes back on every listDocuments response, so asking for a single
 * document ordered by $updatedAt descending gets us both numbers at once.
 * total    -> catches creates and deletes
 * updatedAt-> catches edits, and disambiguates "one deleted + one added"
 */
export async function fetchServerFingerprint(): Promise<{ total: number; latestUpdatedAt: string } | null> {
  try {
    const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, [
      Query.orderDesc('$updatedAt'),
      Query.limit(1),
    ]);
    return {
      total: res.total,
      latestUpdatedAt: (res.documents[0] as any)?.$updatedAt || '',
    };
  } catch (error) {
    console.warn('Freshness check failed:', errorMessage(error));
    return null;
  }
}

// Call after any write so stale cached data never lingers.
export function invalidateAssetsCache() {
  void clearCachedAssets();
  setSyncState('no-cache', null);
}

export { isPersistentCacheAvailable };

async function fetchAllFromAppwrite(onProgress?: (fetched: number) => void): Promise<Asset[]> {
  const assets: Asset[] = [];
  let cursor: string | undefined;
  while (true) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
    res.documents.forEach((doc: any) => assets.push(toAsset(doc)));
    onProgress?.(assets.length);
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return assets;
}

/**
 * Get all assets, cache-first.
 *
 * Flow:
 *   1. Read the cache (fast, local, async — doesn't block paint).
 *   2. Ask the server for its fingerprint (ONE request).
 *   3. Fingerprints match -> return the cache, download nothing.
 *      They differ, or there's no cache -> full fetch, then re-cache.
 *   4. Server unreachable but cache present -> serve the cache rather than
 *      failing. Being slightly stale beats showing an empty library.
 *
 * `forceRefresh` (the manual Refresh button) skips straight to the full fetch.
 */
export async function getAllAssets(options?: {
  forceRefresh?: boolean;
  onProgress?: (fetched: number) => void;
}): Promise<ApiResponse<Asset[]>> {
  const cached = options?.forceRefresh ? null : await readCachedAssets<Asset>();

  if (cached) {
    const fingerprint = await fetchServerFingerprint();

    if (!fingerprint) {
      // Offline or Appwrite unreachable — the cache is the best answer we have.
      console.log(`📦 Offline: serving ${cached.data.length} cached assets.`);
      setSyncState('offline-cache', cached.meta);
      return { success: true, data: cached.data, count: cached.data.length, source: 'cache-offline' };
    }

    const unchanged =
      fingerprint.total === cached.meta.total &&
      fingerprint.latestUpdatedAt === cached.meta.latestUpdatedAt;

    if (unchanged) {
      console.log(`📦 Nothing changed — serving ${cached.data.length} cached assets (1 request).`);
      setSyncState('cache-hit', cached.meta);
      return { success: true, data: cached.data, count: cached.data.length, source: 'cache' };
    }

    console.log(
      `🔄 Server changed (${cached.meta.total} -> ${fingerprint.total} assets). Re-syncing…`
    );
  }

  try {
    const assets = await fetchAllFromAppwrite(options?.onProgress);

    // Re-read the fingerprint AFTER the download rather than reusing the one
    // from before it. If a write landed mid-sync, storing the older fingerprint
    // would mark the cache fresh while it's actually missing that row.
    const after = await fetchServerFingerprint();
    const meta: CacheMeta = {
      total: after?.total ?? assets.length,
      latestUpdatedAt: after?.latestUpdatedAt ?? '',
      syncedAt: Date.now(),
    };

    await writeCachedAssets(assets, meta);
    setSyncState('synced', meta);
    return { success: true, data: assets, count: assets.length, source: 'appwrite' };
  } catch (error) {
    console.error('🚨 Failed to fetch assets:', error);
    // Last resort: if the network fetch blew up but we have a cache, use it.
    if (cached) {
      setSyncState('offline-cache', cached.meta);
      return { success: true, data: cached.data, count: cached.data.length, source: 'cache-fallback' };
    }
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

// --- Superuser password ---
//
// One superuser, one password, no accounts.
//
// The password itself is never stored. What's stored — in Appwrite Storage, as a
// tiny JSON file — is a salted PBKDF2-SHA256 credential. Changing the password
// rewrites that file, which is why a change applies immediately on every device
// with no rebuild.
//
// Resolution order:
//   1. Appwrite Storage        the real answer, shared by everyone
//   2. IndexedDB mirror        so an offline reload still unlocks
//   3. Compiled-in default     first-run fallback before any password is set
//
// This remains a soft gate. Hashing means nobody can read the password out of the
// app or Appwrite; it does not stop someone with devtools from setting the
// sessionStorage unlock flag by hand. See utils/authHash.ts.
import { DEFAULT_SUPERUSER_CREDENTIAL } from '../authConfig';
import { createCredential, verifyCredential } from './authHash';

const CREDENTIAL_LOCAL_KEY = 'superuser_credential';

/** Memoised per page load. Unlocking shouldn't re-fetch on every keystroke. */
let cachedCredential: string | null = null;

export type CredentialSource = 'appwrite' | 'local' | 'default';
let credentialSource: CredentialSource = 'default';

/** Where the credential currently in use came from. For the Settings screen. */
export function getCredentialSource(): CredentialSource {
  return credentialSource;
}

async function fetchStoredCredential(): Promise<string | null> {
  try {
    // no-store, because the URL is stable across updates and a cached copy would
    // keep accepting the previous password after a change.
    const url = storage.getFileView(APPWRITE_SETTINGS_BUCKET_ID, SUPERUSER_CREDENTIAL_FILE_ID).toString();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null; // 404 = nobody has set a password yet
    const body = await res.json();
    const encoded = typeof body?.credential === 'string' ? body.credential : null;
    if (!encoded) return null;
    // Mirror locally so an offline reload can still unlock.
    await localSettingSet(CREDENTIAL_LOCAL_KEY, encoded);
    return encoded;
  } catch {
    return null;
  }
}

async function resolveCredential(): Promise<string> {
  if (cachedCredential) return cachedCredential;

  const remote = await fetchStoredCredential();
  if (remote) {
    credentialSource = 'appwrite';
    cachedCredential = remote;
    return remote;
  }

  const local = await localSettingGet<string>(CREDENTIAL_LOCAL_KEY);
  if (local) {
    credentialSource = 'local';
    cachedCredential = local;
    return local;
  }

  credentialSource = 'default';
  cachedCredential = DEFAULT_SUPERUSER_CREDENTIAL;
  return DEFAULT_SUPERUSER_CREDENTIAL;
}

/** True when the typed password matches the credential in force. */
export async function verifyAdminPassword(input: string): Promise<boolean> {
  if (!input) return false; // an empty field must never unlock anything
  return verifyCredential(input, await resolveCredential());
}

/** Drop the memoised credential so the next check re-reads from Appwrite. */
export function invalidateCredentialCache() {
  cachedCredential = null;
}

/**
 * Change the password.
 *
 * Requires the current password — being unlocked isn't enough. Otherwise anyone
 * who wandered in behind an already-unlocked session could lock the owner out.
 *
 * Writes to Appwrite so the change is global. A local-only fallback is
 * deliberately NOT offered here: a password that changed on one laptop while
 * every other device kept accepting the old one is worse than a clear failure.
 */
export async function changeSuperuserPassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  const current = await resolveCredential();
  if (!(await verifyCredential(currentPassword, current))) {
    return { success: false, error: 'That is not the current password.' };
  }
  if (await verifyCredential(newPassword, current)) {
    return { success: false, error: 'The new password is the same as the current one.' };
  }

  let encoded: string;
  try {
    encoded = await createCredential(newPassword);
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }

  const payload = JSON.stringify({ v: 1, credential: encoded, updatedAt: new Date().toISOString() });
  const file = new File([payload], 'superuser_auth.json', { type: 'application/json' });

  try {
    try {
      await storage.deleteFile(APPWRITE_SETTINGS_BUCKET_ID, SUPERUSER_CREDENTIAL_FILE_ID);
    } catch (error) {
      if (!isMissingResource(error)) throw error;
    }
    await storage.createFile(APPWRITE_SETTINGS_BUCKET_ID, SUPERUSER_CREDENTIAL_FILE_ID, file);
  } catch (error) {
    return {
      success: false,
      error: isMissingResource(error)
        ? `Couldn't reach the Appwrite Storage bucket "${APPWRITE_SETTINGS_BUCKET_ID}". The password was NOT changed.`
        : `Appwrite rejected the change, so the password was NOT changed: ${errorMessage(error)}`,
    };
  }

  await localSettingSet(CREDENTIAL_LOCAL_KEY, encoded);
  cachedCredential = encoded;
  credentialSource = 'appwrite';
  return { success: true, message: 'Password changed. It applies on every device from now on.' };
}

// --- About-dialog image ---
//
// Stored as a FILE in an Appwrite Storage bucket, not as a database value.
//
// History worth keeping, because it caused a real bug: this used to write a
// base64 data URL into a document in the "settings" collection. When that
// collection's columns didn't match what the code wrote, every save was rejected
// and quietly fell back to IndexedDB — which is per-browser. The result was an
// image that looked saved but showed the placeholder in incognito and on every
// other device, with the UI still claiming saves were shared.
//
// A bucket avoids the whole class of problem: no attribute size ceiling, no
// schema to match, the file is served from Appwrite's CDN, and it's ~35% smaller
// than the base64 form. IndexedDB is still written, but only as a same-device
// render cache, never as the source of truth.
const ABOUT_IMAGE_LOCAL_KEY = 'about_image';

/** Where the saved image actually ended up, so the UI can tell the truth. */
export type SettingScope = 'appwrite' | 'local';

function isMissingResource(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = (error as any)?.code;
  return code === 404 || msg.includes('could not be found') || msg.includes('not found');
}

/**
 * Public URL for the stored file, cache-busted by the file's own updatedAt.
 *
 * Without the version parameter the browser and the CDN would keep serving the
 * previous image after a re-upload, since the URL is otherwise identical.
 */
function aboutImageUrl(updatedAt?: string): string {
  const base = storage.getFileView(APPWRITE_SETTINGS_BUCKET_ID, ABOUT_IMAGE_FILE_ID).toString();
  if (!updatedAt) return base;
  return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(updatedAt)}`;
}

/**
 * Returns a URL when the shared image exists, otherwise the local data URL,
 * otherwise null so the caller shows the placeholder.
 */
export async function getAboutImage(): Promise<string | null> {
  try {
    const file = await storage.getFile(APPWRITE_SETTINGS_BUCKET_ID, ABOUT_IMAGE_FILE_ID);
    return aboutImageUrl((file as any).$updatedAt);
  } catch {
    // No bucket, or no file in it yet — fall through to whatever this device has.
  }
  return localSettingGet<string>(ABOUT_IMAGE_LOCAL_KEY);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(header)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function setAboutImage(dataUrl: string): Promise<ApiResponse<null> & { scope?: SettingScope }> {
  // Always keep a local copy for instant rendering, whatever happens next.
  await localSettingSet(ABOUT_IMAGE_LOCAL_KEY, dataUrl);

  try {
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], 'about_image.jpg', { type: blob.type });

    // Appwrite file IDs are immutable, so "replace" means delete-then-create.
    // A missing file on delete is the normal first-run case, not an error.
    try {
      await storage.deleteFile(APPWRITE_SETTINGS_BUCKET_ID, ABOUT_IMAGE_FILE_ID);
    } catch (error) {
      if (!isMissingResource(error)) throw error;
    }

    await storage.createFile(APPWRITE_SETTINGS_BUCKET_ID, ABOUT_IMAGE_FILE_ID, file);
    return {
      success: true,
      scope: 'appwrite',
      message: 'Saved to Appwrite Storage — everyone sees this image, on every device.',
    };
  } catch (error) {
    return {
      success: true,
      scope: 'local',
      message: isMissingResource(error)
        ? `Saved on this device only — the Appwrite Storage bucket "${APPWRITE_SETTINGS_BUCKET_ID}" doesn't exist yet, so it can't be shared.`
        : `Saved on this device only — Appwrite Storage rejected the upload: ${errorMessage(error)}`,
    };
  }
}

export async function clearAboutImage(): Promise<ApiResponse<null>> {
  let sharedRemoved = false;
  try {
    await storage.deleteFile(APPWRITE_SETTINGS_BUCKET_ID, ABOUT_IMAGE_FILE_ID);
    sharedRemoved = true;
  } catch {
    // Nothing shared to remove, or no bucket. Either way the local reset below
    // is what the person in front of the screen actually asked for.
  }
  await localSettingDelete(ABOUT_IMAGE_LOCAL_KEY);
  return {
    success: true,
    message: sharedRemoved
      ? 'Reverted to the placeholder everywhere.'
      : 'Reverted to the placeholder on this device.',
  };
}

/**
 * Can we actually write a shared image?
 *
 * The previous version of this check called listDocuments and returned true if
 * the collection merely existed — which is why the UI cheerfully reported
 * "shared across devices" while every single write was being rejected. Listing
 * files exercises the same bucket and the same read permission the app depends
 * on, so a true here means considerably more than it used to.
 */
export async function checkSharedImageStorage(): Promise<boolean> {
  try {
    await storage.listFiles(APPWRITE_SETTINGS_BUCKET_ID, [Query.limit(1)]);
    return true;
  } catch {
    return false;
  }
}

// setAdminPassword() used to write the new password into Appwrite. It's gone on
// purpose: the digest is compiled into the bundle, so nothing written at runtime
// could change it. Keeping a function that reported "Password updated" while the
// old password still worked would be worse than not having one. The Settings
// screen now generates a digest for you to paste in and rebuild instead.