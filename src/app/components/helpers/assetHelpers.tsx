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

/** The four chip states drawn in the design system. */
export type TagChipState = "rest" | "selected" | "disabled" | "alert";

/**
 * Styling for a tag chip, shared by the asset card and the detail panel.
 *
 * One definition rather than two copies, and it owns the geometry as well as the
 * colour: the detail panel had drifted to square corners and its own padding, so
 * the same tag looked like two different components depending on where you saw it.
 *
 * Geometry is 28px tall. Figma reports 4px/12px padding *and* a 1px stroke, but
 * its strokes are drawn inside the frame, so taking both literally in CSS gives a
 * 30px chip. 3px/11px plus the border is the same 28px box. Every state carries a
 * border, transparent where the design shows none, so switching state cannot
 * shift the layout by a pixel.
 */
export const tagChipClasses = (state: TagChipState | boolean): string => {
  const resolved: TagChipState =
    typeof state === "boolean" ? (state ? "selected" : "rest") : state;

  const surface = {
    rest: "bg-[var(--pp-bg-base)] text-[var(--pp-text-high)] border-border hover:bg-accent/50",
    selected:
      "bg-[var(--pp-chip-selected-bg)] text-[var(--pp-chip-selected-fg)] border-[var(--pp-chip-selected-fg)] hover:opacity-80",
    disabled:
      "bg-[var(--pp-bg-backdrop)] text-[var(--pp-text-disabled)] border-transparent cursor-not-allowed",
    alert: "bg-[var(--pp-bg-base)] text-[var(--pp-text-high)] border-[var(--pp-stroke-alert)]",
  }[resolved];

  return [
    "inline-flex items-center justify-center gap-1 rounded-full border",
    "px-[11px] py-[3px] text-sm font-normal leading-[1.43] whitespace-nowrap",
    resolved === "disabled" ? "" : "cursor-pointer",
    "transition-colors",
    surface,
  ]
    .filter(Boolean)
    .join(" ");
};

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