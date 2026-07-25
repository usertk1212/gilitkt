import { useState } from "react";
import { X, Copy, Check, Plus, Edit3, Link, Search } from "./icons";
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

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-[340px] bg-card h-full shadow-xl overflow-y-auto overscroll-contain animate-in slide-in-from-right-0 duration-300 asset-detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Asset Details */}
        <div className="p-6 border-b">
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
            title="Klik buat zoom"
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
                <Search className="h-3.5 w-3.5" />
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
                title={`${displayName} — klik buat copy`}
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
        <div className="p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Detail</h3>

          {/* Lightroom Link */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={asset.url_lightroom}
                readOnly
                className="flex-1 text-sm text-muted-foreground bg-transparent border-none outline-none"
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                }}
              />
              <Button
                size="sm"
                onClick={() => handleCopyClick(asset.url_lightroom)}
                className="h-7 w-7 p-0 text-white rounded"
                style={{
                  background: isCopied ? 'var(--pp-bg-green-high)' : 'var(--pp-grad-brand)'
                }}
              >
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => onAssetOrganize?.(asset)}
              className="flex-1 h-9 text-white rounded-lg"
              style={{
                background: 'var(--pp-grad-brand)'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Project
            </Button>

            <Button
              onClick={() => {
                toast.info("Edit functionality coming soon!");
              }}
              variant="outline"
              className="flex-1 h-9 px-3 rounded-lg"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit File Details
            </Button>
          </div>
        </div>
      </div>

      <ImageZoomModal
        src={asset.url_lightroom}
        alt={asset.asset_name}
        caption={displayName}
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
      />
    </div>
  );
}
