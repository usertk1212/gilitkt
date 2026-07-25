import { useState, useEffect } from "react";
import { getAdminPassword, deleteAllAssets, getAllAssets } from "../utils/appwriteApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { AlertTriangle, Trash2 } from "./icons";

const CONFIRM_PHRASE = "HAPUS SEMUA";

export function HardResetDatabase() {
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "deleting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    getAllAssets().then((res) => setAssetCount(res.data?.length ?? 0));
  }, []);

  const canSubmit =
    confirmText.trim() === CONFIRM_PHRASE &&
    password.length > 0 &&
    status !== "deleting" &&
    status !== "checking";

  const handleDelete = async () => {
    if (confirmText.trim() !== CONFIRM_PHRASE) {
      setStatus("error");
      setMessage(`Ketik "${CONFIRM_PHRASE}" persis (huruf besar semua) buat konfirmasi.`);
      return;
    }

    setStatus("checking");
    setMessage("");
    const correctPassword = await getAdminPassword();
    if (password !== correctPassword) {
      setStatus("error");
      setMessage("Password admin salah.");
      return;
    }

    setStatus("deleting");
    setProgress(0);

    const res = await deleteAllAssets((done, total) => {
      setProgress(total > 0 ? Math.round((done / total) * 100) : 100);
    });

    if (res.success) {
      setStatus("success");
      setMessage(res.message || "Semua asset berhasil dihapus dari database.");
      setAssetCount(0);
      setPassword("");
      setConfirmText("");
    } else {
      setStatus("error");
      setMessage(res.error || "Gagal menghapus data.");
    }
  };

  return (
    <div className="flex-1 p-6 max-w-md mx-auto space-y-4">
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Hard Reset Database
          </CardTitle>
          <CardDescription>
            Ini bakal menghapus <strong>SEMUA</strong> asset di database secara permanen — gak bisa
            di-undo. Cuma buat kamu sebagai kontrol admin, misalnya mau mulai ulang dari nol.
            {assetCount !== null && (
              <span className="block mt-2 font-medium text-foreground">
                Saat ini ada {assetCount} asset di database.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password Superuser</label>
            <Input
              type="password"
              placeholder="Masukin password admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "deleting" || status === "checking"}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Ketik <strong>{CONFIRM_PHRASE}</strong> untuk konfirmasi
            </label>
            <Input
              placeholder={CONFIRM_PHRASE}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={status === "deleting" || status === "checking"}
            />
          </div>

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

          {status === "deleting" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Menghapus semua asset...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={!canSubmit}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {status === "checking"
              ? "Memeriksa password..."
              : status === "deleting"
                ? "Menghapus..."
                : "Hapus Semua Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
