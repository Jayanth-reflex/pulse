import { csvParse } from "d3-dsv";
import type { MetricPoint, SeriesPoint } from "../types";

/**
 * Our World in Data — grapher CSVs, CORS-enabled (`ACAO: *`), fetched live.
 * URL shape: https://ourworldindata.org/grapher/<slug>.csv
 * We request short column names so the value column is stable per dataset.
 */
const BASE = "https://ourworldindata.org/grapher";
const WORLD_CODE = "OWID_WRL";
const ISO3 = /^[A-Z]{3}$/;

export interface OwidDataset {
  label: string;
  unit: string;
  /** Latest year per real country (ISO3). */
  points: MetricPoint[];
  /** World time series, ascending by year. */
  worldSeries: SeriesPoint[];
  latestYear: number;
  latestWorld: number | null;
}

export interface OwidSpec {
  slug: string;
  col: string;
  label: string;
  unit: string;
}

/** Registry of the redistributable OWID datasets Pulse uses. */
export const OWID: Record<string, OwidSpec> = {
  lifeExpectancy: {
    slug: "life-expectancy",
    col: "life_expectancy_0",
    label: "Life expectancy",
    unit: "years",
  },
  childMortality: {
    slug: "child-mortality",
    col: "child_mortality_rate",
    label: "Child mortality",
    unit: "% of children",
  },
  maternalMortality: {
    slug: "maternal-mortality",
    col: "mmr",
    label: "Maternal mortality ratio",
    unit: "per 100k births",
  },
  tbDeathRate: {
    slug: "tuberculosis-death-rate",
    col: "e_mort_100k",
    label: "Tuberculosis death rate",
    unit: "per 100k",
  },
  dtp3: {
    slug: "share-of-children-immunized-dtp3",
    col: "coverage__antigen_dtpcv3",
    label: "DTP3 immunization coverage",
    unit: "%",
  },
};

export async function fetchOwid(spec: OwidSpec): Promise<OwidDataset> {
  const url = `${BASE}/${spec.slug}.csv?csvType=full&useColumnShortNames=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OWID ${res.status} for ${spec.slug}`);
  const rows = csvParse(await res.text());

  const latestByIso = new Map<string, MetricPoint>();
  const world: SeriesPoint[] = [];

  for (const row of rows) {
    const code = row.code as string | undefined;
    const yearN = Number(row.year);
    const raw = row[spec.col];
    if (raw === "" || raw == null || !Number.isFinite(yearN)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    if (code === WORLD_CODE) {
      world.push({ date: String(yearN), value });
      continue;
    }
    if (!code || !ISO3.test(code)) continue;
    const prev = latestByIso.get(code);
    if (!prev || yearN > prev.year) {
      latestByIso.set(code, { iso3: code, year: yearN, value });
    }
  }

  world.sort((a, b) => Number(a.date) - Number(b.date));
  const points = [...latestByIso.values()];
  const latestYear = points.reduce((m, p) => Math.max(m, p.year), 0);

  return {
    label: spec.label,
    unit: spec.unit,
    points,
    worldSeries: world,
    latestYear,
    latestWorld: world.length ? world[world.length - 1].value : null,
  };
}
