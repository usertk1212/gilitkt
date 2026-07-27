/**
 * Search for the asset library.
 *
 * ── THE PROBLEM WITH THE OLD BEHAVIOUR ─────────────────────────────────────────
 * It substring-matched the entire query against the whole filename, so searching
 * "train blue" found nothing in a library full of `tds_ic_train_blue` — because the
 * filename has an underscore where the query has a space. Every multi-word search
 * failed against exactly the naming convention this library uses.
 *
 * ── SEMANTICS ──────────────────────────────────────────────────────────────────
 * A query is split into two kinds of token:
 *
 *   plain words   AND — every one must match. Typing narrows.
 *   #tag tokens   OR  — at least one must match. Clicking chips broadens.
 *
 * The two groups are then AND'd together:
 *
 *   train blue            contains "train" AND "blue"
 *   #tds #refund          tagged Tds OR Refund
 *   train #tds #refund    contains "train", AND (tagged Tds OR Refund)
 *
 * That split exists because typing and clicking express different intents: you
 * type to find one specific asset, and you click chips to gather a group. Making
 * both AND would mean two chips almost always return nothing; making both OR would
 * mean "train blue" returns everything containing either word.
 *
 * Word boundaries: `_`, `-`, `.` and whitespace are all treated as separators, so
 * `tds_ic_train_blue` is searchable as "tds ic train blue". Matching is substring
 * per term, so "trai" still finds "train" — forgiving of half-typed words.
 */
import type { Asset } from './appwriteApi';

/** Marks a token as a tag filter rather than a plain word. */
export const TAG_PREFIX = '#';

export interface ParsedQuery {
  /** Plain words. All must match. */
  terms: string[];
  /** #tag tokens, without the prefix. At least one must match, if any exist. */
  tags: string[];
}

/**
 * Turn a filename or label into a space-separated, lowercase haystack.
 *
 * `tds_ic_train_blue.png` -> `tds ic train blue png`
 */
export function normalizeForSearch(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseQuery(query: string): ParsedQuery {
  const terms: string[] = [];
  const tags: string[] = [];

  for (const raw of (query || '').trim().split(/\s+/)) {
    if (!raw) continue;

    const isTag = raw.startsWith(TAG_PREFIX);
    const body = isTag ? raw.slice(TAG_PREFIX.length) : raw;

    // Normalise the QUERY the same way as the haystack, then split.
    //
    // Without this, pasting a filename straight into the box found nothing: the
    // haystack had become "tds ic train blue" while the term was still the literal
    // "tds_ic_train_blue", so the substring test could never succeed. Copying a
    // filename and searching it is an obvious thing to do, and it silently failed.
    const words = normalizeForSearch(body).split(' ').filter(Boolean);

    for (const word of words) {
      if (isTag) {
        if (!tags.includes(word)) tags.push(word);
      } else if (!terms.includes(word)) {
        terms.push(word);
      }
    }
  }

  return { terms, tags };
}

/** True when the query has nothing to filter by. */
export function isEmptyQuery(parsed: ParsedQuery): boolean {
  return parsed.terms.length === 0 && parsed.tags.length === 0;
}

/**
 * Everything about an asset that search should look at, as one normalised string.
 *
 * Fields are guarded because rows added by hand in the Appwrite console can be
 * missing values, and one incomplete row shouldn't break search for the whole
 * library.
 */
function haystack(asset: Asset): string {
  return normalizeForSearch(
    [asset.nama_file, asset.asset_name, asset.type].filter(Boolean).join(' ')
  );
}

export function matchesParsedQuery(asset: Asset, parsed: ParsedQuery): boolean {
  if (isEmptyQuery(parsed)) return true;

  const hay = haystack(asset);

  // Plain words: every one must appear somewhere.
  for (const term of parsed.terms) {
    if (!hay.includes(term)) return false;
  }

  // Tags: any one is enough. Matched against whole words, so #tds doesn't also
  // match a filename containing "tdsomething" — a chip stands for a specific
  // segment of the name, not an arbitrary substring.
  if (parsed.tags.length > 0) {
    const words = new Set(hay.split(' '));
    if (!parsed.tags.some((tag) => words.has(tag))) return false;
  }

  return true;
}

/** Filter a list of assets by a raw query string. */
export function searchAssetList(assets: Asset[], query: string): Asset[] {
  const parsed = parseQuery(query);
  if (isEmptyQuery(parsed)) return assets;
  return assets.filter((asset) => matchesParsedQuery(asset, parsed));
}

// ── Chip helpers ──────────────────────────────────────────────────────────────

/** Is this tag currently switched on in the query? Case-insensitive. */
export function isTagActive(query: string, tag: string): boolean {
  return parseQuery(query).tags.includes(tag.toLowerCase());
}

/**
 * Add or remove a tag token, preserving everything else the user typed.
 *
 * Rebuilding the string rather than patching it keeps spacing tidy no matter how
 * the query was assembled, and makes toggling exactly reversible — clicking a chip
 * twice returns the query to what it was.
 */
export function toggleTagInQuery(query: string, tag: string): string {
  const wanted = tag.toLowerCase();
  const plainWords: string[] = [];
  const tagWords: string[] = [];

  for (const raw of (query || '').trim().split(/\s+/)) {
    if (!raw) continue;
    if (raw.startsWith(TAG_PREFIX)) {
      const existing = raw.slice(TAG_PREFIX.length).toLowerCase();
      if (!existing) continue;
      if (existing === wanted) continue; // drop it — this is the toggle-off case
      if (!tagWords.includes(existing)) tagWords.push(existing);
    } else {
      plainWords.push(raw);
    }
  }

  const wasActive = isTagActive(query, tag);
  if (!wasActive) tagWords.push(wanted);

  // Typed words first, then tags — so the part being edited stays where the
  // cursor expects it and the chips read as a trailing filter list.
  return [...plainWords, ...tagWords.map((t) => TAG_PREFIX + t)].join(' ');
}

/** Tags currently switched on, for highlighting chips. */
export function activeTags(query: string): string[] {
  return parseQuery(query).tags;
}
