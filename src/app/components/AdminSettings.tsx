import { useState } from "react";
import { setAdminPassword } from "../utils/appwriteApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { KeyRound } from "./icons";

export function AdminSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!newPassword || newPassword.length < 4) {
      setStatus("error");
      setMessage("Password minimal 4 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setStatus("saving");
    const res = await setAdminPassword(newPassword);
    if (res.success) {
      setStatus("success");
      setMessage("Password berhasil diubah. Password baru berlaku mulai sekarang.");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setStatus("error");
      setMessage(res.error || "Gagal menyimpan password.");
    }
  };

  return (
    <div className="flex-1 p-6 max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Ganti Password Admin
          </CardTitle>
          <CardDescription>
            This password is only a speed bump against accidentally opening the Superuser menu —
            bukan proteksi keamanan penuh, karena app ini jalan di browser (client-side)
            and it is visible in the source via devtools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Password baru"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Konfirmasi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {status === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-700 dark:text-green-400">{message}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={handleSave} disabled={status === "saving"}>
            {status === "saving" ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
