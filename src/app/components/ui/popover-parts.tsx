import type { ComponentType, ReactNode } from "react";
import { SearchLg } from "../icons/figma";
import { cn } from "./utils";

/*
 * The pieces a popover contains that are not menu items — a search box, an
 * empty state, a hint row.
 *
 * These exist as components rather than as a documented set of classes because
 * the previous arrangement was the latter, and it did not hold: every popover
 * that needed a search box wrote its own padding, and they drifted apart. A
 * component cannot drift.
 *
 * WHERE THE NUMBERS COME FROM
 * Nothing here is chosen. A menu item insets itself 8px from the surface edge
 * and then pads its own content by another 8px, so its text begins 16px in —
 * that is px-4 below, and it is why the input, the empty state, the hint and
 * the items all share one left edge. The icon size and the icon-to-label gap
 * are the item's. The empty state's height is two rows of --gili-menu-row-h,
 * so a filter matching nothing leaves the popover the size it was rather than
 * collapsing it.
 */

/*
 * ONE EDGE, 16px. Every part below — the search row, the empty state, the hint,
 * and the list rows the picker renders between them — starts its content at the
 * same 16px from the panel edge, which is how the design draws the column.
 *
 * A list row is inset 16px and then pads itself 8px, so its hover plate sits
 * inside this edge while its checkbox lands on it. That is why rows carry their
 * own px-2 rather than inheriting it from here.
 */
const EDGE = "px-4";

/*
 * A bare search row: magnifier, then text, then the divider underneath.
 *
 * Deliberately not the <Input> component. The design gives this no border, no
 * fill and no radius — the divider below is the only rule, and dropping a
 * bordered field in drew a second box inside the panel that the design has no
 * line for.
 */
export function PopoverSearch({
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={EDGE}>
      <div className="flex items-center gap-2 pb-2">
        <SearchLg className="size-5 shrink-0 text-[var(--pp-text-disabled)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-base leading-[1.38] outline-none",
            "text-[var(--pp-text-static-white)] placeholder:text-[var(--pp-text-disabled)]"
          )}
        />
      </div>
    </div>
  );
}

/**
 * The no-results panel, held at the design's 90px so filtering down to nothing
 * leaves the popover the height it already was instead of collapsing it.
 */
export function PopoverEmpty({ children }: { children: ReactNode }) {
  return (
    <p
      className={cn(
        EDGE,
        "flex h-[90px] items-center justify-center text-center text-base leading-[1.38] text-[var(--pp-text-static-white)]"
      )}
    >
      {children}
    </p>
  );
}

export function PopoverHint({
  icon: Icon,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        EDGE,
        "flex items-center gap-2 py-1 text-sm leading-[1.43] text-[var(--pp-text-static-white)]"
      )}
    >
      {Icon && <Icon className="size-5 shrink-0" />}
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
