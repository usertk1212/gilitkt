import { useState, type ReactNode } from "react";
import { getAdminPassword } from "../utils/appwriteApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Lock, X, ArrowLeft } from "./icons";

interface AdminGateProps {
  children: ReactNode;
  /** Called when the user backs out without unlocking (X button or Esc). */
  onCancel?: () => void;
}

// Session-only unlock: closing the tab/browser re-locks the admin menu.
// This is a soft gate to keep casual users out of admin features — not real
// security, since the whole app is client-side JS anyone can inspect.
const SESSION_KEY = "gili_admin_unlocked";

export function AdminGate({ children, onCancel }: AdminGateProps) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    setChecking(true);
    setError("");
    try {
      const correctPassword = await getAdminPassword();
      if (input === correctPassword) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setUnlocked(true);
      } else {
        setError("Password salah.");
      }
    } catch {
      setError("Gagal memeriksa password. Coba lagi.");
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background p-6">
      <Card className="w-full max-w-sm relative">
        {/* Escape hatch for "oh, I didn't mean to click that" */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dan balik ke dashboard"
            title="Balik ke dashboard"
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <CardHeader className="text-center">
          <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <CardTitle>Admin Only</CardTitle>
          <CardDescription>Masukkan password untuk mengakses menu admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
            {checking ? "Memeriksa..." : "Masuk"}
          </Button>
          {onCancel && (
            <Button variant="ghost" className="w-full" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Balik ke Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
