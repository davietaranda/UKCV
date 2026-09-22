import "server-only";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

/** Parses a free-text employment date ("September 2017", "Sept 2017",
 * "09/2017", "2017", "Present", "Till Date", ...) into a sortable
 * year*12+month number. Returns null for anything it can't confidently
 * parse, so the caller can fall back to stable original order instead of
 * guessing wrong. */
function parseMonthYear(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (/present|till date|to date|current|ongoing|now/.test(t)) {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }

  const monthYear = t.match(/([a-z]+)\.?\s+(\d{4})/);
  if (monthYear) {
    const idx = MONTHS.findIndex((m) => monthYear[1].startsWith(m));
    if (idx !== -1) return parseInt(monthYear[2], 10) * 12 + idx;
  }

  const numeric = t.match(/^(\d{1,2})[/-](\d{4})$/);
  if (numeric) return parseInt(numeric[2], 10) * 12 + (parseInt(numeric[1], 10) - 1);

  const yearOnly = t.match(/^(\d{4})$/);
  if (yearOnly) return parseInt(yearOnly[1], 10) * 12;

  return null;
}

/**
 * Sorts employment/experience entries most-recent-first (standard UK CV
 * convention) by end date, falling back to start date for ongoing roles.
 * Neither the CV builder (jobs can be added in any order) nor AI
 * extraction/tailoring reliably preserves chronological order — this is a
 * deterministic safety net applied after both, rather than relying on the
 * AI to get it right. A stable sort: entries with unparseable dates keep
 * their original relative position instead of being shuffled on a guess.
 */
export function sortByRecency<T extends { startDate?: string | null; endDate?: string | null }>(
  entries: T[]
): T[] {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      key: parseMonthYear(entry.endDate) ?? parseMonthYear(entry.startDate),
    }))
    .sort((a, b) => {
      if (a.key === null && b.key === null) return a.index - b.index;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      if (b.key !== a.key) return b.key - a.key;
      return a.index - b.index;
    })
    .map((x) => x.entry);
}
