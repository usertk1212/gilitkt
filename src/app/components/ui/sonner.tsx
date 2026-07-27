import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "../../utils/useTheme";
import { useIsMobile } from "./use-mobile";
import { useUploadJob } from "../../context/UploadJobContext";

/**
 * Toast host.
 *
 * MUST be rendered once, near the root. It wasn't — for a long time. Every
 * `toast.success(...)` in the app (74 of them: added to project, link copied,
 * import finished, backup downloaded, password changed…) resolved to nothing at
 * all, silently. Adding a toast call to a component looks like it works because
 * nothing errors; the notification simply never appears.
 *
 * ── POSITION ───────────────────────────────────────────────────────────────────
 * Desktop: bottom-right, out of the way of the content.
 *
 * Mobile: top-centre instead, because the bottom of a phone screen is already
 * spoken for — the fixed pagination bar sits there, and the asset detail sheet
 * covers 85% of the viewport from the bottom up. A bottom-right toast would land
 * underneath both, which is exactly where it can't be read at the moment you most
 * want to read it.
 *
 * The theme comes from the app's own hook, not next-themes: this app has no
 * next-themes provider, so that hook reported "system" no matter what the sidebar
 * toggle said, and toasts could have rendered light while the app was dark.
 */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const job = useUploadJob();

  // The import progress widget is pinned to bottom-4 right-4, i.e. precisely
  // where a bottom-right toast lands. While a job is running, lift the toasts
  // above it rather than stacking them on top of each other. Mobile is unaffected
  // — toasts are at the top there.
  const desktopOffset = job.isActive ? 168 : 24;

  return (
    <Sonner
      theme={theme}
      position={isMobile ? "top-center" : "bottom-right"}
      offset={isMobile ? 12 : desktopOffset}
      closeButton
      richColors
      // Long enough to read a filename and a project name without rushing.
      duration={3500}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
