import { useState } from "react";
import { X, Copy, Check, Download, ExternalLink, Calendar, User, Package, Tag, Plus, Edit3, FileText, Image as ImageIcon, Link } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Asset } from "../utils/supabaseApi";
import { toast } from "sonner@2.0.3";
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

  // Generate proper filename format
  const generateFileName = (assetName: string, type: string) => {
    const cleanName = assetName.toLowerCase().replace(/\s+/g, '_');
    const typePrefix = type === 'Micro' ? 'mi' : type === 'Icon' ? 'ic' : 'si';
    return `tds_${typePrefix}_${cleanName}.png`;
  };

  // Mock data for demo purposes with corrected format
  const mockData = {
    timeAdded: "Jan, 1st 2025",
    contributor: "Freude",
    product: "General",
    assetId: generateFileName(asset.asset_name, asset.type || 'Spot'),
    format: "PNG",
    fileSize: "2.4 MB",
    changelog: [
      {
        date: "Jan, 3rd 2025",
        contributor: "Freude",
        description: "Changing style to 4.5"
      },
      {
        date: "Jan, 5th 2025", 
        contributor: "Joy",
        description: "Update small details"
      }
    ]
  };

  const getTypeColors = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'instant':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'upgrade':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'gold':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      onClick={onClose}
    >
      <div 
        className="w-[340px] bg-white h-full shadow-xl overflow-y-auto animate-in slide-in-from-right-0 duration-300 asset-detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Asset Details */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Asset Details</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Image */}
          <div className="aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-4">
            <ImageWithFallback
              src={asset.url_lightroom}
              alt={asset.asset_name}
              className={`w-full h-full ${
                asset.type === 'Micro' ? 'object-contain p-4' :
                asset.type === 'Icon' ? 'object-contain p-3' :
                'object-cover object-center'
              }`}
            />
          </div>

          {/* Asset Information */}
          <div className="space-y-3">
            {/* Name */}
            <div>
              <div className="info-label mb-1">Name</div>
              <div className="info-value text-base leading-tight">
                {mockData.assetId}
              </div>
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
          <h3 className="text-base font-semibold text-gray-900 mb-4">Detail</h3>
          
          {/* Lightroom Link */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Link className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                value={asset.url_lightroom}
                readOnly
                className="flex-1 text-sm text-gray-600 bg-transparent border-none outline-none"
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                }}
              />
              <Button
                size="sm"
                onClick={() => handleCopyClick(asset.url_lightroom)}
                className="h-7 w-7 p-0 text-white rounded"
                style={{
                  background: isCopied ? '#10b981' : 'linear-gradient(to right, #5BAAFF, #0062F6)'
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
                background: 'linear-gradient(to right, #5BAAFF, #0062F6)'
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
              className="flex-1 h-9 px-3 rounded-lg border-gray-300"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit File Details
            </Button>
          </div>
        </div>

        <Separator />

        {/* Additional Details Section */}
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Additional Details</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="info-label">Asset ID:</span>
              <span className="info-value font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                {mockData.assetId}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="info-label">Format:</span>
              <span className="info-value">
                {mockData.format}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="info-label">Source:</span>
              <div className="flex items-center gap-2">
                <span className="info-value">Lightroom</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(asset.url_lightroom, '_blank')}
                  className="h-6 w-6 p-0 hover:bg-gray-100 rounded"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="info-label">File Size:</span>
              <span className="info-value">
                {mockData.fileSize}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="info-label">Time Added:</span>
              <span className="info-value">
                {mockData.timeAdded}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="info-label">Contributor:</span>
              <span className="info-value">
                {mockData.contributor}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Changelog Section */}
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Changelog</h3>
          
          <div className="space-y-4">
            {mockData.changelog.map((entry, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="changelog-date">
                    {entry.date}
                  </span>
                  <span className="changelog-contributor">
                    {entry.contributor}
                  </span>
                </div>
                <div className="changelog-text">
                  {entry.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}