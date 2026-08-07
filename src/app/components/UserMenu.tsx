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
            unlocked
              ? "gili-user-trigger-super"
              : "border-[0.8px] border-[var(--pp-stroke-light)] bg-card hover:bg-accent/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "size-8 justify-center p-0" : "w-full gap-2.5 px-2 py-2.5"
          )}
        >
          <Avatar superuser={unlocked} />
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
        {/* No padding here: PopoverContent already supplies the 16px top and
            bottom, and repeating it on the wrapper doubled it to 32px. */}
        <GlassMenu>
          <div className="flex w-full flex-col gap-3 pb-2">
            <p className="flex items-center gap-2 px-4 text-base text-white">
              <HandWave className="size-6 shrink-0" />
              {unlocked ? (
                <span className="font-bold">SuperUser!</span>
              ) : (
                <span>
                  Wasup, <span className="font-bold">Guest!</span>
                </span>
              )}
            </p>

            <div className="px-4">
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
              <div className="px-4">
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

          <div className="flex w-full items-center gap-3 px-4">
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
            className="flex w-full flex-col items-start gap-0.5 px-4 text-left transition-colors hover:text-white/80"
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
function Avatar({ superuser }: { superuser: boolean }) {
  return (
    <img
      src={superuser ? "/assets/avatar/superuser.png" : "/assets/avatar/guest.png"}
      alt=""
      width={24}
      height={24}
      className="block size-6 shrink-0 rounded-full"
    />
  );
}
