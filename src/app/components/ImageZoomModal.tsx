import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoCircle } from "./icons/InfoCircle";
import { RotateRight, SearchMinus, SearchPlus } from "./icons/zoom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./ui/utils";

interface ImageZoomModalProps {
  src: string;
  alt?: string;
  /** Filename shown in the corner, so you know what you're looking at. */
  caption?: string;
  isOpen: boolean;
  onClose: () => void;
  /**
   * `fullscreen` portals a covering overlay to <body>.
   *
   * `docked` renders the stage in place, so it can sit beside the detail panel
   * instead of burying it — the panel is what tells you which asset you are
   * looking at, and covering it was the reason the two could not be read
   * together. In this mode the caller owns the backdrop and the close control.
   */
  variant?: "fullscreen" | "docked";
  className?: string;
}

const MAX_ZOOM = 6;
const STEP = 0.25;

/**
 * Share of the canvas the opening view is allowed to occupy, so the asset has
 * breathing room instead of running to the edges.
 */
const FIT_CAP = 0.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Fullscreen image inspector.
 *
 * Deliberately plain CSS transforms rather than a zoom/pan library — GILI's
 * bundle is already over the 500 kB warning threshold, and this needs ~80 lines.
 *
 * Controls: scroll wheel or +/- to zoom, drag to pan when zoomed in,
 * double-click to toggle 1x/2x, Esc or backdrop click to close.
 */
