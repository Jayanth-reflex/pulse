/**
 * Pulse internal schema — the small normalized model every source maps into.
 * Sources (disease.sh, OWID, World Bank, WHO GHO, WHO DON) all reduce to these.
 */

export type CategoryKey =
  | "respiratory"
  | "communicableOther"
  | "enteric"
  | "vectorBorne"
  | "hemorrhagic"
  | "vaccinePreventable"
  | "chronicNCD"
  | "riskFactor"
  | "maternalChild"
  | "mentalHealth"
  | "injuries"
  | "environmental"
  | "healthSystem";

export type SourceTag = "disease.sh" | "OWID" | "World Bank" | "WHO GHO";

/** Snapshot source slugs used in /public/data/catalog.json + snap files. */
export type SourceSlug = "who" | "worldbank" | "owid" | "diseasesh";

export interface Category {
  key: CategoryKey;
  label: string;
  /** Tailwind/CSS accent token name, e.g. "jade". */
  accent: string;
  /** Resolved hex (for canvas / WebGL where CSS vars aren't available). */
  hex: string;
  blurb: string;
}

export interface Country {
  iso3: string;
  iso2?: string;
  name: string;
  lat: number;
  long: number;
  continent?: string;
  population?: number;
}

/** A single annual observation for a place. */
export interface MetricPoint {
  iso3: string;
  year: number;
  value: number;
}

/** A single point in a time series (daily or yearly). `date` is ISO yyyy-mm-dd. */
export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Outbreak {
  id: string;
  disease: string;
  category: CategoryKey;
  country: string;
  iso3: string;
  lat: number;
  long: number;
  date: string;
  status: string;
  /** Editorial 1–5 severity index (NOT a case count). */
  severity: number;
  headline: string;
  url: string;
}

/** Per-country datum projected onto the globe. */
export interface GlobeDatum {
  country: Country;
  value: number;
  cases: number;
  deaths: number;
  active: number;
  casesPerMillion: number;
  deathsPerMillion: number;
}
