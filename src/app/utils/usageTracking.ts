/**
 * Usage counting: how many devices actually open GILI.
 *
 * ── WHAT IS RECORDED ───────────────────────────────────────────────────────────
 * One row per browser, keyed by a random ID this file generates:
 *
 *   device_id   a random string, generated locally, meaning nothing
 *   first_seen  ISO timestamp of the first visit
 *   last_seen   ISO timestamp of the most recent visit
 *   visits      session count
 *   platform    "mobile" or "desktop", from viewport width
 *
 * No IP address. No user-agent string. No name, no email, nothing that
 * identifies a person. The ID is meaningless outside this database, and clearing
 * browser data discards it.
 *
 * IP was the obvious idea and it's the wrong one: everyone behind the office NAT
 * shares one address, mobile carriers rotate them, VPNs mask them, and it counts
 * as personal data under Indonesia's PDP law. A static site can't even read its
 * own IP without asking a third party.
 *
 * ── WHAT THE NUMBER MEANS ──────────────────────────────────────────────────────
 * Devices, not people. Someone on a laptop and a phone counts twice; incognito
 * counts once per session and then vanishes; clearing site data resets to a new
 * ID. It's a reliable floor and a good trend line, not a headcount. Counting
 * actual people requires logins.
 *
 * ── FAILURE BEHAVIOUR ──────────────────────────────────────────────────────────
 * Everything here is best-effort and silent. Analytics must never break the app
 * or fill the console with errors, so a missing collection, a blocked IndexedDB
 * or an offline device all just mean "no visit recorded".
 */
import { databases, ID, Query, APPWRITE_DATABASE_ID, APPWRITE_USAGE_COLLECTION_ID } from './appwrite';
import { localSettingGet, localSettingSet } from './assetStore';

const DEVICE_ID_KEY = 'device_id';
/** One visit per browser session, so a page refresh doesn't inflate the count. */
const SESSION_FLAG = 'gili_visit_counted';

/**
 * Appwrite document IDs must be at most 36 chars, use only [a-zA-Z0-9._-], and
 * not start with a special character — so this can't just be a raw UUID with
 * hyphens at arbitrary positions. Leading letter, then base36.
 */
function generateDeviceId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const body = Array.from(bytes)
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 30);
  return `d${body}`;
}

/**
 * Storage with a fallback, because the ID is only meaningful if it PERSISTS.
 *
 * IndexedDB is the primary store (it's what the asset cache already uses), but
 * it's unavailable in some private-browsing modes and under strict privacy
 * settings. Without a fallback, a browser that can't write would mint a brand new
 * ID on every single visit and each one would create its own row — so the device
 * count would climb forever and mean nothing. localStorage is a smaller, more
 * widely permitted second chance.
 */
const DEVICE_ID_LS_KEY = 'gili_device_id';

async function readStoredId(): Promise<string | null> {
  const fromIdb = await localSettingGet<string>(DEVICE_ID_KEY);
  if (fromIdb) return fromIdb;
  try {
    return localStorage.getItem(DEVICE_ID_LS_KEY);
  } catch {
    return null;
  }
}

/** True if the ID landed in at least one store. */
async function writeStoredId(id: string): Promise<boolean> {
  const idbOk = await localSettingSet(DEVICE_ID_KEY, id);
  let lsOk = false;
  try {
    localStorage.setItem(DEVICE_ID_LS_KEY, id);
    lsOk = true;
  } catch {
    // Storage blocked or full.
  }
  return idbOk || lsOk;
}

/**
 * The stable per-browser ID, created on first call.
 *
 * Returns null when the ID cannot be persisted anywhere. Callers must then skip
 * recording: one unattributable visit is a smaller loss than permanently
 * inflating the device count.
 */
export async function getDeviceId(): Promise<string | null> {
  const existing = await readStoredId();
  if (existing) return existing;

  const fresh = generateDeviceId();
  const persisted = await writeStoredId(fresh);
  if (!persisted) return null;
  return fresh;
}

function currentPlatform(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 840 ? 'mobile' : 'desktop';
}

/**
 * Record one visit for this browser. Safe to call on every mount.
 *
 * Deliberately not awaited by callers — a slow or failing write must not delay
 * the first paint.
 */
export async function recordVisit(): Promise<void> {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(SESSION_FLAG)) return; // already counted
      sessionStorage.setItem(SESSION_FLAG, '1');
    }

    const deviceId = await getDeviceId();
    // Couldn't persist an ID, so any row we wrote would be orphaned and the next
    // visit would create another. Skip rather than pollute the count.
    if (!deviceId) return;

    const now = new Date().toISOString();
    const platform = currentPlatform();

    try {
      const existing: any = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USAGE_COLLECTION_ID,
        deviceId
      );
      await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_USAGE_COLLECTION_ID, deviceId, {
        last_seen: now,
        visits: (Number(existing.visits) || 0) + 1,
        platform,
      });
    } catch {
      // First visit from this browser, or the row was cleared.
      await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_USAGE_COLLECTION_ID, deviceId, {
        device_id: deviceId,
        first_seen: now,
        last_seen: now,
        visits: 1,
        platform,
      });
    }
  } catch {
    // No collection, offline, or storage blocked. Not worth telling anyone.
  }
}

export interface UsageStats {
  /** False when the collection doesn't exist yet, so the UI can explain. */
  available: boolean;
  totalDevices: number;
  activeLast7: number;
  activeLast30: number;
  totalVisits: number;
  mobileDevices: number;
  desktopDevices: number;
  /** Most recent visit across all devices. */
  lastSeen: string | null;
}

const EMPTY_STATS: UsageStats = {
  available: false, totalDevices: 0, activeLast7: 0, activeLast30: 0,
  totalVisits: 0, mobileDevices: 0, desktopDevices: 0, lastSeen: null,
};

function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

/** Read the usage rows and summarise them. */
export async function getUsageStats(): Promise<UsageStats> {
  try {
    const rows: any[] = [];
    let cursor: string | undefined;
    while (true) {
      const queries = [Query.limit(100)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const res = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_USAGE_COLLECTION_ID,
        queries
      );
      rows.push(...res.documents);
      if (res.documents.length < 100) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }

    const parse = (v: unknown) => {
      const t = typeof v === 'string' ? Date.parse(v) : NaN;
      return Number.isNaN(t) ? null : t;
    };
    const lastSeenTimes = rows.map((r) => parse(r.last_seen)).filter((t): t is number => t !== null);

    return {
      available: true,
      totalDevices: rows.length,
      activeLast7: lastSeenTimes.filter((t) => t >= daysAgo(7)).length,
      activeLast30: lastSeenTimes.filter((t) => t >= daysAgo(30)).length,
      totalVisits: rows.reduce((sum, r) => sum + (Number(r.visits) || 0), 0),
      mobileDevices: rows.filter((r) => r.platform === 'mobile').length,
      desktopDevices: rows.filter((r) => r.platform === 'desktop').length,
      lastSeen: lastSeenTimes.length > 0 ? new Date(Math.max(...lastSeenTimes)).toISOString() : null,
    };
  } catch {
    return EMPTY_STATS;
  }
}

export { ID };
