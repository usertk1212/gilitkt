/* NOTE: filename kept as `supabaseApi.ts` on purpose so every component that already
   imports from here keeps working unchanged. The backend underneath is now Appwrite,
   not Supabase — see ./appwrite.ts for the client config. Feel free to rename this file
   later (e.g. to backendApi.ts) and update the ~17 import statements across components
   if you want the naming to match; it's a pure find-and-replace, not required for it to work. */
import { databases, ID, Query, APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID } from './appwrite';

export interface Asset {
  nama_file: string; // Logical primary key - filename (stored as an attribute; Appwrite keeps its own document $id internally)
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
  source?: string;
  errors?: string[];
}

// Appwrite stores its own document id ($id) alongside our fields. This strips
// the Appwrite-internal fields so components keep receiving the plain Asset shape
// they already expect.
function toAsset(doc: any): Asset {
  return {
    nama_file: doc.nama_file,
    asset_name: doc.asset_name,
    url_lightroom: doc.url_lightroom,
    type: doc.type,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
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

// Get all assets
export async function getAllAssets(): Promise<ApiResponse<Asset[]>> {
  console.log('📋 Fetching all assets...');
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

    const now = new Date().toISOString();
    const doc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, ID.unique(), {
      nama_file: asset.nama_file,
      asset_name: asset.asset_name,
      url_lightroom: asset.url_lightroom,
      type: asset.type,
      created_at: now,
      updated_at: now,
    });

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

    const doc = await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, existing.$id, {
      asset_name: asset.asset_name,
      url_lightroom: asset.url_lightroom,
      type: asset.type,
      updated_at: new Date().toISOString(),
    });

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
export async function bulkCreateAssets(
  assets: Omit<Asset, 'created_at' | 'updated_at'>[],
  onProgress?: (done: number, total: number) => void
): Promise<ApiResponse<Asset[]>> {
  console.log(`📦 Bulk creating ${assets.length} assets with filename keys...`);
  const created: Asset[] = [];
  const errors: string[] = [];
  const seenFilenames = new Set<string>();
  const total = assets.length;

  // Fetch every existing nama_file once, paginating like getAllAssets() does.
  const existingFilenames = new Set<string>();
  try {
    let cursor: string | undefined;
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const res = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, queries);
      res.documents.forEach((doc: any) => existingFilenames.add(doc.nama_file));
      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
      await sleep(50);
    }
  } catch (error) {
    return { success: false, error: `Failed to check existing assets before import: ${errorMessage(error)}` };
  }
  console.log(`📋 Found ${existingFilenames.size} assets already in the database — these will be skipped.`);

  const DELAY_MS = 80; // pace requests to stay under Appwrite Cloud's rate limit
  let processed = 0;
  onProgress?.(0, total);

  for (const asset of assets) {
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

    if (existingFilenames.has(filename)) {
      // Already imported in a previous run — skip, no API call needed.
      processed++;
      onProgress?.(processed, total);
      continue;
    }

    try {
      const now = new Date().toISOString();
      const doc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_ASSETS_COLLECTION_ID, ID.unique(), {
        nama_file: filename,
        asset_name: asset.asset_name,
        url_lightroom: asset.url_lightroom,
        type: asset.type,
        created_at: now,
        updated_at: now,
      });
      created.push(toAsset(doc));
    } catch (error) {
      errors.push(`Failed to create: ${filename} — ${errorMessage(error)}`);
    }

    processed++;
    onProgress?.(processed, total);

    await sleep(DELAY_MS);
  }

  if (created.length === 0 && existingFilenames.size === 0) {
    return { success: false, error: 'No valid assets found in the provided data', errors };
  }

  return {
    success: true,
    data: created,
    count: created.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Successfully created ${created.length} new assets (${existingFilenames.size} already existed and were skipped)`,
  };
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
  return assets.filter(asset => 
    asset.asset_name.toLowerCase().includes(lowercaseQuery) ||
    asset.nama_file.toLowerCase().includes(lowercaseQuery) ||
    asset.type.toLowerCase().includes(lowercaseQuery)
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
    "Icons": ["Icon"]
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
    "Icons": assets.filter(a => a.type === "Icon").length
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