/**
 * Deriving asset_name and type from a filename.
 *
 * These wrap the functions the CSV importer already uses, so a manually entered
 * asset is indistinguishable from an imported one. Two separate implementations of
 * "what should this be called" is how the two paths would silently drift.
 */
import { generateAssetName, generateTypeFromFilename } from './csvParser';

/**
 * The types the app can actually display.
 *
 * IMPORTANT: these strings are what the sidebar counts. An asset stored with any
 * other value belongs to no category, so it never appears under any section and is
 * effectively invisible — you can only find it by searching. That's why the
 * "Uncategorized" choice stores `Other` rather than the literal word.
 */
export const SELECTABLE_TYPES = [
  { value: 'Spot', label: 'Spot Illustration' },
  { value: 'Micro', label: 'Micro Illustration' },
  { value: 'Icon', label: 'Icon' },
  { value: 'Supergraphic', label: 'Supergraphic' },
  { value: 'Other', label: 'Uncategorized' },
] as const;

export const VALID_TYPE_VALUES = SELECTABLE_TYPES.map((t) => t.value) as readonly string[];

/**
 * Coerce anything into a type the sidebar can see.
 *
 * `generateTypeFromFilename` returns "General" when it can't tell — and "General"
 * is one of those invisible values, counted by no category. Mapping it to "Other"
 * here means manual entries can never land in that hole.
 */
export function normalizeType(type: string | undefined | null): string {
  const t = (type || '').trim();
  return VALID_TYPE_VALUES.includes(t) ? t : 'Other';
}

/** asset_name derived from a filename: drop the extension, underscores to spaces. */
export function deriveAssetName(filename: string): string {
  return generateAssetName((filename || '').trim());
}

/** Best guess at the type from the filename prefix, always a visible value. */
export function detectType(filename: string): string {
  return normalizeType(generateTypeFromFilename((filename || '').trim()));
}

/** Strip whitespace and a leading/trailing quote people paste in by accident. */
export function cleanFilename(value: string): string {
  return (value || '').trim().replace(/^["']|["']$/g, '');
}
