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
