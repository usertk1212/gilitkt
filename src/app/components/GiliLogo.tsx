import { useId } from "react";

/**
 * The GILI logo: a gradient app mark, and the wordmark beside it.
 *
 * ── ONE COMPONENT, NOT TWO FILES ───────────────────────────────────────────────
 * The artwork arrived as "Logo White Font.svg" and "Logo Black Font.svg". Those
 * two files are byte-identical apart from the wordmark's fill, so shipping both
 * would mean carrying a duplicate copy of the mark and adding a theme check to
 * pick between them — a branch that silently goes stale the moment one file is
 * updated and the other isn't.
 *
 * The wordmark uses `currentColor` instead, so it inherits the surrounding text
 * colour and follows light/dark mode for free. The mark keeps its own colours,
 * because those are the brand: the blue gradient and the tiket yellow dot are
 * fixed in both supplied files.
 *
 * NOTE ON OPACITY: the white file sets `fill-opacity="0.8"` on the wordmark while
 * the black file leaves it fully opaque. That reads as an inconsistency in the
 * source artwork rather than an intentional dark-mode treatment, so both render at
 * full opacity here. If the 80% in dark mode WAS deliberate, it belongs on the
 * wordmark group as `className="dark:opacity-80"`.
 */

interface GiliLogoProps {
  /** Sidebar collapsed — show the mark alone, without the wordmark. */
  collapsed?: boolean;
}

/** The app mark. Identical geometry in both supplied files. */
function LogoMark({ gradientId }: { gradientId: string }) {
  return (
    <>
      <path
        d="M9.46667 34H26.5333C30.6571 34 34 30.6571 34 26.5333V9.46667C34 5.34294 30.6571 2 26.5333 2L9.46667 2C5.34294 2 2 5.34294 2 9.46667L2 26.5333C2 30.6571 5.34294 34 9.46667 34Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M15.5464 7.99902C15.9093 7.99902 16.2586 8.13562 16.521 8.38085L18.8765 10.582C19.1388 10.8271 19.4883 10.9638 19.8511 10.9639H27.0893C27.8686 10.9639 28.5005 11.5813 28.5005 12.3428V26.6221C28.5005 27.3836 27.8686 28.001 27.0893 28.001H17.5727C17.2047 28.0009 16.8515 27.8597 16.5884 27.6094L7.92529 19.3584C7.65358 19.0987 7.49962 18.7436 7.49951 18.3721V9.3789C7.49951 8.61736 8.13137 7.99987 8.91064 7.99902H15.5464Z"
        fill="white"
      />
      <path
        d="M21.9995 26.501C25.0371 26.501 27.4995 24.0386 27.4995 21.001C27.4995 17.9634 25.0371 15.501 21.9995 15.501C18.9619 15.501 16.4995 17.9634 16.4995 21.001C16.4995 24.0386 18.9619 26.501 21.9995 26.501Z"
        fill="#FEDD00"
      />
    </>
  );
}

