import { useCallback, useEffect, useRef, useState } from "react";
import { X, Plus, MinusIcon, RefreshCw } from "./icons";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ImageZoomModalProps {
  src: string;
  alt?: string;
  /** Filename shown in the corner, so you know what you're looking at. */
  caption?: string;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const STEP = 0.25;

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
export function ImageZoomModal({ src, alt, caption, isOpen, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Reset on open so a previous inspection doesn't leak into the next asset.
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, src, reset]);

  const applyZoom = useCallback((next: number) => {
    const z = clamp(next, MIN_ZOOM, MAX_ZOOM);
    setZoom(z);
    // Snapping back to 1x should also recentre, otherwise the image can be
    // parked off-screen with no visible way to bring it back.
    if (z === MIN_ZOOM) setOffset({ x: 0, y: 0 });
  }, []);

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
    if (zoom <= MIN_ZOOM) return;
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

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-white/70" title={caption}>
          {caption}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyZoom(zoom - STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
            title="Zoom out (-)"
          >
            <MinusIcon className="h-4 w-4" />
          </Button>

          <span className="w-14 text-center text-sm tabular-nums text-white/80">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyZoom(zoom + STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
            title="Zoom in (+)"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
            title="Reset (0)"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-1 h-8 w-8 p-0 text-white hover:bg-white/20"
            title="Tutup (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4"
        onWheel={onWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <ImageWithFallback
          src={src}
          alt={alt}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => applyZoom(zoom > 1 ? 1 : 2)}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            // No transition while dragging, or panning feels laggy and rubbery.
            transition: isDragging ? "none" : "transform 150ms ease-out",
            cursor: zoom > MIN_ZOOM ? (isDragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>

      <p className="pb-3 text-center text-xs text-white/40">
        Scroll buat zoom · drag buat geser · double-click buat toggle 2x · Esc buat nutup
      </p>
    </div>
  );
}
