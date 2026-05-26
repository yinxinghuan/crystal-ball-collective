// Day-key helpers — anchor the once-per-day rule on UTC midnight so the
// behavior is identical across timezones.

export function todayKey(): string {
  const d = new Date();
  return ymd(d);
}

export function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pretty short date e.g. "MAR 14". For card stamps + archive list. */
export function prettyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1];
  return `${month} ${String(d).padStart(2, '0')}`;
}

/** Pretty date with year e.g. "MAR 14, 2026". For card detail view. */
export function prettyFullDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1];
  return `${month} ${String(d).padStart(2, '0')}, ${y}`;
}