/** The "GILI" wordmark, inheriting the current text colour. */
function LogoWordmark() {
  return (
    <g fill="currentColor">
      <path d="M53.4499 6.21048H55.2385V6.2141C56.7621 6.1818 58.2927 6.42295 59.6926 6.93622C60.9988 7.38592 62.1235 8.03907 63.0657 8.89563C64.0292 9.75217 64.7358 10.7696 65.1854 11.9473L61.2666 13.457C60.7741 12.3864 60.0032 11.5618 58.954 10.9836C57.9047 10.384 56.7375 10.0839 55.4527 10.0839C55.3351 10.0839 55.2187 10.087 55.1035 10.0919V10.0847H53.3434C51.9727 10.0931 50.7584 10.4351 49.701 11.1118C48.6304 11.7971 47.7847 12.7393 47.1638 13.9384C46.5641 15.1162 46.264 16.4869 46.264 18.0501C46.264 19.5919 46.5746 20.9623 47.1955 22.1615C47.8165 23.3606 48.6625 24.3032 49.7332 24.9885C50.792 25.6528 51.9919 25.9937 53.3325 26.014H55.1035V26.0047C55.2398 26.0116 55.3777 26.0164 55.517 26.0164C56.7375 26.0164 57.8297 25.7595 58.7932 25.2456C59.7782 24.7317 60.5491 24.0355 61.1059 23.1576C61.5207 22.4875 61.7495 21.766 61.8585 21.0154C61.9565 20.3408 61.3886 19.785 60.7068 19.7849H55.517V16.0907H66.1491V19.3031C66.149 21.3588 65.6887 23.1792 64.7679 24.7638C63.8685 26.3483 62.6158 27.6011 61.0098 28.5219C59.4038 29.4213 57.5727 29.8709 55.517 29.8709C55.4238 29.8709 55.3309 29.869 55.2385 29.8669V29.8705H53.1493V29.8669C51.6194 29.8328 50.2024 29.5455 48.8981 29.0037C47.5062 28.4041 46.2961 27.5797 45.2682 26.5304C44.2403 25.4596 43.4373 24.2066 42.8591 22.7719C41.7136 19.8199 41.7136 16.28 42.8591 13.328C43.4159 11.8719 44.2083 10.6192 45.2361 9.56993C46.264 8.49923 47.4741 7.67475 48.866 7.09656C50.2022 6.5415 51.672 6.24863 53.1493 6.2137V6.21048H53.4169C53.4279 6.21045 53.4389 6.21048 53.4499 6.21048Z" />
      <path d="M73.4093 29.8709H69.2011V6.21008H73.4093V29.8709Z" />
      <path d="M81.5379 23.7078C81.5379 25.0713 82.6433 26.1767 84.0068 26.1767H94.9038V29.8709H82.268C79.5409 29.8709 77.3301 27.6601 77.3301 24.933V6.21932H81.5379V23.7078Z" />
      <path d="M102 29.8709H97.7922V6.12891H102V29.8709Z" />
    </g>
  );
}

export function GiliLogo({ collapsed = false }: GiliLogoProps) {
  /**
   * A gradient id unique to this instance.
   *
   * SVG `defs` live in the document's global id space, and this logo renders in
   * more than one place at a time (sidebar and dashboard header). With a
   * hardcoded id — which the previous version had — the second instance's
   * gradient resolves to the FIRST matching def still in the DOM, so unmounting
   * that one leaves the other's mark filled with nothing.
   */
  const gradientId = useId();

  const gradient = (
    <defs>
      <linearGradient
        id={gradientId}
        x1="32"
        y1="32"
        x2="5.5"
        y2="3.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#A7CAFF" />
        <stop offset="0.360228" stopColor="#0062F6" />
        <stop offset="1" />
      </linearGradient>
    </defs>
  );

  if (collapsed) {
    // A cropped viewBox rather than a separate icon-only asset, so the mark can
    // never drift out of sync with the full lockup.
    return (
      <div className="relative size-8 shrink-0" data-name="Gili Logo">
        <svg
          className="block size-full"
          viewBox="2 2 32 32"
          fill="none"
          role="img"
          aria-label="GILI"
        >
          <LogoMark gradientId={gradientId} />
          {gradient}
        </svg>
      </div>
    );
  }

  return (
    <div className="flex items-center text-foreground" data-name="Gili Logo">
      {/* h-8 w-auto keeps the supplied 104:36 lockup ratio instead of stretching
          the mark and wordmark independently, which the old two-svg layout did. */}
      <svg
        className="block h-8 w-auto"
        viewBox="0 0 104 36"
        fill="none"
        role="img"
        aria-label="GILI"
      >
        <LogoMark gradientId={gradientId} />
        <LogoWordmark />
        {gradient}
      </svg>
    </div>
  );
}
