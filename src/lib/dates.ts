// Release dates are stored as calendar dates ("YYYY-MM-DD") with no time or zone.
// `new Date("2026-06-02")` parses that as UTC midnight, which then renders/compares
// one day earlier for any viewer west of UTC (e.g. a Tuesday release shows as Monday).
// Parse the components directly so the date stays put in the viewer's local zone.

export function parseReleaseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatReleaseDate(dateStr: string): string {
  return parseReleaseDate(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Sunday (local midnight) of the calendar week containing `date`.
// getDay(): 0=Sun … 6=Sat, so subtracting getDay() lands on that week's Sunday.
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Local calendar date as "YYYY-MM-DD" — matches how releaseDate is stored, so it
// can be string-compared against release dates without any timezone drift.
export function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
