import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Image } from "./icons";
import { APP_VERSION } from "../version";
import { getAboutImage } from "../utils/appwriteApi";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * "About GILI" — opened by clicking the version label in the sidebar footer.
 *
 * The 3:2 area is a placeholder for now. To drop in the real artwork, put the
 * file in `public/` and swap the placeholder block for:
 *   <img src="/about-cover.png" alt="" className="h-full w-full object-cover" />
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [image, setImage] = useState<string | null>(null);

  // Fetched only when the dialog opens, not on app start — it's a one-row read
  // that nobody needs to pay for on every page load.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getAboutImage().then((url) => {
      if (!cancelled) setImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          // 360 wide, 12px radius, no padding or border — the artwork runs edge
          // to edge, and the design draws no stroke on the card. The radius is
          // literal because globals.css pins the whole rounded-* ladder to the
          // system's single 8px value, so rounded-xl would render at 8 here.
              "h-[349px] w-[420px] max-w-[420px] gap-0 overflow-hidden rounded-[12px] border-0 p-0 " +
          // The stock close sits at 16px with a 16px glyph. The design puts it
          // in a 12px-padded header over the artwork at 20px. It is the only
          // direct-child button here, hence the child selector; the important
          // modifier is needed because the primitive's own size rule would
          // otherwise win on source order.
          "[&>button]:right-3 [&>button]:top-3 [&>button_svg]:size-5!"
        }
      >
        {/* Present for screen readers; the visible design has no header. */}
        <DialogTitle className="sr-only">About GILI</DialogTitle>
        <DialogDescription className="sr-only">
          GILI version {APP_VERSION}, crafted and developed with JOY.
          {/* The visible line carries a ✶ after JOY. Left out here on purpose:
              a screen reader announces it as "black six pointed star", which is
              noise in the middle of a sentence. */}
        </DialogDescription>

        {/* 3:2 artwork, uploaded via Superuser → About Image.
            Falls back to the placeholder when nothing is saved. */}
        {image ? (
          <img src={image} alt="" className="aspect-[3/2] w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/2] w-full items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Image className="h-10 w-10" />
              <span className="text-xs">Image placeholder · 3:2</span>
            </div>
          </div>
        )}

        <div className="flex w-full flex-col items-center justify-center gap-[3px] py-3 text-center">
          <p className="w-full px-[18px] text-base leading-[1.38] text-[var(--pp-text-high)]">
            Crafted &amp; developed with{" "}
            {/* Only "JOY ✶" is bold, and aria-hidden on the star so the
                sentence reads cleanly aloud — see the DialogDescription above,
                which carries the spoken version. */}
            <span className="font-bold">
              JOY <span aria-hidden="true">✶</span>
            </span>
          </p>
          <p className="w-full px-[18px] font-sans text-sm leading-[1.43] text-[var(--pp-text-low)]">
            GILI v{APP_VERSION}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
