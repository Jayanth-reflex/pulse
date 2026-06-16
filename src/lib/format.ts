/** Number/date formatting — every figure that reaches the screen rounds here. */

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const grouped = new Intl.NumberFormat("en");

/** 704753890 → "704.8M" */
export const fmtCompact = (n: number): string => compact.format(n);

/** 704753890 → "704,753,890" */
export const fmtInt = (n: number): string => grouped.format(Math.round(n));

export const fmtNum = (n: number, digits = 1): string =>
  n.toLocaleString("en", { maximumFractionDigits: digits });

export const fmtPct = (n: number, digits = 1): string => `${n.toFixed(digits)}%`;

/** +2.4 / -1.1 — for trend deltas. */
export const fmtSigned = (n: number, digits = 1): string =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});
const dayMonthYear = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const fmtMonthYear = (iso: string): string =>
  monthYear.format(new Date(iso));
export const fmtDate = (iso: string): string =>
  dayMonthYear.format(new Date(iso));

/** Slope of the last `window` points as a percent change, for trend arrows. */
export function trendPct(values: number[], window = 14): number {
  if (values.length < 2) return 0;
  const slice = values.slice(-window);
  const first = slice[0];
  const last = slice[slice.length - 1];
  if (!first) return 0;
  return ((last - first) / Math.abs(first)) * 100;
}
