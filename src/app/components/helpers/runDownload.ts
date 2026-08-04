/**
 * The one place that turns a download outcome into user-facing feedback.
 *
 * Shared by the card overlay and the detail panel so the two never disagree about
 * what happened — in particular, so neither of them can claim "Downloaded!" when
 * the file was actually just opened in a tab, which is what the old card code did.
 */
import { downloadAsset } from '../../utils/download';
import { type Asset } from '../../utils/appwriteApi';

type Toast = {
  success: (msg: string, opts?: { description?: string; duration?: number }) => void;
  info: (msg: string, opts?: { description?: string; duration?: number }) => void;
  error: (msg: string, opts?: { description?: string; duration?: number }) => void;
};

export async function runDownload(asset: Asset, toast: Toast): Promise<void> {
  const result = await downloadAsset(asset.url_lightroom, asset.nama_file || asset.asset_name);

  if (result.status === 'saved') {
    toast.success('Saved to your device', { description: result.filename });
    return;
  }

  if (result.status === 'opened-instead') {
    // Deliberately honest. The person needs to know an extra step is required,
    // otherwise they go looking in their Downloads folder for a file that was
    // never written.
    toast.info('Opened in a new tab', {
      description:
        "This image is served from another domain that doesn't allow direct saving, so save it from the tab instead (long-press on mobile, right-click on desktop).",
      duration: 7000,
    });
    return;
  }

  toast.error("Couldn't open the asset", {
    description: 'Check that pop-ups are allowed for this site, then try again.',
    duration: 6000,
  });
}
