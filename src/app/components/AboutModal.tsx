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
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Present for screen readers; the visible design has no header. */}
        <DialogTitle className="sr-only">About GILI</DialogTitle>
        <DialogDescription className="sr-only">
          GILI version {APP_VERSION}, crafted and developed with JOY.
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

        <div className="px-6 py-5 text-center">
          <p className="text-sm text-muted-foreground">Crafted &amp; developed with JOY</p>
          <p className="mt-1 text-xs text-muted-foreground/70">GILI v{APP_VERSION}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
