import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Plus, Link, ZoomIn, ArrowRight } from "./icons";
import { ImageZoomModal } from "./ImageZoomModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Asset } from "../utils/appwriteApi";
import { toast } from "sonner";
import { copyWithFeedback } from "../utils/clipboard";
import { extractTags } from "./helpers/assetHelpers";

interface AssetDetailPanelProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
  onAssetOrganize?: (asset: Asset) => void;
}

export function AssetDetailPanel({
  asset,
  isOpen,
  onClose,
  onTagClick,
  onAssetOrganize
}: AssetDetailPanelProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Lock the page behind the panel.
  //
  // Without this the body keeps scrolling under a position:fixed overlay, which
  // on mobile makes the panel look like it's sliding around — you think you're
  // scrolling the panel but you're moving the page beneath it. position:fixed
  // on <body> also has to restore the previous scroll offset on close, or
  // dismissing the panel silently jumps you back to the top of the grid.
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Esc closes, matching the zoom modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyClick = async (text: string) => {
    await copyWithFeedback(
      text,
      () => {
        setIsCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2000);
      },
      (errorMessage: string) => {
        toast.error("Copy failed", { description: errorMessage });
      }
    );
  };

  const tags = extractTags(asset);

  // Show the REAL filename from the database.
  //
  // This used to synthesise one by gluing a "tds_<type>_" prefix onto the asset
  // name, which produced names that don't exist — e.g. an Other-type asset
  // called `ot_bt_cc_zoom_travel2` was displayed as
  // `tds_si_ot_bt_cc_zoom_travel2.png`: double-prefixed, and mislabelled as a
  // Spot illustration because the prefix map only knew Micro/Icon/Spot and
  // defaulted everything else to "si". Since this is the name people copy to go
  // find the file, a fabricated one is worse than useless.
  const displayName = asset.nama_file || asset.asset_name || 'untitled';

  const getTypeColors = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'instant':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'upgrade':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'gold':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Portalled for the same reason as ImageZoomModal: a transformed ancestor
  // would otherwise become the containing block for this fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        /* h-dvh over h-full: mobile browsers resize the viewport as the address
           bar hides/reveals, and h-full re-measures against it, so the panel
           kept growing and shrinking. The slide-in animation is desktop-only —
           on a full-width mobile sheet it read as the panel drifting. */
        className="asset-detail-panel h-dvh w-full max-w-[340px] overflow-y-auto overscroll-contain bg-card shadow-xl lg:h-full lg:w-[340px] lg:animate-in lg:slide-in-from-right-0 lg:duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Asset Details */}
        <div className="p-4 lg:p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Asset Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-accent rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Image — click to inspect at full size.
              object-contain across every type: object-cover was cropping
              portrait and non-4:3 assets, which is unusable in a library whose
              whole job is letting you check what an asset actually looks like. */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            title="Click to zoom"
            className="group relative mb-4 block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImageWithFallback
              src={asset.url_lightroom}
              alt={asset.asset_name}
              className={`h-full w-full object-contain ${
                asset.type === 'Micro' ? 'p-4' : asset.type === 'Icon' ? 'p-3' : 'p-1'
              }`}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-900">
                <ZoomIn className="h-3.5 w-3.5" />
                Zoom
              </span>
            </span>
          </button>

          {/* Asset Information */}
          <div className="space-y-3">
            {/* Name — filenames have no spaces, so break-all is what actually
                forces a wrap; line-clamp caps it at 3 lines so a very long name
                can't push the whole panel down. Full name on hover + click to copy. */}
            <div>
              <div className="info-label mb-1">Name</div>
              <button
                type="button"
                onClick={() => handleCopyClick(displayName)}
                title={`${displayName} — click to copy`}
                className="info-value line-clamp-3 break-all text-left text-base leading-snug transition-opacity hover:opacity-70"
              >
                {displayName}
              </button>
            </div>

            {/* Type */}
            <div>
              <div className="info-label mb-1">Type</div>
              <div className="info-value">
                {asset.type || 'Illustration'}
              </div>
            </div>

            {/* Source — opens the asset straight in Lightroom.
                rel="noopener noreferrer" because target="_blank" otherwise hands
                the opened page a reference back to this window. */}
            <div>
              <div className="info-label mb-1">Source</div>
              {asset.url_lightroom ? (
                <a
                  href={asset.url_lightroom}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--pp-text-active)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Open in Lightroom (new tab)"
                >
                  Lightroom
                  <ArrowRight className="h-3.5 w-3.5 -rotate-45" />
                </a>
              ) : (
                <div className="info-value text-muted-foreground">-</div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <div className="info-label mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getTypeColors(tag)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag);
                      }}
                      title={`Filter by "${tag}"`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Detail Section */}
        <div className="p-4 lg:p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Detail</h3>

          {/* Lightroom Link */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                size={1}
                value={asset.url_lightroom}
                readOnly
                className="min-w-0 flex-1 text-sm text-muted-foreground bg-transparent border-none outline-none"
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                }}
              />
              <Button
                size="sm"
                onClick={() => handleCopyClick(asset.url_lightroom)}
                className="h-7 w-7 p-0 text-white rounded"
                style={{
                  background: isCopied ? 'var(--pp-bg-green-high)' : 'var(--pp-bg-blue-high)'
                }}
              >
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Single full-width action. "Edit File Details" used to sit next to
              this — it only fired a "coming soon" toast, and the two-button row
              was what overflowed the panel edge. */}
          <Button
            onClick={() => onAssetOrganize?.(asset)}
            className="h-9 w-full rounded-lg text-white"
            style={{ background: 'var(--pp-bg-blue-high)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Project
          </Button>
        </div>
      </div>

      <ImageZoomModal
        src={asset.url_lightroom}
        alt={asset.asset_name}
        caption={displayName}
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
      />
    </div>,
    document.body
  );
}
