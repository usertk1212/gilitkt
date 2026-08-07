import type { ComponentType, ReactNode } from "react";
import { cn } from "./ui/utils";
import { Check } from "./icons/figma";

/*
 * The dark glassmorphic surface the 2.0 design uses for every floating menu —
 * the sidebar user popover, the island kebab menu, and the View/Sort chips.
 *
 * LAYOUT ONLY — it deliberately paints no background. The surface (N900 at
 * 80%, 20px blur) belongs to PopoverContent, which every one of these renders
 * inside. When both drew it, the two translucent layers composited to roughly
 * 96% and every menu came out solid black instead of glass.
 */

export function GlassMenu({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        // 8px on the shell, 8px on each row: the label lands 16px from the menu
        // edge as the design draws it, while a row's hover plate stays inset
        // rather than running edge to edge. Dividers undo it — see below.
        "flex w-full flex-col items-start gap-2 px-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GlassMenuDivider() {
  return (
    // -mx-2 cancels the shell's inset so the rule spans the full menu width,
    // which is how the design draws it — only the rows are inset.
    <div className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-center overflow-hidden">
      <div className="gili-glass-menu-divider h-px w-full" />
    </div>
  );
}

interface GlassMenuItemProps {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Renders the trailing check. Omit entirely for rows that are actions, not choices. */
  selected?: boolean;
}

/*
 * A row is two nested boxes: the outer owns the hit area, the inner owns the
 * highlight and its rounded corners.
 *
 * The outer box carries NO horizontal padding. The inset comes from the
 * popover's own 8px, and when the row added another 8px on top the highlight
 * sat 16px from the panel edge instead of 8px. Padding belongs to the
 * container here, not to every row inside it.
 */
export function GlassMenuItem({
  icon: Icon,
  children,
  onClick,
  destructive = false,
  disabled = false,
  selected,
}: GlassMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role={selected === undefined ? undefined : "menuitemradio"}
      aria-checked={selected}
      className="group/row w-full text-left focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2 py-1 text-base font-bold leading-[1.38] transition-colors",
          "group-hover/row:bg-white/10 group-focus-visible/row:bg-white/10",
          "group-disabled/row:bg-transparent",
          destructive ? "text-[var(--pp-text-alert)]" : "text-[var(--pp-text-static-white)]"
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1">
          {Icon && <Icon className="size-5 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </span>
        {selected && <Check className="size-5 shrink-0" />}
      </span>
    </button>
  );
}
