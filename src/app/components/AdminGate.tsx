import { useState, type ReactNode } from "react";
import { getAdminPassword } from "../utils/appwriteApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Lock } from "lucide-react";

interface AdminGateProps {
  children: ReactNode;
}

// Session-only unlock: closing the tab/browser re-locks the admin menu.
// This is a soft gate to keep casual users out of admin features — not real
// security, since the whole app is client-side JS anyone can inspect.
const SESSION_KEY = "gili_admin_unlocked";

export function AdminGate({ children }: AdminGateProps) {
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
      <Card className="w-full max-w-sm">
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
            }}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={checking || !input}>
            {checking ? "Memeriksa..." : "Masuk"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