export function ImageZoomModal({
  src,
  alt,
  // Accepted but not rendered — the label above the zoom controls was removed
  // because the details panel already shows the filename. Kept in the signature
  // so the two call sites in AssetDetailPanel need no change, and so the value is
  // to hand if a future layout wants it.
  caption: _caption,
  isOpen,
  onClose,
  variant = "fullscreen",
  className,
}: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // The readout is 1:1 with the file, so zoom is a multiple of natural pixel
  // size and 100% means 100%. That needs both the image's intrinsic size and
  // the canvas it has to live in, neither of which is known until they exist.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [canvas, setCanvas] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !isOpen) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvas({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  /**
   * The opening scale, and also the floor: fit inside the canvas, never above
   * the file's real resolution, and never past FIT_CAP of the canvas. A 32px
   * icon therefore opens at 100% rather than being blown up to fill the space.
   */
  const fitScale =
    natural && canvas && natural.w > 0 && natural.h > 0
      ? Math.min(1, (canvas.w * FIT_CAP) / natural.w, (canvas.h * FIT_CAP) / natural.h)
      : 1;

  const reset = useCallback(() => {
    setZoom(fitScale);
    setOffset({ x: 0, y: 0 });
  }, [fitScale]);

  // Seat the opening view once per asset, so a previous inspection doesn't leak
  // into the next one.
  //
  // Keyed on the asset rather than on fitScale: fitScale also moves when the
  // canvas resizes, and resetting there would throw away the zoom the user had
  // set every time the window changed size.
  const seatedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      seatedFor.current = null;
      return;
    }
    if (!natural || seatedFor.current === src) return;
    seatedFor.current = src;
    reset();
  }, [isOpen, src, natural, reset]);

  // A fresh asset must not inherit the last one's measurements, or its opening
  // scale is computed from the wrong intrinsic size for a frame.
  useEffect(() => {
    setNatural(null);
  }, [src]);

  const applyZoom = useCallback(
    (next: number) => {
      const z = clamp(next, fitScale, MAX_ZOOM);
      setZoom(z);
      // Snapping back to the floor should also recentre, otherwise the image can
      // be parked off-screen with no visible way to bring it back.
      if (z === fitScale) setOffset({ x: 0, y: 0 });
    },
    [fitScale]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") applyZoom(zoom + STEP);
      if (e.key === "-" || e.key === "_") applyZoom(zoom - STEP);
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, zoom, onClose, applyZoom, reset]);

  // Lock background scroll while the inspector is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    applyZoom(zoom + (e.deltaY < 0 ? STEP : -STEP));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= fitScale) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  /* 32px square: 6px padding around a 20px glyph, a hairline light stroke, and
     a fill that swaps to the backdrop surface when the control is spent. */
  const toolButton =
    "flex size-8 items-center justify-center rounded-lg border-[0.5px] border-[var(--pp-stroke-light)] text-[var(--pp-n700)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pp-stroke-active)]/40 " +
    "bg-[var(--pp-bg-base)] hover:bg-[var(--pp-bg-sunken)] " +
    "disabled:bg-[var(--pp-bg-backdrop)] disabled:text-[var(--pp-n200)] disabled:hover:bg-[var(--pp-bg-backdrop)]";

  const stage = (
    <div
      ref={stageRef}
      className={cn(
        // No surface of its own. The asset floats on the dim the caller paints;
        // a fill, border or radius here would put a card back under it.
        "relative overflow-hidden",
        variant === "docked" ? className : "flex-1"
      )}
      onWheel={onWheel}
      onClick={(e) => e.stopPropagation()}
    >
      {/* The filename label that used to sit above these controls is gone.
          It duplicated the Name field in the details panel a few hundred pixels
          to the right, and it collided with the sidebar logo underneath the
          dimmed overlay. The `caption` prop is still accepted so callers do not
          need changing, and so the value stays available if it is ever wanted
          somewhere that is not already showing it.

          No close button here either: the panel's X is the only close
          affordance, and a second one this far from it read as a different
          action. */}
      <div className="absolute left-2 top-2 z-10 flex w-[172px] items-center gap-1 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => applyZoom(zoom - STEP)}
          disabled={zoom <= fitScale}
          className={toolButton}
          title="Zoom out (-)"
          aria-label="Zoom out"
        >
          <SearchMinus className="size-5" />
        </button>

        {/* Static white, not text-high: this sits on the dim in both themes, so
            a token that flips would disappear in one of them. */}
        <span className="flex-1 text-center font-sans text-base font-bold leading-[1.38] text-[var(--pp-text-static-white)]">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() => applyZoom(zoom + STEP)}
          disabled={zoom >= MAX_ZOOM}
          className={toolButton}
          title="Zoom in (+)"
          aria-label="Zoom in"
        >
          <SearchPlus className="size-5" />
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={zoom === fitScale && offset.x === 0 && offset.y === 0}
          className={toolButton}
          title="Reset (0)"
          aria-label="Reset zoom"
        >
          <RotateRight className="size-5" />
        </button>
      </div>

      <div className="flex size-full items-center justify-center p-4">
        {/* Laid out at the file's intrinsic size and scaled from there, which is
            what lets the readout mean natural pixels. object-contain with
            max-*-full would have fitted the image to the box first, making 100%
            mean "however big it happened to land". */}
        <ImageWithFallback
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            if (img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => applyZoom(zoom > fitScale ? fitScale : 2)}
          className="max-w-none shrink-0 select-none"
          style={{
            width: natural ? `${natural.w}px` : undefined,
            height: natural ? `${natural.h}px` : undefined,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            // No transition while dragging, or panning feels laggy and rubbery.
            transition: isDragging ? "none" : "transform 150ms ease-out",
            cursor: zoom > fitScale ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            // Hidden until measured, otherwise the asset flashes at full
            // intrinsic size for a frame before the opening scale is applied.
            visibility: natural ? "visible" : "hidden",
          }}
        />
      </div>

      {/* Hint row, 16px off the bottom edge and centred on the stage.
          `env(safe-area-inset-bottom)` is added on top so the row clears the home
          indicator on iOS rather than sitting under it. Hidden on narrow stages,
          where it wraps to three lines and eats the image. */}
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 hidden -translate-x-1/2 items-center gap-2 whitespace-nowrap text-base leading-[1.38] text-[var(--pp-text-static-white)] xl:flex">
        <InfoCircle className="size-5 shrink-0" />
        Scroll or pinch to zoom • Drag to pan • Double click to zoom 2x • Esc to close
      </div>
    </div>
  );

  if (variant === "docked") return stage;

  // Portalled to <body> deliberately.
  //
  // position:fixed resolves against the nearest ancestor with a transform,
  // filter or will-change — not the viewport. This modal used to render inside
  // AssetCard, whose <Card> carries `transition-all` and whose image uses
  // `group-hover:scale-105`, so the overlay got trapped inside the card's
  // subtree: it covered only the grid area, left the sidebar undimmed, and let a
  // 600%-scaled image spill outside its stage. A portal takes it out of that
  // subtree entirely.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex bg-black/80 p-3 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {stage}
    </div>,
    document.body
  );
}
