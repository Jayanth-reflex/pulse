import type { MetricPoint } from "../types";

/**
 * WHO Global Health Observatory — committed snapshot at /data/who-gho.json.
 * GHO's OData API sends no CORS headers, so the browser can't fetch it directly;
 * the snapshot is refreshed server-side via scripts/refresh-who-gho.mjs.
 */
interface RawIndicator {
  code: string;
  label: string;
  unit: string;
  latestYear: number;
  global: { year: number; value: number } | null;
  points: { iso3: string; year: number; value: number }[];
}

interface RawSnapshot {
  source: string;
  sourceUrl: string;
  asOf: string;
  indicators: Record<string, RawIndicator>;
}

export interface WhoIndicator {
  code: string;
  label: string;
  unit: string;
  latestYear: number;
  global: { year: number; value: number } | null;
  points: MetricPoint[];
}

export interface WhoGho {
  asOf: string;
  lifeExpectancy: WhoIndicator;
  measlesCoverage: WhoIndicator;
}

export async function fetchWhoGho(): Promise<WhoGho> {
  const res = await fetch("/data/who-gho.json");
  if (!res.ok) throw new Error(`WHO GHO snapshot ${res.status}`);
  const snap = (await res.json()) as RawSnapshot;
  return {
    asOf: snap.asOf,
    lifeExpectancy: snap.indicators.WHOSIS_000001,
    measlesCoverage: snap.indicators.MCV2,
  };
}
