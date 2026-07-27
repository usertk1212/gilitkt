/**
 * The library, published as one file.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────
 * Appwrite bills database reads PER ROW, not per request: fetching 4,486 rows in
 * 45 paginated calls costs 4,486 reads, not 45. The free tier allows 500,000 per
 * month, so one full scan of this library costs ~0.9% of the monthly budget.
 *
 * That was survivable for a single user with a warm cache (a freshness check is
 * 1 read). It falls apart the moment there are several viewers, because every
 * import changes the data and therefore invalidates every cached copy — so N
 * users each re-download all 4,486 rows. Ten users and a weekly import is
 * ~190,000 reads a month spent re-sending data that didn't change for them.
 *
 * So viewers stop reading the database at all. After a write, the superuser
 * publishes the whole library as a single JSON file into the Storage bucket, and
 * everyone reads that instead. Storage transfer is billed as bandwidth (10 GB/mo
 * free), not as database reads — a snapshot is ~1.8 MB raw, and far less over the
 * wire once the CDN compresses it. Viewer cost in database reads: zero.
 *
 * The database is still the source of truth. The snapshot is a published copy of
 * it, regenerated on write, exactly like a static build artefact.
 *
 * ── FRESHNESS ──────────────────────────────────────────────────────────────────
 * A client compares the cached snapshotVersion against the snapshot file's
 * current $updatedAt. That's a Storage metadata call — again, zero database
 * reads. Unchanged means the local copy is served with no download at all.
 */
import {
  storage,
  APPWRITE_SETTINGS_BUCKET_ID,
  LIBRARY_SNAPSHOT_FILE_ID,
} from './appwrite';

/** Bumped only if the payload shape changes incompatibly. */
const SNAPSHOT_FORMAT = 1;

export interface LibrarySnapshot<T> {
  v: number;
  publishedAt: string;
  total: number;
  assets: T[];
}

export interface SnapshotInfo {
  /** $updatedAt of the snapshot file — the freshness token. */
  version: string;
  sizeBytes: number;
}

function isMissing(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (error as any)?.code === 404 || msg.includes('not found') || msg.includes('could not be found');
}

/**
 * Snapshot metadata, or null when no snapshot has been published.
 *
 * Costs zero database reads. Cheap enough to call on every page load.
 */
export async function getSnapshotInfo(): Promise<SnapshotInfo | null> {
  try {
    const file: any = await storage.getFile(APPWRITE_SETTINGS_BUCKET_ID, LIBRARY_SNAPSHOT_FILE_ID);
    return { version: String(file.$updatedAt || file.$createdAt || ''), sizeBytes: Number(file.sizeOriginal) || 0 };
  } catch {
    return null;
  }
}

/** Download and parse the published library. Zero database reads. */
export async function downloadSnapshot<T>(): Promise<LibrarySnapshot<T> | null> {
  try {
    const url = storage.getFileView(APPWRITE_SETTINGS_BUCKET_ID, LIBRARY_SNAPSHOT_FILE_ID).toString();
    // no-store: the URL is stable across republishes, so a cached response would
    // keep serving the previous library forever.
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !Array.isArray(body.assets)) return null;
    return body as LibrarySnapshot<T>;
  } catch {
    return null;
  }
}

/**
 * Publish `assets` as the new snapshot.
 *
 * Called after imports and edits. Costs no database reads itself — the caller
 * already has the rows in hand, which is the point: one scan by the superuser
 * replaces one scan per viewer.
 */
export async function publishSnapshot<T>(assets: T[]): Promise<{ success: boolean; error?: string; sizeBytes?: number }> {
  try {
    const payload: LibrarySnapshot<T> = {
      v: SNAPSHOT_FORMAT,
      publishedAt: new Date().toISOString(),
      total: assets.length,
      assets,
    };
    const json = JSON.stringify(payload);
    const file = new File([json], 'library.json', { type: 'application/json' });

    // Appwrite file IDs are immutable, so replacing means delete-then-create.
    try {
      await storage.deleteFile(APPWRITE_SETTINGS_BUCKET_ID, LIBRARY_SNAPSHOT_FILE_ID);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    await storage.createFile(APPWRITE_SETTINGS_BUCKET_ID, LIBRARY_SNAPSHOT_FILE_ID, file);
    return { success: true, sizeBytes: json.length };
  } catch (error) {
    return {
      success: false,
      error: isMissing(error)
        ? `Storage bucket "${APPWRITE_SETTINGS_BUCKET_ID}" is unreachable, so the snapshot wasn't published.`
        : error instanceof Error
          ? error.message
          : 'Could not publish the snapshot.',
    };
  }
}

/** Remove the published snapshot, sending clients back to reading the database. */
export async function deleteSnapshot(): Promise<void> {
  try {
    await storage.deleteFile(APPWRITE_SETTINGS_BUCKET_ID, LIBRARY_SNAPSHOT_FILE_ID);
  } catch {
    // Nothing published, or no bucket. Either way there's nothing to undo.
  }
}
