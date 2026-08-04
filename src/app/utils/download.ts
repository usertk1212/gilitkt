/**
 * Saving an asset to the device.
 *
 * ── WHY THE OBVIOUS VERSION DOESN'T WORK ───────────────────────────────────────
 * The previous implementation was an `<a download>` click:
 *
 *     link.href = asset.url_lightroom;
 *     link.download = asset.nama_file;
 *     link.target = '_blank';
 *     link.click();
 *
 * That looks correct and does nothing. The `download` attribute is IGNORED when
 * the href points at another origin — a same-origin rule browsers enforce so a
 * page can't silently pull files off unrelated domains under a filename of its
 * choosing. The assets live on `s-light.tiket.photos` and the app is served from
 * Vercel, so `download` was always being discarded and the click degraded to plain
 * navigation. `target="_blank"` then guaranteed it opened in a new tab instead of
 * saving, which is exactly what people were seeing.
 *
 * ── WHAT WORKS INSTEAD ─────────────────────────────────────────────────────────
 * Fetch the bytes, wrap them in a Blob, and point the link at a blob: URL. A blob
 * URL IS same-origin, so `download` applies and the browser writes the file with
 * the filename we ask for.
 *
 * The catch: `fetch` across origins needs the server's permission. If
 * s-light.tiket.photos does not send `Access-Control-Allow-Origin`, the fetch is
 * blocked and no amount of client-side code can produce a real download — the
 * only remaining option is to open the image and let the person save it manually.
 * That is what the fallback does, and it says so rather than pretending it worked.
 *
 * If the CDN turns out not to send CORS headers, the fix is one header on their
 * side, or a small same-origin proxy route in front of the app. Not something this
 * file can solve on its own.
 */

/** Best-effort filename: keep the stored one, add an extension if it lacks one. */
function resolveFilename(url: string, preferred: string): string {
  const name = (preferred || '').trim();
  if (name && /\.[a-z0-9]{2,4}$/i.test(name)) return name;

  // Take the extension from the URL's path, ignoring any query string.
  const fromUrl = url.split('?')[0].match(/\.(png|jpe?g|svg|webp|gif)$/i);
  const ext = fromUrl ? fromUrl[0] : '.png';
  return `${name || 'asset'}${ext}`;
}

export type DownloadOutcome =
  /** The file was written to the device. */
  | { status: 'saved'; filename: string }
  /**
   * The bytes could not be fetched (almost always missing CORS headers), so the
   * image was opened in a new tab for manual saving instead.
   */
  | { status: 'opened-instead'; reason: string }
  /** Nothing happened — the popup was blocked too. */
  | { status: 'failed'; reason: string };

export async function downloadAsset(
  url: string,
  preferredFilename: string
): Promise<DownloadOutcome> {
  const filename = resolveFilename(url, preferredFilename);

  try {
    // `cors` explicitly rather than the default: a `no-cors` response would be
    // opaque, and reading it into a Blob yields a zero-byte file that "downloads"
    // successfully and is useless — a silent failure worse than a loud one.
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('Empty response');

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoked on the next tick, not immediately: revoking synchronously after
    // click() can cancel the download in some browsers before it has read the URL.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

    return { status: 'saved', filename };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    return opened
      ? { status: 'opened-instead', reason }
      : { status: 'failed', reason };
  }
}
