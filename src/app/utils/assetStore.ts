/**
 * IndexedDB-backed cache for the full asset list.
 *
 * Why not localStorage (which this replaces):
 *   - 4,486 assets serialise to ~1.84 MB of JSON. localStorage stores strings as
 *     UTF-16, so that's ~3.67 MB against a ~5 MB per-origin quota — about 73%
 *     full already, and it fails SILENTLY on overflow, which would have quietly
 *     disabled caching for everyone with no error anywhere.
 *   - localStorage is synchronous: parsing 1.84 MB of JSON blocks the main
 *     thread on every load, delaying first paint.
 * IndexedDB has orders of magnitude more room, is async, and stores structured
 * objects so there's no giant JSON.parse step.
 *
 * Everything here degrades gracefully: if IndexedDB is unavailable or errors,
 * callers fall back to fetching from Appwrite. A cache miss is slow, never broken.
 */

const DB_NAME = "gili";
const DB_VERSION = 1;
const STORE = "kv";
const ASSETS_KEY = "assets_v1";
const META_KEY = "assets_meta_v1";

/**
 * Fingerprint of the server's state at the moment the cache was written.
 * `total` catches creates and deletes; `latestUpdatedAt` catches edits. Together
 * they also catch the "one deleted, one added" case, which `total` alone misses.
 */
export interface CacheMeta {
  total: number;
  latestUpdatedAt: string;
  syncedAt: number;
  /**
   * $updatedAt of the Storage snapshot this cache came from.
   *
   * When present, freshness is decided by comparing this against the snapshot
   * file's current $updatedAt — a Storage metadata call, which costs zero
   * database reads. Absent means the cache was filled by scanning the database
   * directly (the fallback path).
   */
  snapshotVersion?: string;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      // Private-mode Firefox and some locked-down profiles hang instead of
      // erroring. Don't let that stall app startup forever.
      setTimeout(() => resolve(null), 3000);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function readCachedAssets<T>(): Promise<{ data: T[]; meta: CacheMeta } | null> {
  const [data, meta] = await Promise.all([
    idbGet<T[]>(ASSETS_KEY),
    idbGet<CacheMeta>(META_KEY),
  ]);
  if (!data || !Array.isArray(data) || !meta) return null;
  return { data, meta };
}

export async function writeCachedAssets<T>(data: T[], meta: CacheMeta): Promise<boolean> {
  const ok = await idbSet(ASSETS_KEY, data);
  if (!ok) return false;
  return idbSet(META_KEY, meta);
}

export async function clearCachedAssets(): Promise<void> {
  await Promise.all([idbDelete(ASSETS_KEY), idbDelete(META_KEY)]);
  // Also drop the old localStorage cache, so upgrading users stop carrying
  // ~3.7 MB of dead weight in a quota they're nearly out of.
  try {
    localStorage.removeItem("gili_assets_cache_v1");
  } catch {
    /* no-op */
  }
}

/**
 * Generic local key-value, same IndexedDB store.
 *
 * Used as a fallback for settings that would normally live in the Appwrite
 * "settings" collection. If that collection doesn't exist (or is unwritable),
 * the feature still works — just per-device instead of shared.
 */
export async function localSettingGet<T>(key: string): Promise<T | null> {
  return idbGet<T>(`setting:${key}`);
}

export async function localSettingSet(key: string, value: unknown): Promise<boolean> {
  return idbSet(`setting:${key}`, value);
}

export async function localSettingDelete(key: string): Promise<void> {
  return idbDelete(`setting:${key}`);
}

/** True when IndexedDB is usable — surfaced in the UI so a silent fallback isn't invisible. */
export async function isPersistentCacheAvailable(): Promise<boolean> {
  return (await openDb()) !== null;
}
