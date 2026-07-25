import { useState } from "react";
import { useUploadJob } from "../context/UploadJobContext";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Upload, X, Check, AlertCircle, ChevronDown, ChevronUp } from "./icons";

/**
 * Floating import status, pinned bottom-right and rendered app-wide.
 *
 * Exists so that walking away from the CSV Viewer mid-import doesn't leave you
 * blind: the job keeps running in UploadJobProvider, and this is how you see it
 * and control it from anywhere, including the dashboard.
 */
export function UploadJobWidget() {
  const job = useUploadJob();
  const [collapsed, setCollapsed] = useState(false);

  if (job.status === "idle") return null;

  const tone =
    job.status === "done"
      ? "border-[var(--pp-stroke-positive)]"
      : job.status === "error"
      ? "border-[var(--pp-stroke-alert)]"
      : "border-[var(--pp-stroke-active)]";

  const title =
    job.status === "running"
      ? "Importing…"
      : job.status === "paused"
      ? "Import paused"
      : job.status === "done"
      ? "Import finished"
      : job.status === "cancelled"
      ? "Import stopped"
      : "Import failed";

  return (
    <div
      className={`fixed bottom-4 right-4 z-[70] w-[320px] rounded-[8px] border-2 bg-card shadow-xl ${tone}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {job.status === "done" ? (
          <Check className="h-4 w-4 shrink-0 text-[var(--pp-icon-positive)]" />
        ) : job.status === "error" ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--pp-icon-alert)]" />
        ) : (
          <Upload className="h-4 w-4 shrink-0 text-[var(--pp-icon-active)]" />
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-bold">{title}</span>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-[4px] p-1 text-muted-foreground hover:bg-muted"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {!job.isActive && (
          <button
            type="button"
            onClick={job.reset}
            className="rounded-[4px] p-1 text-muted-foreground hover:bg-muted"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-2 border-t px-3 py-2">
          {job.label && (
            <p className="truncate text-xs text-muted-foreground" title={job.label}>
              {job.label}
            </p>
          )}

          <Progress value={job.progress} />
          <p className="text-xs text-muted-foreground">
            {job.done} / {job.total} rows ({job.progress}%)
            {job.created > 0 && ` · ${job.created} created`}
            {job.updated > 0 && ` · ${job.updated} updated`}
          </p>

          {job.message && <p className="text-xs">{job.message}</p>}

          {job.isActive && (
            <div className="flex gap-2 pt-1">
              {job.status === "running" ? (
                <Button size="sm" variant="secondary" className="flex-1" onClick={job.pause}>
                  Pause
                </Button>
              ) : (
                <Button size="sm" className="flex-1" onClick={job.resume}>
                  Resume
                </Button>
              )}
              <Button size="sm" variant="destructive" className="flex-1" onClick={job.cancel}>
                Stop
              </Button>
            </div>
          )}

          {job.isActive && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Rows already written stay saved. Stopping won't undo them, and your
              Superuser session won't expire while this is running.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
