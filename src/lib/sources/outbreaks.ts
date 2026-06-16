import type { Outbreak } from "../types";

/**
 * WHO Disease Outbreak News — committed snapshot at /data/outbreaks.json.
 * WHO DON has no clean public API or CORS feed, so this is a curated dated
 * snapshot. `severity` is an editorial 1–5 index, not a case count.
 */
interface RawSnapshot {
  source: string;
  sourceUrl: string;
  asOf: string;
  outbreaks: Outbreak[];
}

export interface OutbreakFeed {
  asOf: string;
  source: string;
  sourceUrl: string;
  outbreaks: Outbreak[];
}

export async function fetchOutbreaks(): Promise<OutbreakFeed> {
  const res = await fetch("/data/outbreaks.json");
  if (!res.ok) throw new Error(`outbreaks snapshot ${res.status}`);
  const snap = (await res.json()) as RawSnapshot;
  const outbreaks = [...snap.outbreaks].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );
  return {
    asOf: snap.asOf,
    source: snap.source,
    sourceUrl: snap.sourceUrl,
    outbreaks,
  };
}
