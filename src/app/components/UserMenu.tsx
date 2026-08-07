import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { GlassMenu, GlassMenuDivider } from "./GlassMenu";
import { Button } from "./ui/button";
import { HandWave } from "./icons/HandWave";
import { ChevronSelectorVertical } from "./icons/figma";
import { Moon, Sun } from "./icons";
import { cn } from "./ui/utils";
import { APP_VERSION } from "../version";
import { useTheme } from "../utils/useTheme";
import { useSuperuser } from "../context/SuperuserContext";

interface UserMenuProps {
  /** Icon-only when the sidebar is collapsed. */
  collapsed?: boolean;
  onRequestLogin: () => void;
  onManageAssets: () => void;
  onOpenAbout: () => void;
}

/**
 * Sidebar footer identity chip and its popover.
 *
 * This is where 2.0 consolidates three things that used to be separate sidebar
 * controls in 1.x: the Superuser entry point, the dark-mode toggle, and the
 * version label that opened About.
 */
export function UserMenu({
  collapsed = false,
  onRequestLogin,
  onManageAssets,
  onOpenAbout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { unlocked, lock } = useSuperuser();

  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unlocked ? "Superuser menu" : "Guest menu"}
          className={cn(
            "flex items-center rounded-xl transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            // Collapsed is the bare avatar — no plate, no stroke, no superuser
            // gradient. The rail is 60px of icons, and a filled chip at the foot
            // read as a fifth nav item rather than as the person using the app.
            // The button keeps its 32px box for the hit area; only the surface
            // goes.
            collapsed
              ? "size-8 justify-center bg-transparent p-0 hover:bg-transparent"
              : unlocked
                ? "gili-user-trigger-super w-full gap-2.5 px-2 py-2.5"
                : "w-full gap-2.5 border-[0.8px] border-[var(--pp-stroke-light)] bg-card px-2 py-2.5 hover:bg-accent/50"
          )}
        >
          <Avatar superuser={unlocked} size={collapsed ? 32 : 24} />
          {!collapsed && (
            <>
              <span
                className={
                  unlocked
                    ? "min-w-0 flex-1 truncate text-left text-base font-bold text-white"
                    : "min-w-0 flex-1 truncate text-left text-base font-bold text-[var(--pp-text-high)]"
                }
              >
                {unlocked ? "Superuser!" : "Guest user"}
              </span>
              <ChevronSelectorVertical
                className={
                  unlocked
                    ? "size-5 shrink-0 text-white"
                    : "size-5 shrink-0 text-[var(--pp-icon-low)]"
                }
              />
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-52"
      >
        {/* 16px on all four edges, and it is assembled from two places.
            Vertical comes from PopoverContent's own py-4. Horizontal is
            GlassMenu's px-2 (8px) plus each row's px-2 (8px). The rows carried
            px-4 before, which put content 24px from the edge — visibly wider
            than the top and bottom. */}
        <GlassMenu>
          <div className="flex w-full flex-col gap-3 pb-2">
            <p className="flex items-center gap-2 px-2 text-base text-white">
              <HandWave className="size-6 shrink-0" />
              {unlocked ? (
                <span className="font-bold">SuperUser!</span>
              ) : (
                <span>
                  Wasup, <span className="font-bold">Guest!</span>
                </span>
              )}
            </p>

            <div className="px-2">
              {/* The design gives these two the same geometry as a Med button
                  and differentiates them by stroke, so they are Buttons rather
                  than the hand-rolled element that used to sit here with a flat
                  1px border and no gradient. */}
              <Button
                variant={unlocked ? "brand" : "default"}
                className="w-full"
                onClick={() => {
                  close();
                  if (unlocked) onManageAssets();
                  else onRequestLogin();
                }}
              >
                {unlocked ? "Manage asset" : "Login Superuser!"}
              </Button>
            </div>

            {unlocked && (
              <div className="px-2">
                <button
                  type="button"
                  onClick={() => {
                    lock();
                    close();
                  }}
                  className="text-sm text-white/60 underline transition-colors hover:text-white"
                >
                  Lock session
                </button>
              </div>
            )}
          </div>

          <GlassMenuDivider />

          <div className="flex w-full items-center gap-3 px-2">
            <p className="min-w-0 flex-1 text-base font-bold text-white">Theme</p>
            <div className="flex w-16 items-center justify-center gap-1 rounded-full bg-[var(--pp-n800,#303135)] p-1">
              <ThemeOption
                label="Light"
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon={Sun}
              />
              <ThemeOption
                label="Dark"
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={Moon}
              />
            </div>
          </div>

          <GlassMenuDivider />

          <button
            type="button"
            onClick={() => {
              close();
              onOpenAbout();
            }}
            className="flex w-full flex-col items-start gap-0.5 px-2 text-left transition-colors hover:text-white/80"
          >
            <span className="text-base font-bold text-white">About</span>
            <span className="text-sm text-white">GILI v{APP_VERSION}</span>
          </button>
        </GlassMenu>
      </PopoverContent>
    </Popover>
  );
}

function ThemeOption({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} mode`}
      aria-pressed={active}
      className={cn(
        // The horizontal padding is gone rather than reduced: a 20px glyph plus
        // the old px-2 came to 36px, which does not fit the 26px the track
        // allows for each half. The pill is now sized to the glyph.
        "flex size-[26px] items-center justify-center rounded-full transition-colors",
        active ? "bg-[var(--pp-n700,#4d4f56)] text-white" : "text-white/60 hover:text-white"
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

/**
 * A small orb that shifts with the role: yellow for Superuser, blue for Guest.
 *
 * These are supplied artwork rather than CSS gradients, and they already carry
 * their own light ring — adding a border here would draw a second one just
 * outside it. They live in public/assets/avatar/ so Vite copies them through
 * untouched and they resolve at /assets/avatar/ in the build.
 */
function Avatar({ superuser, size = 24 }: { superuser: boolean; size?: 24 | 32 }) {
  return (
    <img
      src={superuser ? "/assets/avatar/superuser.png" : "/assets/avatar/guest.png"}
      alt=""
      width={size}
      height={size}
      // 32px collapsed so the orb matches the GILI mark at the top of the rail —
      // they are the only two round-ish objects in that column, and at 24px the
      // avatar read as an afterthought below a larger logo.
      // Literal class names, not `size-${n}`: Tailwind purges interpolated ones.
      className={cn("block shrink-0 rounded-full", size === 32 ? "size-8" : "size-6")}
    />
  );
}
