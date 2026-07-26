import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Image as ImageIcon, Upload, ZoomIn, ZoomOut, RefreshCw, Check, AlertCircle, Trash2 } from "./icons";
import { getAboutImage, setAboutImage, clearAboutImage } from "../utils/appwriteApi";
import { toast } from "sonner";

/** Output size. 3:2, and small enough that the encoded data URL stays modest. */
const OUT_W = 900;
const OUT_H = 600;
/** JPEG quality — 0.82 is the knee of the size/quality curve for photographic art. */
const QUALITY = 0.82;

/**
 * Hidden Superuser tool: replace the About dialog's 3:2 placeholder.
 *
 * Flow: pick a local file -> reposition and zoom inside a fixed 3:2 frame ->
 * save. The saved value is a downscaled JPEG data URL held in the Appwrite
 * settings collection, so every device sees the same image.
 *
 * Why re-encode instead of storing the original: a phone photo is 3-8 MB, which
 * would blow past Appwrite's string-attribute limit and make the About dialog
 * slow to open. 900x600 at q0.82 lands around 80-150 KB, roughly 110-200 KB once
 * base64-encoded.
 */
export function AboutImageManager() {
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  // Transform of the source image inside the 3:2 frame.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAboutImage()
      .then(setCurrent)
      .finally(() => setLoadingCurrent(false));
  }, []);

  // Revoke the object URL when it's replaced, or the browser leaks the blob.
  useEffect(() => {
    return () => {
      if (srcUrl?.startsWith("blob:")) URL.revokeObjectURL(srcUrl);
    };
  }, [srcUrl]);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Not an image", { description: "Pick a PNG, JPG or WebP file." });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setSrcUrl(url);
      reset();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Couldn't read that image");
    };
    img.src = url;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  /**
   * Render the current view to a 900x600 canvas.
   *
   * The preview uses CSS `object-fit: cover` plus a translate/scale transform.
   * To make the saved file match what's on screen, the same maths is redone
   * against the output size: work out the cover scale, apply the user's zoom,
   * then convert the on-screen pixel offset into source pixels using the
   * frame-to-output ratio.
   */
  const renderToDataUrl = (): string | null => {
    const frame = frameRef.current;
    if (!imgEl || !frame) return null;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    const coverScale = Math.max(OUT_W / imgEl.naturalWidth, OUT_H / imgEl.naturalHeight);
    const scale = coverScale * zoom;
    const drawW = imgEl.naturalWidth * scale;
    const drawH = imgEl.naturalHeight * scale;

    // On-screen offsets are in frame pixels; scale them into output pixels.
    const ratio = OUT_W / frame.clientWidth;
    const dx = (OUT_W - drawW) / 2 + offset.x * ratio;
    const dy = (OUT_H - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(imgEl, dx, dy, drawW, drawH);
    return canvas.toDataURL("image/jpeg", QUALITY);
  };

  const handleSave = async () => {
    const dataUrl = renderToDataUrl();
    if (!dataUrl) {
      toast.error("Nothing to save", { description: "Choose an image first." });
      return;
    }
    setSaving(true);
    try {
      const res = await setAboutImage(dataUrl);
      if (!res.success) throw new Error(res.error || "Save failed");
      setCurrent(dataUrl);
      setSrcUrl(null);
      setImgEl(null);
      toast.success("About image saved", {
        description: `${Math.round(dataUrl.length / 1024)} KB stored. Open the About dialog to check it.`,
      });
    } catch (e) {
      toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    const res = await clearAboutImage();
    setSaving(false);
    if (res.success) {
      setCurrent(null);
      toast.success("Back to the placeholder");
    } else {
      toast.error("Couldn't reset", { description: res.error });
    }
  };

  const estKb = imgEl ? Math.round((renderToDataUrl()?.length ?? 0) / 1024) : 0;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            About Dialog Image
          </CardTitle>
          <CardDescription>
            Replaces the 3:2 placeholder in the About dialog (the one that opens from the version
            label). Drag to reposition, zoom to fill, then save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current saved image */}
          <div>
            <p className="mb-2 text-sm font-bold">Currently saved</p>
            {loadingCurrent ? (
              <div className="flex aspect-[3/2] w-full max-w-sm items-center justify-center rounded-[8px] bg-muted text-sm text-muted-foreground">
                Loading…
              </div>
            ) : current ? (
              <div className="space-y-2">
                <img
                  src={current}
                  alt="Current About image"
                  className="aspect-[3/2] w-full max-w-sm rounded-[8px] object-cover"
                />
                <Button variant="destructive" size="sm" onClick={handleClear} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revert to placeholder
                </Button>
              </div>
            ) : (
              <div className="flex aspect-[3/2] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-[8px] bg-muted text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">No image saved — showing the placeholder</span>
              </div>
            )}
          </div>

          {/* Picker */}
          <div
            className="cursor-pointer rounded-[8px] border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-bold">Choose or drop an image</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Any size — it gets cropped to 3:2 and saved at {OUT_W}×{OUT_H}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </CardContent>
      </Card>

      {/* Editor */}
      {imgEl && srcUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Position &amp; crop</CardTitle>
            <CardDescription>
              Drag inside the frame to move, zoom to fill it. Everything inside the frame is what
              gets saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={frameRef}
              className="relative aspect-[3/2] w-full overflow-hidden rounded-[8px] bg-muted"
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                src={srcUrl}
                alt="Preview"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transition: isDragging ? "none" : "transform 120ms ease-out",
                }}
              />
              {/* Rule-of-thirds guides, purely to help line things up */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))} disabled={zoom <= 1}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center text-sm tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))} disabled={zoom >= 4}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                ≈{estKb} KB when saved
              </span>
            </div>

            {estKb > 400 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  That's a large payload for a settings row. It will probably still save, but if
                  Appwrite rejects it, widen the <code>value</code> attribute on the{" "}
                  <code>settings</code> collection.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {saving ? "Saving…" : "Save as About image"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSrcUrl(null);
                  setImgEl(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
