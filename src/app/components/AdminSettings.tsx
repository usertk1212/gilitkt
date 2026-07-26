import { useState } from "react";
import { hashPassword, isHashingAvailable, HASH_PARAMS } from "../utils/authHash";
import { SUPERUSER_PASSWORD_HASH } from "../authConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { KeyRound, Copy, Check, AlertTriangle } from "./icons";

/**
 * Change Superuser Password.
 *
 * This screen deliberately does NOT change the password by itself. The digest is
 * compiled into the bundle, so nothing this screen could write at runtime would
 * take effect. Instead it does the one useful thing it can: hash the new
 * password locally and hand you the line to paste in before a rebuild.
 *
 * The alternative — a Save button that reports success while the old password
 * still works — is how you end up locked out of your own assumptions.
 */

/** Rough, honest strength read. The digest is public, so length is what matters. */
function assessStrength(pw: string): { label: string; tone: "weak" | "ok" | "good"; note: string } {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length < 10 && classes <= 2) {
    return {
      label: "Weak",
      tone: "weak",
      note: "Short and predictable. Because the digest ships in the app, someone who wants in can try candidate passwords offline as fast as their hardware allows. 200,000 iterations slows that down; it doesn't stop it.",
    };
  }
  if (pw.length < 16) {
    return {
      label: "Reasonable",
      tone: "ok",
      note: "Fine for keeping colleagues out of the Superuser menu.",
    };
  }
  return {
    label: "Strong",
    tone: "good",
    note: "Long enough that brute-forcing the digest is not worth anyone's time.",
  };
}

export function AdminSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "hashing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [digest, setDigest] = useState("");
  const [copied, setCopied] = useState(false);

  const snippet = digest
    ? `export const SUPERUSER_PASSWORD_HASH =\n  '${digest}';`
    : "";

  const handleGenerate = async () => {
    setDigest("");
    setCopied(false);

    if (!newPassword || newPassword.length < 4) {
      setStatus("error");
      setMessage("Use at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("The two passwords don't match.");
      return;
    }
    if (!isHashingAvailable()) {
      setStatus("error");
      setMessage(
        "This browser won't expose Web Crypto on an insecure origin. Open GILI over https, or on localhost."
      );
      return;
    }

    setStatus("hashing");
    setMessage("");
    try {
      const hex = await hashPassword(newPassword);
      if (hex === SUPERUSER_PASSWORD_HASH) {
        setStatus("error");
        setMessage("That's already the current password — nothing to change.");
        return;
      }
      setDigest(hex);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Couldn't hash the password.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions; the text is on screen to select.
      setCopied(false);
    }
  };

  const strength = newPassword ? assessStrength(newPassword) : null;

  return (
    <div className="flex-1 p-6 max-w-xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Change Superuser Password
          </CardTitle>
          <CardDescription>
            There is one Superuser and one password. The password itself is never stored anywhere —
            GILI only ships a {HASH_PARAMS.algorithm} digest of it, so it can't be read out of the app
            or out of Appwrite. Changing it means replacing that digest and redeploying.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {strength && (
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  strength.tone === "weak"
                    ? "font-semibold text-destructive"
                    : strength.tone === "ok"
                      ? "font-semibold text-foreground"
                      : "font-semibold text-green-600 dark:text-green-400"
                }
              >
                {strength.label}
              </span>{" "}
              — {strength.note}
            </p>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={handleGenerate} disabled={status === "hashing"}>
            {status === "hashing" ? "Hashing…" : "Generate hash"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Hashing runs entirely in this browser. The password is not sent anywhere, including to
            Appwrite.
          </p>
        </CardContent>
      </Card>

      {status === "done" && digest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Three steps left</CardTitle>
            <CardDescription>
              The new password is <strong>not active yet</strong>. It takes effect once this line is
              in the code and the app is redeployed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Copy the line below.</li>
              <li>
                Paste it over <code className="text-xs">SUPERUSER_PASSWORD_HASH</code> in{" "}
                <code className="text-xs">src/app/authConfig.ts</code> — or just send it back and ask
                for a rebuild.
              </li>
              <li>Redeploy. The old password stops working at that moment.</li>
            </ol>

            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">
              {snippet}
            </pre>

            <Button variant="secondary" className="w-full" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy the line
                </>
              )}
            </Button>

            <Alert>
              <AlertDescription className="text-xs">
                Write the password down somewhere safe first. It cannot be recovered from the digest —
                if you forget it, the only fix is generating a new one here and redeploying again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="text-xs">
          <strong>What this password does and doesn't do.</strong> Hashing stops anyone from reading
          it. It does not make the Superuser menu secure: GILI is a static site with no backend, so
          the check happens in your browser and someone comfortable with devtools can skip the gate
          regardless. Treat it as a guard against accidents, not against a determined person.
          Enforcing this properly would mean Appwrite accounts with collection-level permissions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
