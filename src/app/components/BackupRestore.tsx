import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Download, Upload, AlertTriangle, Check, RefreshCw, Database } from "./icons";
import {
  buildBackup,
  downloadBackup,
  parseBackup,
  restoreLocalData,
  downloadBackupAssetsCsv,
  type GiliBackup,
} from "../utils/backup";
import { exportAssetsToCSV, rebuildSnapshotFromDatabase, publishSnapshotFromCache } from "../utils/appwriteApi";
import { getReadBudget, FREE_PLAN_MONTHLY_READS } from "../utils/readBudget";
import { getSnapshotInfo } from "../utils/librarySnapshot";
import { APP_VERSION } from "../version";
import { toast } from "sonner";

/**
 * Backup, restore, and the two things that turn out to be closely related:
 * the published snapshot and the read budget.
 *
 * They're on one screen because they're all answers to "how do I not lose data or
 * get locked out". Splitting them across three menu items would hide the
 * connection.
 */
export function BackupRestore() {
  const [busy, setBusy] = useState<null | "backup" | "csv" | "restore" | "rebuild" | "fromCache">(null);
  const [loaded, setLoaded] = useState<{ backup: GiliBackup; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<{ rows: number; calls: number; percentOfFree: number } | null>(null);
  const [snapshot, setSnapshot] = useState<{ version: string; sizeBytes: number } | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshStatus = () => {
    void getReadBudget().then(setBudget);
    void getSnapshotInfo().then(setSnapshot);
  };

  useEffect(refreshStatus, []);

  const handleBackup = async () => {
    setBusy("backup");
    setError(null);
    try {
      const res = await buildBackup(APP_VERSION);
      if (!res.success || !res.backup) throw new Error(res.error || "Backup failed");
      const filename = downloadBackup(res.backup);
      toast.success("Backup downloaded", {
        description: `${filename} — ${res.backup.counts.assets} assets, ${res.backup.counts.projects} projects.`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCsv = async () => {
    setBusy("csv");
    setError(null);
    const res = await exportAssetsToCSV();
    setBusy(null);
    if (res.success) toast.success("CSV exported", { description: res.filename });
    else setError(res.error || "Export failed");
  };

  const handleFile = async (file: File) => {
    setError(null);
    const text = await file.text();
    const res = parseBackup(text);
    if (!res.success || !res.data) {
      setError(res.error || "Could not read that backup.");
      setLoaded(null);
      return;
    }
    setLoaded(res.data);
  };

  const handleRestoreLocal = () => {
    if (!loaded) return;
    setBusy("restore");
    const res = restoreLocalData(loaded.backup);
    setBusy(null);
    if (!res.success) {
      setError(res.error || "Restore failed");
      return;
    }
    toast.success("Projects restored", {
      description: `${res.projects} projects written. Reload to see them.`,
    });
  };

  const handlePublishFromCache = async () => {
    setBusy("fromCache");
    setError(null);
    const res = await publishSnapshotFromCache();
    setBusy(null);
    refreshStatus();
    if (res.success) {
      toast.success("Snapshot published", { description: res.message });
    } else {
      setError(res.error || "Could not publish from cache.");
    }
  };

  const handleRebuild = async () => {
    setBusy("rebuild");
    setError(null);
    const res = await rebuildSnapshotFromDatabase();
    setBusy(null);
    refreshStatus();
    if (res.success) toast.success("Snapshot rebuilt", { description: res.message });
    else setError(res.error || "Rebuild failed");
  };

  const pct = budget ? Math.min(budget.percentOfFree, 100) : 0;
  const budgetTone =
    pct >= 50 ? "var(--pp-text-alert)" : "var(--pp-text-positive)";

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl mx-auto">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Back up everything
          </CardTitle>
          <CardDescription>
            One JSON file with every asset and every project. Reads the published snapshot, so it
            costs no database reads and works even while the account is throttled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackup} disabled={busy !== null}>
              {busy === "backup" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download backup (.json)
            </Button>
            <Button variant="outline" onClick={handleCsv} disabled={busy !== null}>
              <Download className="mr-2 h-4 w-4" />
              Assets only (.csv)
            </Button>
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              <strong>Projects only exist in this browser.</strong> They're kept in localStorage, not
              in Appwrite, so they're invisible to the CSV export and gone if you clear site data.
              The JSON backup is the only thing that captures them — take one before clearing
              anything, and from the browser you actually use.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore from a backup
          </CardTitle>
          <CardDescription>
            Load a backup file to inspect it before anything is written.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="cursor-pointer rounded-[8px] border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-all hover:border-muted-foreground/50"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Choose a gili-backup-*.json file</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />

          {loaded && (
            <div className="space-y-3 rounded-[8px] bg-muted/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{loaded.backup.counts.assets} assets</Badge>
                <Badge variant="secondary">{loaded.backup.counts.projects} projects</Badge>
                <span className="text-xs text-muted-foreground">
                  from GILI {loaded.backup.appVersion},{" "}
                  {loaded.backup.createdAt ? loaded.backup.createdAt.slice(0, 10) : "unknown date"}
                </span>
              </div>

              {loaded.warnings.map((w) => (
                <p key={w} className="text-xs text-[var(--pp-text-alert)]">
                  • {w}
                </p>
              ))}

              <div className="space-y-2">
                <Button variant="secondary" onClick={handleRestoreLocal} disabled={busy !== null} className="w-full">
                  <Check className="mr-2 h-4 w-4" />
                  Restore {loaded.backup.counts.projects} projects to this browser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const name = downloadBackupAssetsCsv(loaded.backup);
                    toast.success("CSV ready", { description: `${name} — import it from Upload CSV.` });
                  }}
                  disabled={busy !== null}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Get assets as CSV, to import from Upload CSV
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Assets are restored through Upload CSV rather than from here, because writing
                thousands of rows needs the progress, pause and duplicate-checking that screen
                already has. This button just converts the backup into the CSV it expects.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshot + read budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Published snapshot & read budget
          </CardTitle>
          <CardDescription>
            Viewers read a published copy of the library from Storage instead of querying the
            database, which is what keeps read usage flat however many people use GILI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">Database reads this month (estimated)</span>
              <span className="tabular-nums" style={{ color: budgetTone }}>
                {budget ? budget.rows.toLocaleString("en-US") : "—"} /{" "}
                {FREE_PLAN_MONTHLY_READS.toLocaleString("en-US")}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: budgetTone, minWidth: pct > 0 ? "2px" : 0 }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Counted in this browser only, and reset on the 1st — Appwrite resets on your billing
              date, so this is a floor, not the bill. Other people's visits aren't included.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
            <span className="font-medium">Snapshot</span>
            <span className="text-muted-foreground">
              {snapshot === undefined
                ? "checking…"
                : snapshot === null
                  ? "not published yet"
                  : `${Math.round(snapshot.sizeBytes / 1024)} KB, updated ${snapshot.version.slice(0, 10)}`}
            </span>
          </div>

          {snapshot === null && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                No snapshot published yet, so everyone who opens GILI is reading the database
                directly — one read per asset, per person. Publish one now to stop that.
              </AlertDescription>
            </Alert>
          )}

          {/* The free path first, deliberately.
              When the read quota is exhausted, "publish from database" cannot
              work — it needs the reads you've run out of. This browser's cache
              already holds the library, so publishing from it costs nothing and
              unblocks everyone else immediately. */}
          <Button onClick={handlePublishFromCache} disabled={busy !== null} className="w-full">
            {busy === "fromCache" ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Publish from this browser's cache — 0 database reads
          </Button>
          <p className="text-xs text-muted-foreground">
            Publishes whatever this browser last loaded. Use this when the read quota is exhausted:
            it's the only way to get other people and incognito windows working again without waiting
            for the quota to reset. It can be slightly stale if the database changed since this
            browser last synced.
          </p>

          <Button variant="outline" onClick={handleRebuild} disabled={busy !== null} className="w-full">
            {busy === "rebuild" ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            {snapshot === null ? "Publish snapshot from database" : "Rebuild snapshot from database"}
          </Button>
          <p className="text-xs text-muted-foreground">
            The authoritative version, and the one expensive operation: it reads every row, so it
            costs one database read per asset and will fail outright while the quota is exhausted.
            Imports keep the snapshot current on their own for free — use this after editing rows
            directly in the Appwrite console, or if the counts ever look wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
