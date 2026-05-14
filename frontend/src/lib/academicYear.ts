/**
 * Academic Year / Session Utilities
 *
 * Context:
 *  - Undergrad: 4 active batches at a time (Year 1–4), plus Year 5 for readmission/extended
 *  - Masters: 1 active batch (Year 1)
 *  - Session format: "YYYY-YY"  e.g. "2021-22"
 *  - Batch: the calendar year the student was admitted  e.g. 2021
 *  - currentYear: 1 | 2 | 3 | 4 | 5  (5 = extended / readmission)
 */

export type ProgramType = 'undergrad' | 'masters';

export const YEAR_LABELS: Record<number, string> = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year',
  5: '5th Year (Extended)',
};

export const YEAR_OPTIONS = [1, 2, 3, 4, 5] as const;

/**
 * Convert a batch year to a session string.
 * e.g. batch=2021 → "2021-22"
 */
export function batchToSession(batch: number): string {
  const shortNext = String(batch + 1).slice(-2);
  return `${batch}-${shortNext}`;
}

/**
 * Convert a session string to a batch year.
 * e.g. "2021-22" → 2021
 */
export function sessionToBatch(session: string): number | null {
  const match = session.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Given a batch year and currentYear, return the expected academic session label.
 * e.g. batch=2021, currentYear=3 → "3rd Year (Batch 2021-22)"
 */
export function getYearLabel(currentYear: number, batch?: number): string {
  const label = YEAR_LABELS[currentYear] ?? `Year ${currentYear}`;
  if (!batch) return label;
  return `${label} (Batch ${batchToSession(batch)})`;
}

/**
 * Given a batch year, compute what year the student SHOULD be in
 * based on the current calendar year.
 * Returns null if it can't be determined.
 */
export function computeExpectedYear(batch: number): number | null {
  const now = new Date();
  // Academic year typically starts in January/February
  // A student admitted in batch year X is in Year 1 during X, Year 2 during X+1, etc.
  const calendarYear = now.getFullYear();
  const expected = calendarYear - batch + 1;
  if (expected < 1) return null;
  return Math.min(expected, 5);
}

/**
 * Build the active batch list for a given reference year.
 * Undergrad: 4 batches (current year - 3 to current year)
 * Masters: 1 batch (current year)
 */
export function getActiveBatches(program: ProgramType = 'undergrad'): number[] {
  const currentYear = new Date().getFullYear();
  if (program === 'masters') return [currentYear];
  // 4 undergrad batches
  return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
}

/**
 * Given a list of members with batch + currentYear, build a
 * session → year → members mapping for the moderator view.
 */
export type BatchSummaryEntry = {
  batch: number;
  session: string;
  currentYear: number;
  yearLabel: string;
  memberCount: number;
};

export function buildBatchSummary(
  members: Array<{ batch: number; currentYear: number }>
): BatchSummaryEntry[] {
  const map = new Map<string, BatchSummaryEntry>();

  for (const m of members) {
    const key = `${m.batch}-${m.currentYear}`;
    if (!map.has(key)) {
      map.set(key, {
        batch: m.batch,
        session: batchToSession(m.batch),
        currentYear: m.currentYear,
        yearLabel: YEAR_LABELS[m.currentYear] ?? `Year ${m.currentYear}`,
        memberCount: 0,
      });
    }
    map.get(key)!.memberCount++;
  }

  return Array.from(map.values()).sort((a, b) =>
    b.batch !== a.batch ? b.batch - a.batch : a.currentYear - b.currentYear
  );
}
