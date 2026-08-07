import { useMemo, useState } from "react";
import { PopoverEmpty, PopoverHint, PopoverSearch } from "../ui/popover-parts";
import { Checkbox } from "../ui/checkbox";
import { Plus } from "../icons";
import { Island as IslandGlyph } from "../icons/figma";
import { type Asset } from "../../utils/appwriteApi";
import { highlightSearchMatch } from "../helpers/assetHelpers";
import { type Island } from "./types";

interface IslandPickerProps {
  asset: Asset;
  islands: Island[];
  onUpdateIslands: (islands: Island[]) => void;
  /** Called after any change, so the surrounding popover can close itself. */
  onDone?: () => void;
}

/**
 * The single place an asset gets added to or removed from an island.
 *
 * 1.x had three: a dropdown on the card, a "Manage project" dialog behind it,
 * and a separate full modal reached from the card's overflow menu. All three
 * did the same job with different affordances, and only one of them could
 * create a collection. This is one list with a search box and an inline create,
 * which is what the design shows behind the card's + button.
 */
export function IslandPicker({ asset, islands, onUpdateIslands, onDone }: IslandPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? islands.filter((i) => i.name.toLowerCase().includes(q)) : islands;
  }, [islands, query]);

  const toggle = (island: Island) => {
    const isMember = island.asset_ids.includes(asset.nama_file);
    onUpdateIslands(
      islands.map((i) =>
        i.id === island.id
          ? {
              ...i,
              asset_ids: isMember
                ? i.asset_ids.filter((id) => id !== asset.nama_file)
                : [...i.asset_ids, asset.nama_file],
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );
  };

  const createFromQuery = () => {
    const name = query.trim();
    if (!name) return;
    const now = new Date().toISOString();
    onUpdateIslands([
      ...islands,
      {
        id: `island-${Date.now()}`,
        name,
        asset_ids: [asset.nama_file],
        created_at: now,
        updated_at: now,
      },
    ]);
    setQuery("");
    onDone?.();
  };

  const exactMatch = islands.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-2">
      <PopoverSearch
        placeholder="Search or name a new island"
        value={query}
        onChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim() && !exactMatch) createFromQuery();
        }}
        autoFocus
      />
      <Divider />

      {filtered.length === 0 ? (
        <PopoverEmpty>No island found yet</PopoverEmpty>
      ) : (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto py-2">
          <p className="px-4 text-base leading-[1.38] font-bold text-[var(--pp-a60)]">Island</p>

          <div className="flex flex-col gap-2.5 px-4">
            {filtered.map((island) => {
              const isMember = island.asset_ids.includes(asset.nama_file);
              return (
                /* A <label>, not a <button>: the row's control is a real
                   checkbox, and a checkbox nested inside a button is neither
                   valid nor operable by keyboard. The label keeps the whole
                   row as one hit target. */
                <label
                  key={island.id}
                  title={isMember ? `Remove from "${island.name}"` : `Add to "${island.name}"`}
                  className="flex cursor-default items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10 focus-within:bg-white/10"
                >
                  <Checkbox checked={isMember} onCheckedChange={() => toggle(island)} />
                  <span className="min-w-0 flex-1 truncate text-base leading-[1.38] font-bold text-[var(--pp-text-static-white)]">
                    {highlightSearchMatch(island.name, query)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {query.trim() && !exactMatch && (
        <>
          <Divider />
          <div className="px-4">
            <button
              type="button"
              onClick={createFromQuery}
              className="flex w-full cursor-default items-center gap-3 rounded-lg p-2 text-left text-base leading-[1.38] font-bold text-[var(--pp-text-static-white)] transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            >
              <Plus className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Create "{query.trim()}"</span>
            </button>
          </div>
        </>
      )}

      <Divider />
      <PopoverHint icon={IslandGlyph}>Type a name above to make your first island</PopoverHint>
    </div>
  );
}

/** The design's "Divider - Horizontal": a full-bleed hairline between sections. */
function Divider() {
  return <div className="gili-glass-menu-divider h-px w-full" />;
}
