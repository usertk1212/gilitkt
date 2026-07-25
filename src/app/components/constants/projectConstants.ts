export const PROJECT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"
];

export const ASSET_TYPE_LABELS = {
  'Micro': 'Micro Illus',
  'Icon': 'Icon',
  'Spot': 'Spot Illus',
  'Supergraphic': 'Supergraphic',
  'Other': 'Others',
  'General': 'Others'
} as const;

/**
 * Badge/label text for an asset type. Falls back to the raw type string rather
 * than to a hardcoded "Spot Illus", which used to mislabel every Supergraphic
 * and Other asset as a Spot Illustration.
 */
export function getAssetTypeLabel(type: string | undefined | null): string {
  if (!type) return 'Others';
  return ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] ?? type;
}