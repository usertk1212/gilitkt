import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Loader2, Edit, Check } from "./icons";
import { updateAssetById, type Asset } from "../utils/appwriteApi";
import { toast } from "sonner";

/**
 * Rename an asset in place.
 *
 * The existing route to a rename was a dropdown menu → an edit dialog → three
 * fields → save. Fine for one correction; unusable for working through thousands
 * of auto-generated names, which is the actual job. Click the name, type, press
 * Enter, move on.
 *
 * Costs ZERO database reads: it goes through updateAssetById, using the document
 * id the snapshot already carries, so it also works while the read quota is
 * exhausted. One write per rename.
 *
 * Superuser-only by placement — this only appears inside Manage Asset, which sits
 * behind the password gate. There's no per-field permission check because there
 * are no accounts to check against; see utils/authHash.ts.
 */
interface InlineRenameProps {
  asset: Asset;
  /** Applied locally on success, so the list updates without a refetch. */
  onRenamed: (updated: Asset) => void;
  className?: string;
}

export function InlineRename({ asset, onRenamed, className = "" }: InlineRenameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(asset.asset_name || "");
  const [saving, setSaving] = useState(false);

  // If the asset prop changes underneath us (list re-sorted, snapshot refreshed),
  // don't keep showing a stale draft.
  useEffect(() => {
    if (!editing) setValue(asset.asset_name || "");
  }, [asset.asset_name, editing]);

  const commit = async () => {
    const next = value.trim();

    // Nothing to do — leave without spending a write.
    if (!next || next === (asset.asset_name || "").trim()) {
      setEditing(false);
      setValue(asset.asset_name || "");
      return;
    }

    setSaving(true);
    const res = await updateAssetById(asset.id, { asset_name: next });
    setSaving(false);

    if (!res.success || !res.data) {
      toast.error("Rename failed", { description: res.error });
      // Keep the field open with the attempted value so the work isn't lost.
      return;
    }

    onRenamed(res.data);
    setEditing(false);
    toast.success("Renamed", { description: `Now "${next}".` });
  };

  const cancel = () => {
    setValue(asset.asset_name || "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Click to rename"
        className={`group/rename flex min-w-0 items-center gap-1.5 text-left ${className}`}
      >
        <span className="truncate font-medium text-foreground">
          {asset.asset_name || <span className="text-muted-foreground">(no name)</span>}
        </span>
        <Edit className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/rename:opacity-100" />
      </button>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`} onClick={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        // Blur commits rather than discards: clicking away after typing a name
        // should keep it, not silently throw it out.
        onBlur={() => void commit()}
        className="h-8 min-w-0 flex-1 text-sm"
        size={1}
        placeholder="Asset name"
      />
      {saving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Check className="h-4 w-4 shrink-0 text-[var(--pp-text-positive)]" title="Enter to save, Esc to cancel" />
      )}
    </div>
  );
}
