import { useEffect, useState } from "react";
import { getSyncState, onSyncStateChange, isPersistentCacheAvailable } from "../utils/appwriteApi";

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * "Last synced" line for the sidebar footer.
 *
 * The cache is now long-lived rather than time-boxed, so without this the user
 * has no way to tell whether they're looking at fresh data or a local copy.
 * A silent cache is a cache you can't trust.
 */
export function SyncStatusLine({ open }: { open: boolean }) {
  const [state, setState] = useState(getSyncState);
  const [idbOk, setIdbOk] = useState(true);
  // Re-render on a timer so "2m ago" doesn't sit frozen at "just now".
  const [, tick] = useState(0);

  // Wrapped rather than returned directly: onSyncStateChange's return value is
  // not a cleanup function, and React treats a non-function return from an
  // effect as a mistake.
  useEffect(() => {
    onSyncStateChange(setState);
  }, []);
  useEffect(() => {
    isPersistentCacheAvailable().then(setIdbOk);
  }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (state.status === "no-cache" && idbOk) return null;

  const { label, tone, title, state: connState } = !idbOk
    ? {
        label: "No local cache",
        tone: "text-[var(--pp-text-alert)]",
        state: "alert" as const,
        title:
          "This browser blocks IndexedDB, so assets are re-downloaded every visit. Private/incognito mode is the usual cause.",
      }
    : state.status === "offline-cache"
    ? {
        // Not an error: unreachable Appwrite is exactly the case the cache exists
        // for, and the app is working. The alert tone is reserved for `no-cache`
        // above, which is a real problem — assets get re-downloaded every visit.
        // The timestamp is the part that matters here, since it tells you how
        // stale what you're looking at might be.
        label: state.meta
          ? `Showing cached copy · synced ${relativeTime(state.meta.syncedAt)}`
          : "Showing cached copy",
        tone: "text-muted-foreground",
        state: "local" as const,
        title: "Couldn't reach Appwrite, so the last synced copy is being shown.",
      }
    : state.status === "synced"
    ? {
        label: state.meta ? `Synced ${relativeTime(state.meta.syncedAt)}` : "Synced",
        tone: "text-muted-foreground",
        state: "active" as const,
        title: "Downloaded fresh from Appwrite just now.",
      }
    : {
        label: state.meta ? `Synced ${relativeTime(state.meta.syncedAt)}` : "Cached",
        tone: "text-muted-foreground",
        state: "active" as const,
        title: `Nothing changed on the server, so the local copy was reused (1 request instead of a full download).${
          state.meta ? ` ${state.meta.total} assets.` : ""
        }`,
      };

  const dot = {
    active: { color: "bg-[var(--pp-g500)]", text: "text-[var(--pp-text-positive)]", word: "Active" },
    local: { color: "bg-yellow-500", text: "text-yellow-600", word: "Local" },
    alert: { color: "bg-destructive", text: "text-destructive", word: "Offline" },
  }[connState];

  // Collapsed, there is only room for the dot — the label and timestamp are the
  // first things to go.
  if (!open) {
    return (
      <div title={`${dot.word} — ${label}`} className="flex justify-center py-1">
        <span className={`size-2 rounded-full ${dot.color}`} />
      </div>
    );
  }

  return (
    <div title={title} className="flex items-center gap-1 px-2 text-sm">
      <span className="flex shrink-0 items-center gap-1">
        <span className={`size-2 rounded-full ${dot.color}`} />
        <span className={`font-bold ${dot.text}`}>{dot.word}</span>
      </span>
      <span className="shrink-0 text-xs text-[var(--pp-text-disabled)]">•</span>
      <span className={`truncate ${tone}`}>{label}</span>
    </div>
  );
}
