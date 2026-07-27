import { Asset } from "../../utils/appwriteApi";

export const extractTags = (asset: Asset): string[] => {
  const tags: string[] = [];
  
  // Add name-based tags (simple extraction)
  // Guard against rows missing asset_name (e.g. added manually in the Appwrite
  // console without filling every field) so one incomplete row doesn't crash the app.
  const nameWords = (asset.asset_name || "").toLowerCase().split(" ");
  nameWords.forEach(word => {
    if (word.length > 2 && !tags.includes(word)) {
      tags.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  });
  
  return tags.slice(0, 3); // Limit to 3 tags
};

/**
 * Styling for a tag chip, shared by the asset card and the detail panel.
 *
 * One definition rather than two copies: the detail panel had drifted to square
 * `rounded` corners with a different unselected treatment, so the same tag looked
 * like two different components depending on where you saw it.
 *
 * Selected is a soft B100 fill with a 1px B400 outline and B400 text. The border
 * is present but transparent when unselected, so toggling a chip doesn't shift the
 * layout by a pixel.
 */
export const tagChipClasses = (isActive: boolean): string =>
  [
    "rounded-full border cursor-pointer transition-colors",
    isActive
      ? "bg-[var(--pp-chip-selected-bg)] text-[var(--pp-chip-selected-fg)] border-[var(--pp-chip-selected-fg)] hover:opacity-80"
      : "bg-muted text-muted-foreground border-transparent hover:bg-accent",
  ].join(" ");

/** Tooltip for a tag chip, so the toggle direction is never ambiguous. */
export const tagChipTitle = (tag: string, isActive: boolean): string =>
  isActive ? `Remove the "${tag}" filter` : `Filter by "${tag}"`;

export const highlightSearchMatch = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <span key={index} className="bg-blue-100 text-blue-800 font-medium">
        {part}
      </span>
    ) : part
  );
};