/**
 * A local estimate of database reads used this month.
 *
 * Appwrite bills reads per ROW, and the console only shows the figure after the
 * fact — by which point you may already be locked out for the rest of the billing
 * period, as happened. This counts rows as they're fetched so the number is
 * visible before it becomes a problem.
 *
 * It is an ESTIMATE, and deliberately a floor:
 *   - It only sees reads made by this browser. Other people's visits, and
 *     anything done in the Appwrite console, are invisible here.
 *   - It resets on the 1st of the calendar month, whereas Appwrite resets on your
 *     billing date, so the two windows don't line up exactly.
 *
 * Treat it as "am I about to do something expensive", not as the bill.
 */
import { localSettingGet, localSettingSet } from './assetStore';

const KEY = 'read_budget';
/** Free-plan allowance, for context in the UI. */
export const FREE_PLAN_MONTHLY_READS = 500_000;

interface Budget {
  /** "2026-07" — the month these counts belong to. */
  month: string;
  rows: number;
  /** Individual listDocuments/getDocument calls, for spotting chatty code. */
  calls: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

let cached: Budget | null = null;
const listeners = new Set<(b: Budget) => void>();

async function load(): Promise<Budget> {
  if (cached && cached.month === currentMonth()) return cached;
  const stored = await localSettingGet<Budget>(KEY);
  cached =
    stored && stored.month === currentMonth()
      ? stored
      : { month: currentMonth(), rows: 0, calls: 0 };
  return cached;
}

/**
 * Record that `rows` documents were read from the database.
 *
 * Appwrite counts a query returning nothing as one operation, so an empty result
 * still costs 1.
 */
export async function countReads(rows: number): Promise<void> {
  try {
    const budget = await load();
    budget.rows += Math.max(rows, 1);
    budget.calls += 1;
    cached = budget;
    listeners.forEach((fn) => fn(budget));
    await localSettingSet(KEY, budget);
  } catch {
    // Metering must never break a working read.
  }
}

export async function getReadBudget(): Promise<{ month: string; rows: number; calls: number; percentOfFree: number }> {
  const b = await load();
  return { ...b, percentOfFree: (b.rows / FREE_PLAN_MONTHLY_READS) * 100 };
}

export function onReadBudgetChange(fn: (b: Budget) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function resetReadBudget(): Promise<void> {
  cached = { month: currentMonth(), rows: 0, calls: 0 };
  await localSettingSet(KEY, cached);
}
