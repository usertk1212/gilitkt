import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { bulkCreateAssets, type Asset } from "../utils/appwriteApi";
import { toast } from "sonner";

export type JobStatus = "idle" | "running" | "paused" | "done" | "error" | "cancelled";

export interface UploadJob {
  status: JobStatus;
  /** Where the rows came from, shown in the floating widget. */
  label: string;
  done: number;
  total: number;
  created: number;
  /** Existing rows whose `type` was updated. */
  updated: number;
  /** Existing rows whose Lightroom link was replaced (asset re-uploaded). */
  replaced: number;
  errors: string[];
  message: string;
}

interface UploadJobContextValue extends UploadJob {
  progress: number;
  isActive: boolean;
  start: (
    assets: Omit<Asset, "created_at" | "updated_at">[],
    opts: { label: string; updateExistingType?: boolean; updateExistingLink?: boolean }
  ) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  reset: () => void;
}

const EMPTY: UploadJob = {
  status: "idle",
  label: "",
  done: 0,
  total: 0,
  created: 0,
  updated: 0,
  replaced: 0,
  errors: [],
  message: "",
};

const UploadJobContext = createContext<UploadJobContextValue | null>(null);

/**
 * Holds the running CSV import.
 *
 * This provider is mounted ABOVE the dashboard/superuser view switch, so
 * navigating between them does not unmount it — which is the whole point.
 * Previously the import lived in CsvViewer's own state, so hitting "back to
 * dashboard" mid-import unmounted the component and you lost all progress
 * feedback and had to start over from row 0.
 *
 * Pause/resume is cooperative: the worker loop in bulkCreateAssets checks these
 * refs once per row, so pausing stops at a clean row boundary and never leaves
 * a half-written document.
 */
export function UploadJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<UploadJob>(EMPTY);

  // Refs, not state: the worker loop closes over these once and must see the
  // live value on every check. State would be captured stale.
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const runningRef = useRef(false);

  const start = useCallback(
    async (
      assets: Omit<Asset, "created_at" | "updated_at">[],
      opts: { label: string; updateExistingType?: boolean; updateExistingLink?: boolean }
    ) => {
      if (runningRef.current) {
        toast.error("An import is already running", {
          description: "Wait for it to finish, or cancel it first.",
        });
        return;
      }

      runningRef.current = true;
      pausedRef.current = false;
      cancelledRef.current = false;

      setJob({
        ...EMPTY,
        status: "running",
        label: opts.label,
        total: assets.length,
      });

      try {
        const res = await bulkCreateAssets(
          assets,
          (done, total) => setJob((j) => ({ ...j, done, total })),
          {
            updateExistingType: opts.updateExistingType,
            updateExistingLink: opts.updateExistingLink,
            control: {
              isPaused: () => pausedRef.current,
              isCancelled: () => cancelledRef.current,
            },
            onPausedChange: (paused) =>
              setJob((j) =>
                // Don't clobber a terminal status if a pause flag lands late.
                j.status === "running" || j.status === "paused"
                  ? { ...j, status: paused ? "paused" : "running" }
                  : j
              ),
          }
        );

        const created = res.data?.length || 0;
        const updated = res.updatedCount || 0;
        const replaced = res.replacedCount || 0;

        if (cancelledRef.current) {
          setJob((j) => ({
            ...j,
            status: "cancelled",
            created,
            updated,
            replaced,
            errors: res.errors || [],
            message:
              `Stopped after ${j.done} of ${j.total} rows. ${created} created, ${updated} type-updated` +
              (replaced > 0 ? `, ${replaced} link-replaced` : "") +
              ` — those are saved.`,
          }));
          toast.info("Import stopped", {
            description: `${created} assets were still saved.`,
          });
        } else if (!res.success) {
          setJob((j) => ({
            ...j,
            status: "error",
            errors: res.errors || [],
            message: res.error || "Import failed",
          }));
        } else {
          setJob((j) => ({
            ...j,
            status: "done",
            created,
            updated,
            replaced,
            errors: res.errors || [],
            // Prefer the summary bulkCreateAssets built — it has the exact
            // counts, including replacements, and doesn't have to guess from the
            // options which categories are non-zero.
            message: res.message || `${created} new assets created.`,
          }));
          toast.success("Import finished", {
            description:
              replaced > 0
                ? `${created} created, ${replaced} re-uploaded asset${replaced === 1 ? "" : "s"} relinked.`
                : `${created} new assets created.`,
          });
        }
      } catch (error) {
        setJob((j) => ({
          ...j,
          status: "error",
          message: error instanceof Error ? error.message : "Import failed",
        }));
      } finally {
        runningRef.current = false;
        pausedRef.current = false;
        cancelledRef.current = false;
      }
    },
    []
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setJob((j) => (j.status === "running" ? { ...j, status: "paused" } : j));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setJob((j) => (j.status === "paused" ? { ...j, status: "running" } : j));
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    // Un-pause too, otherwise the loop stays parked and never sees the cancel.
    pausedRef.current = false;
  }, []);

  const reset = useCallback(() => {
    if (runningRef.current) return;
    setJob(EMPTY);
  }, []);

  const value = useMemo<UploadJobContextValue>(
    () => ({
      ...job,
      progress: job.total > 0 ? Math.round((job.done / job.total) * 100) : 0,
      isActive: job.status === "running" || job.status === "paused",
      start,
      pause,
      resume,
      cancel,
      reset,
    }),
    [job, start, pause, resume, cancel, reset]
  );

  return <UploadJobContext.Provider value={value}>{children}</UploadJobContext.Provider>;
}

export function useUploadJob() {
  const ctx = useContext(UploadJobContext);
  if (!ctx) throw new Error("useUploadJob must be used inside <UploadJobProvider>");
  return ctx;
}
