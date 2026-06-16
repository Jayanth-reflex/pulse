import type { CategoryKey, SourceSlug } from "../types";

/** One indicator's metadata in /public/data/catalog.json. */
export interface CatalogEntry {
  id: string;
  name: string;
  category: CategoryKey;
  unit: string;
  source: SourceSlug;
  latestYear: number | null;
  countries?: number;
  hasSeries?: boolean;
  live?: boolean;
}

export interface Catalog {
  asOf: string;
  count: number;
  indicators: CatalogEntry[];
}

export interface CountryPoint {
  iso3: string;
  year: number;
  value: number;
}

export interface YearPoint {
  year: number;
  value: number;
}

/** One indicator's data in a per-source snapshot file. */
export interface IndicatorData {
  name: string;
  category: CategoryKey;
  unit: string;
  source: SourceSlug;
  latestYear: number;
  globalLatest: YearPoint | null;
  globalSeries: YearPoint[];
  points: CountryPoint[];
}

export interface Snapshot {
  source: SourceSlug;
  asOf: string;
  indicators: Record<string, IndicatorData>;
}
