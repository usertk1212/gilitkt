import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { resolveAdminRole, type AdminRole } from "../utils/appwriteApi";
import { useUploadJob } from "../context/UploadJobContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Zap, X, ArrowLeft, AlertTriangle } from "./icons";
import { toast } from "sonner";

interface AdminGateProps {
  /** Receives the resolved role so the menu can hide superuser-only items. */
  children: ReactNode | ((role: AdminRole) => ReactNode);
  /** Called when the user backs out without unlocking (X button or Esc). */
  onCancel?: () => void;
}

// Session unlock. Closing the tab re-locks, and so does sitting idle for
// SESSION_IDLE_MS. This is a soft gate to keep casual users out of Superuser
// features — not real security, since the whole app is client-side JS anyone
// can inspect.
const SESSION_KEY = "gili_admin_unlocked";
const SESSION_ROLE_KEY = "gili_admin_role";
const SESSION_EXPIRES_KEY = "gili_admin_expires_at";

/** Idle time before the Superuser session locks itself. */
const SESSION_IDLE_MS = 15 * 60 * 1000; // 15 minutes
/** How long before expiry to warn. */
const WARN_BEFORE_MS = 60 * 1000; // 1 minute
/** Activity events that count as "still working". */
const ACTIVITY_EVENTS = ["mousedown", "keydown", "wheel", "touchstart"] as const;

export function AdminGate({ children, onCancel }: AdminGateProps) {
  const job = useUploadJob();

  const [unlocked, setUnlocked] = useState(() => {
    if (sessionStorage.getItem(SESSION_KEY) !== "true") return false;
    const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || 0);
    return Date.now() < expiresAt;
  });
  const [role, setRole] = useState<AdminRole>(
    () => (sessionStorage.getItem(SESSION_ROLE_KEY) as AdminRole) || "admin"
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expiredNotice, setExpiredNotice] = useState(false);

  // Read the live job status inside the interval without re-arming the timer on
  // every progress tick.
  const jobActiveRef = useRef(job.isActive);
  jobActiveRef.current = job.isActive;

  const extendSession = useCallback(() => {
    sessionStorage.setItem(SESSION_EXPIRES_KEY, String(Date.now() + SESSION_IDLE_MS));
    setSecondsLeft(null);
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
    setUnlocked(false);
    setInput("");
    setSecondsLeft(null);
    setExpiredNotice(true);
  }, []);

  // --- activity tracking + expiry countdown ---
  useEffect(() => {
    if (!unlocked) return;

    extendSession();
    const onActivity = () => extendSession();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      // An import in flight counts as activity. Locking mid-import would yank
      // the CSV Viewer out from under a job that's still writing to Appwrite,
      // so the session is held open until it finishes.
      if (jobActiveRef.current) {
        extendSession();
        return;
      }

      const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || 0);
      const remaining = expiresAt - Date.now();

      if (remaining <= 0) {
        lock();
      } else if (remaining <= WARN_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, [unlocked, extendSession, lock]);

  useEffect(() => {
    if (expiredNotice) {
      toast.info("Superuser session expired", {
        description: "You were idle for a while. Enter the password again to continue.",
      });
    }
  }, [expiredNotice]);

  const handleUnlock = async () => {
    setChecking(true);
    setError("");
    try {
      const resolved = await resolveAdminRole(input);
      if (resolved) {
        sessionStorage.setItem(SESSION_KEY, "true");
        sessionStorage.setItem(SESSION_ROLE_KEY, resolved);
        setRole(resolved);
        extendSession();
        setUnlocked(true);
        setExpiredNotice(false);
      } else {
        setError("Wrong password.");
      }
    } catch {
      setError("Couldn't verify the password. Try again.");
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) {
    return (
      <>
        {/* About-to-expire warning. Any click/keypress dismisses it by
            extending the session, so there's no separate "stay signed in". */}
        {secondsLeft !== null && (
          <div className="fixed left-1/2 top-4 z-[80] -translate-x-1/2">
            <Alert className="w-[360px] border-[var(--pp-stroke-alert)] bg-[var(--pp-bg-red-low)] shadow-lg">
              <AlertTriangle className="h-4 w-4 text-[var(--pp-icon-alert)]" />
              <AlertDescription className="text-[var(--pp-text-alert)]">
                <p className="font-bold">Session locking in {secondsLeft}s</p>
                <p className="text-xs">Move the mouse or press a key to stay signed in.</p>
              </AlertDescription>
            </Alert>
          </div>
        )}
        {typeof children === "function" ? children(role) : children}
      </>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background p-6">
      <Card className="w-full max-w-sm relative">
        {/* Escape hatch for "oh, I didn't mean to click that" */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close and go back to the dashboard"
            title="Back to dashboard"
            className="absolute right-3 top-3 rounded-[4px] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <CardHeader className="text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-[var(--pp-icon-active)]" />
          <CardTitle>Superuser</CardTitle>
          <CardDescription>
            {expiredNotice
              ? "Your session expired after 15 minutes idle. Enter the password to continue."
              : "Enter the password to open the Superuser menu."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.isActive && (
            <Alert className="border-[var(--pp-stroke-active)] bg-[var(--pp-bg-blue-low)]">
              <AlertDescription className="text-xs text-[var(--pp-text-active)]">
                An import is still running in the background ({job.done}/{job.total}). It keeps
                going while the session is locked — nothing is lost.
              </AlertDescription>
            </Alert>
          )}

          <Input
            type="password"
            placeholder="Password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock();
              if (e.key === "Escape" && onCancel) onCancel();
            }}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={checking || !input}>
            {checking ? "Checking…" : "Unlock"}
          </Button>
          {onCancel && (
            <Button variant="ghost" className="w-full" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
