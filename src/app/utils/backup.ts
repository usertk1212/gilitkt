/**
 * Whole-library backup and restore, as a single JSON file.
 *
 * ── WHY NOT JUST EXPORT CSV ────────────────────────────────────────────────────
 * Export CSV covers the assets table, which is the important part. It does not
 * cover projects — and projects were only ever stored in this browser's
 * localStorage under "gili-projects". They are in no database, on no server, and
 * in no export: clearing site data destroys them silently, and they never existed
 * on anyone else's machine. That's the gap this closes.
 *
 * ── WHAT A BACKUP CONTAINS ─────────────────────────────────────────────────────
 *   assets    every row (the same fields Export CSV writes)
 *   projects  the browser-local collections, with their asset lists
 *   favorites see the note below
 *
 * The `projects` field and the `gili-projects` storage key keep their old names
 * even though 2.0 calls these Islands in the UI. Both are on-disk formats: a
 * rename would make every backup written before 2.0 restore zero collections,
 * and would orphan the ones already in people's browsers. The wording users see
 * is the only thing that changed.
 *
 * On favorites: as of this version they aren't persisted anywhere at all — they
 * live in AssetGrid's useState and are gone on reload, so there is nothing to back
 * up and the array will be empty. The field is read and written defensively so
 * that when favorites are given real storage, existing backups still load.
 *
 * Deliberately NOT included: the Superuser credential (a password hash is not
 * something to scatter through downloads folders) and the About image (a binary
 * living in Storage — download it from the Appwrite console if you need it).
 *
 * ── READ COST ──────────────────────────────────────────────────────────────────
 * Backing up reads the published snapshot, so it costs zero database reads and
 * works even while the account is throttled — which is exactly when you'll want
 * a backup most.
 */
import { getAllAssets, type Asset } from './appwriteApi';

const PROJECTS_KEY = 'gili-projects';
const FAVORITES_KEY = 'gili-favorites';
export const BACKUP_FORMAT = 1;

export interface GiliBackup {
  format: number;
  appVersion: string;
  createdAt: string;
  counts: { assets: number; projects: number; favorites: number };
  assets: Asset[];
  projects: unknown[];
  favorites: string[];
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function buildBackup(appVersion: string): Promise<{ success: boolean; backup?: GiliBackup; error?: string }> {
  const res = await getAllAssets();
  if (!res.success || !res.data) {
    return { success: false, error: res.error || 'Could not read the asset library.' };
  }

  const projects = readLocalJson<unknown[]>(PROJECTS_KEY, []);
  const favorites = readLocalJson<string[]>(FAVORITES_KEY, []);

  return {
    success: true,
    backup: {
      format: BACKUP_FORMAT,
      appVersion,
      createdAt: new Date().toISOString(),
      counts: { assets: res.data.length, projects: projects.length, favorites: favorites.length },
      assets: res.data,
      projects,
      favorites,
    },
  };
}

/** Trigger a download of the backup as a dated .json file. */
export function downloadBackup(backup: GiliBackup): string {
  const filename = `gili-backup-${backup.createdAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return filename;
}

export interface ParsedBackup {
  backup: GiliBackup;
  warnings: string[];
}

/** Validate a backup file before anything is written anywhere. */
export function parseBackup(text: string): { success: boolean; data?: ParsedBackup; error?: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, error: "That file isn't valid JSON." };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { success: false, error: 'That file does not look like a GILI backup.' };
  }
  if (!Array.isArray(parsed.assets)) {
    return { success: false, error: 'No asset list found — is this a GILI backup?' };
  }

  const warnings: string[] = [];
  if (parsed.format !== BACKUP_FORMAT) {
    warnings.push(
      `Backup format is ${parsed.format ?? 'unknown'}, this build expects ${BACKUP_FORMAT}. Restoring may miss newer fields.`
    );
  }
  if (!Array.isArray(parsed.projects)) warnings.push('No projects in this backup.');
  if (!Array.isArray(parsed.favorites)) warnings.push('No favorites in this backup.');

  const missingFields = parsed.assets.filter(
    (a: any) => !a || typeof a.nama_file !== 'string' || typeof a.url_lightroom !== 'string'
  ).length;
  if (missingFields > 0) {
    warnings.push(`${missingFields} asset rows are missing a filename or link and will be skipped.`);
  }

  return {
    success: true,
    data: {
      backup: {
        format: parsed.format ?? 0,
        appVersion: parsed.appVersion ?? 'unknown',
        createdAt: parsed.createdAt ?? '',
        counts: parsed.counts ?? {
          assets: parsed.assets.length,
          projects: Array.isArray(parsed.projects) ? parsed.projects.length : 0,
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites.length : 0,
        },
        assets: parsed.assets,
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      },
      warnings,
    },
  };
}

/**
 * Restore the browser-local half of a backup: projects and favorites.
 *
 * Assets are deliberately NOT restored here. Writing 4,486 documents is a real
 * import with real write costs and a progress bar, so it goes through the normal
 * Upload CSV path where it can be paused, reviewed and resumed. This function
 * handles only the part that has nowhere else to come from.
 */
export function restoreLocalData(backup: GiliBackup): { success: boolean; projects: number; favorites: number; error?: string } {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(backup.projects ?? []));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(backup.favorites ?? []));
    return { success: true, projects: backup.projects?.length ?? 0, favorites: backup.favorites?.length ?? 0 };
  } catch (error) {
    return {
      success: false,
      projects: 0,
      favorites: 0,
      error: error instanceof Error ? error.message : 'Could not write to local storage.',
    };
  }
}

/** Assets from a backup, as CSV, so they can be re-imported through Upload CSV. */
export function backupAssetsToCsv(backup: GiliBackup): string {
  const headers = ['nama_file', 'asset_name', 'url_lightroom', 'type'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = backup.assets
    .filter((a: any) => a?.nama_file && a?.url_lightroom)
    .map((a: any) => headers.map((h) => escape(a[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function downloadBackupAssetsCsv(backup: GiliBackup): string {
  const filename = `gili-restore-assets-${(backup.createdAt || new Date().toISOString()).slice(0, 10)}.csv`;
  const blob = new Blob([backupAssetsToCsv(backup)], { type: 'text/csv; charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return filename;
}
