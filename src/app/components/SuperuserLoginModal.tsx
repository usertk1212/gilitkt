import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { useSuperuser } from "../context/SuperuserContext";
import { useUploadJob } from "../context/UploadJobContext";

interface SuperuserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired once the password checks out. */
  onUnlocked?: () => void;
}

/**
 * Replaces 1.x's full-screen AdminGate card. The design puts this over a dimmed
 * dashboard so you keep your place instead of being thrown to a separate screen.
 */
export function SuperuserLoginModal({ isOpen, onClose, onUnlocked }: SuperuserLoginModalProps) {
  const { login, checking, error, clearError, expiredNotice } = useSuperuser();
  const job = useUploadJob();
  const [password, setPassword] = useState("");

  // Reopening after a failure should not greet you with the previous attempt's
  // error still sitting there.
  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    clearError();
  }, [isOpen, clearError]);

  const handleSubmit = async () => {
    if (!password || checking) return;
    if (await login(password)) {
      setPassword("");
      onUnlocked?.();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gili-superuser-modal w-[318px] gap-0 rounded-3xl border-0 p-6 pt-8 text-center sm:max-w-[318px]">
        {/* The superuser mark, the same orb the sidebar avatar uses, rather than
            a glyph in a tinted circle. */}
        <img
          src="/assets/avatar/superuser.png"
          alt=""
          className="mx-auto mb-4 size-[72px]"
        />

        <DialogTitle className="pp-h3 text-[var(--pp-text-high)]">
          Login to Superuser!
        </DialogTitle>
        <DialogDescription className="mt-1 text-base leading-[1.38] text-[var(--pp-text-mid)]">
          {expiredNotice
            ? "Your session expired after 15 minutes idle. Enter the password to continue."
            : "Superuser access lets you manage and edit assets."}
        </DialogDescription>

        {job.isActive && (
          <Alert className="mt-4 border-[var(--pp-stroke-active)] bg-[var(--pp-bg-blue-low)] text-left">
            <AlertDescription className="text-xs text-[var(--pp-text-active)]">
              An import is still running in the background ({job.done}/{job.total}). It keeps going
              while the session is locked — nothing is lost.
            </AlertDescription>
          </Alert>
        )}

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          autoFocus
          className="mt-6 h-12 rounded-xl text-center"
        />

        {error && <p className="mt-2 text-left text-sm text-destructive">{error}</p>}

        <Button size="lg" className="mt-4 w-full" onClick={handleSubmit} disabled={checking || !password}>
          {checking ? "Checking…" : "Unlock"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
