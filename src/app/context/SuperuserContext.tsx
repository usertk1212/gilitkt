import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { verifyAdminPassword } from "../utils/appwriteApi";
import { useUploadJob } from "./UploadJobContext";
import { toast } from "sonner";

/*
 * Superuser session, lifted out of AdminGate.
 *
 * In 1.x the unlock state lived inside AdminGate, which was fine when the only
 * thing that cared was the admin screen it wrapped. The 2.0 design puts the
 * identity in the sidebar footer on every screen — the chip reads "Guest" or
 * "Superuser" and its popover offers either "Login Superuser!" or "Manage
 * asset" — so the state has to outlive any one view.
 *
 * The gate itself is unchanged in substance: same PBKDF2 credential check via
 * verifyAdminPassword, same escalating cooldown, same 15-minute idle lock. It
 * is a speed bump to keep casual users out of destructive tooling, not real
 * security — the whole app is client-side JS anyone can read.
 */

const SESSION_KEY = "gili_admin_unlocked";
const SESSION_EXPIRES_KEY = "gili_admin_expires_at";
const FAILED_ATTEMPTS_KEY = "gili_admin_failures";
const LOCKOUT_UNTIL_KEY = "gili_admin_lockout_until";

/** Free tries before the cooldown starts escalating. */
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
/** Idle time before the Superuser session locks itself. */
const SESSION_IDLE_MS = 15 * 60 * 1000;
/** How long before expiry to warn. */
const WARN_BEFORE_MS = 60 * 1000;
/** Activity events that count as "still working". */
const ACTIVITY_EVENTS = ["mousedown", "keydown", "wheel", "touchstart"] as const;

interface SuperuserValue {
  unlocked: boolean;
  checking: boolean;
  error: string;
  /** Seconds until the idle lock fires, or null when not imminent. */
  secondsLeft: number | null;
  /** True when the last lock was caused by idling rather than an explicit lock. */
  expiredNotice: boolean;
  login: (password: string) => Promise<boolean>;
  lock: () => void;
  clearError: () => void;
}

const SuperuserContext = createContext<SuperuserValue | null>(null);

export function SuperuserProvider({ children }: { children: ReactNode }) {
  const job = useUploadJob();

  const [unlocked, setUnlocked] = useState(() => {
    if (sessionStorage.getItem(SESSION_KEY) !== "true") return false;
    return Date.now() < Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || 0);
  });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
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
    setUnlocked(false);
    setSecondsLeft(null);
  }, []);

  const expire = useCallback(() => {
    lock();
    setExpiredNotice(true);
  }, [lock]);

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

      const remaining = Number(sessionStorage.getItem(SESSION_EXPIRES_KEY) || 0) - Date.now();

      if (remaining <= 0) {
        expire();
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
  }, [unlocked, extendSession, expire]);

  useEffect(() => {
    if (!expiredNotice) return;
    toast.info("Superuser session expired", {
      description: "You were idle for a while. Enter the password again to continue.",
    });
  }, [expiredNotice]);

  const login = useCallback(
    async (password: string) => {
      // Throttle repeated failures. This only slows guessing through the UI —
      // it's client-side, so it's a speed bump, not a defence.
      const lockedUntil = Number(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || 0);
      if (lockedUntil > Date.now()) {
        setError(`Too many attempts. Wait ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.`);
        return false;
      }

      setChecking(true);
      setError("");
      try {
        const ok = await verifyAdminPassword(password);
        if (ok) {
          sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
          sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
          sessionStorage.setItem(SESSION_KEY, "true");
          extendSession();
          setUnlocked(true);
          setExpiredNotice(false);
          return true;
        }

        const failures = Number(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || 0) + 1;
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(failures));

        if (failures >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
          // Back off geometrically: 15s, 30s, 60s, 120s… capped at 5 minutes.
          const delayMs = Math.min(15_000 * 2 ** (failures - MAX_ATTEMPTS_BEFORE_LOCKOUT), 300_000);
          sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + delayMs));
          setError(`Wrong password. Too many attempts — wait ${Math.round(delayMs / 1000)}s.`);
        } else {
          const left = MAX_ATTEMPTS_BEFORE_LOCKOUT - failures;
          setError(`Wrong password. ${left} ${left === 1 ? "try" : "tries"} before a cooldown.`);
        }
        return false;
      } catch {
        setError("Couldn't verify the password. Try again.");
        return false;
      } finally {
        setChecking(false);
      }
    },
    [extendSession]
  );

  const clearError = useCallback(() => setError(""), []);

  return (
    <SuperuserContext.Provider
      value={{ unlocked, checking, error, secondsLeft, expiredNotice, login, lock, clearError }}
    >
      {children}
    </SuperuserContext.Provider>
  );
}

export function useSuperuser() {
  const ctx = useContext(SuperuserContext);
  if (!ctx) throw new Error("useSuperuser must be used within a SuperuserProvider");
  return ctx;
}
