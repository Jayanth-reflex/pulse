"use client";

import useSWR from "swr";
import type { SourceSlug } from "../types";
import type { Catalog, Snapshot, IndicatorData, CatalogEntry } from "./types";

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// Snapshots change at most every 6h (CI cron) → cache hard within a session.
const SNAP = { dedupingInterval: 3_600_000, revalidateOnFocus: false };

export function useCatalog() {
  return useSWR<Catalog>("/data/catalog.json", jsonFetcher, SNAP);
}

/** Load a per-source snapshot. disease.sh has no snapshot (live). */
export function useSnapshot(source: SourceSlug | null) {
  return useSWR<Snapshot>(
    source && source !== "diseasesh" ? `/data/snap/${source}.json` : null,
    jsonFetcher,
    SNAP,
  );
}

export interface IndicatorResult {
  data: IndicatorData | undefined;
  error: Error | undefined;
  loading: boolean;
}

/** Resolve one catalog entry to its full data from the right snapshot. */
export function useIndicator(entry: CatalogEntry | null): IndicatorResult {
  const snap = useSnapshot(entry?.source ?? null);
  if (!entry) return { data: undefined, error: undefined, loading: false };
  const data = snap.data?.indicators?.[entry.id];
  return {
    data,
    error: snap.error as Error | undefined,
    loading: !snap.data && !snap.error,
  };
}
