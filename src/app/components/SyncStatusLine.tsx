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

  useEffect(() => onSyncStateChange(setState), []);
  useEffect(() => {
    isPersistentCacheAvailable().then(setIdbOk);
  }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (state.status === "no-cache" && idbOk) return null;

  const { label, tone, title } = !idbOk
    ? {
        label: "No local cache",
        tone: "text-[var(--pp-text-alert)]",
        title:
          "This browser blocks IndexedDB, so assets are re-downloaded every visit. Private/incognito mode is the usual cause.",
      }
    : state.status === "offline-cache"
    ? {
        label: "Offline · showing cached",
        tone: "text-[var(--pp-text-alert)]",
        title: "Couldn't reach Appwrite. Showing the last synced copy.",
      }
    : state.status === "synced"
    ? {
        label: state.meta ? `Synced ${relativeTime(state.meta.syncedAt)}` : "Synced",
        tone: "text-muted-foreground/70",
        title: "Downloaded fresh from Appwrite just now.",
      }
    : {
        label: state.meta ? `Synced ${relativeTime(state.meta.syncedAt)}` : "Cached",
        tone: "text-muted-foreground/70",
        title: `Nothing changed on the server, so the local copy was reused (1 request instead of a full download).${
          state.meta ? ` ${state.meta.total} assets.` : ""
        }`,
      };

  return (
    <div
      title={title}
      className={`${tone} truncate ${open ? "px-2 text-[11px]" : "text-center text-[10px]"}`}
    >
      {open ? label : "•"}
    </div>
  );
}
