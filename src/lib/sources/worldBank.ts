import type { MetricPoint, SeriesPoint } from "../types";

/**
 * World Bank Indicators API — CORS-enabled (`ACAO: *`), fetched live.
 * Response shape: [meta, rows]. We drop nulls and aggregate regions, keeping
 * real ISO3 countries. World series come from the `WLD` aggregate.
 */
const BASE = "https://api.worldbank.org/v2";
const ISO3 = /^[A-Z]{3}$/;

// World Bank aggregate codes that are NOT countries (regions, income groups).
const AGGREGATES = new Set([
  "WLD", "ARB", "CSS", "CEB", "EAR", "EAS", "EAP", "TEA", "EMU", "ECS", "ECA",
  "TEC", "EUU", "FCS", "HPC", "HIC", "IBD", "IBT", "IDB", "IDX", "IDA", "LTE",
  "LCN", "LAC", "TLA", "LDC", "LMY", "LIC", "LMC", "MEA", "MNA", "TMN", "MIC",
  "NAC", "INX", "OED", "OSS", "PSS", "PST", "PRE", "SST", "SAS", "TSA", "SSF",
  "SSA", "TSS", "UMC", "WBG", "AFE", "AFW",
]);

export interface WBSpec {
  id: string;
  label: string;
  unit: string;
}

export const WB: Record<string, WBSpec> = {
  lifeExpectancy: {
    id: "SP.DYN.LE00.IN",
    label: "Life expectancy at birth",
    unit: "years",
  },
  under5Mortality: {
    id: "SH.DYN.MORT",
    label: "Under-5 mortality",
    unit: "per 1,000 live births",
  },
  measlesImmunization: {
    id: "SH.IMM.MEAS",
    label: "Measles immunization",
    unit: "% of children",
  },
  malariaIncidence: {
    id: "SH.MLR.INCD.P3",
    label: "Malaria incidence",
    unit: "per 1,000 at risk",
  },
  healthExpenditure: {
    id: "SH.XPD.CHEX.GD.ZS",
    label: "Health expenditure",
    unit: "% of GDP",
  },
};

interface WBRow {
  countryiso3code: string;
  date: string;
  value: number | null;
}

async function getRows(url: string): Promise<WBRow[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const json = (await res.json()) as [unknown, WBRow[] | null];
  return json[1] ?? [];
}

export interface WBDataset {
  label: string;
  unit: string;
  /** Most-recent value per real country. */
  points: MetricPoint[];
  latestYear: number;
}

/** Latest value per country (`mrnev=1` = most recent non-empty value). */
export async function fetchWorldBank(spec: WBSpec): Promise<WBDataset> {
  const rows = await getRows(
    `${BASE}/country/all/indicator/${spec.id}?format=json&per_page=400&mrnev=1`,
  );
  const points: MetricPoint[] = [];
  let latestYear = 0;
  for (const r of rows) {
    const iso = r.countryiso3code;
    if (r.value == null || !ISO3.test(iso) || AGGREGATES.has(iso)) continue;
    const year = Number(r.date);
    points.push({ iso3: iso, year, value: r.value });
    if (year > latestYear) latestYear = year;
  }
  return { label: spec.label, unit: spec.unit, points, latestYear };
}

export interface WBSeries {
  label: string;
  unit: string;
  series: SeriesPoint[];
  latest: number | null;
  latestYear: number;
}

/** A single aggregate's recent series (default World), ascending by year. */
export async function fetchWorldBankSeries(
  spec: WBSpec,
  country = "WLD",
  mrv = 40,
): Promise<WBSeries> {
  const rows = await getRows(
    `${BASE}/country/${country}/indicator/${spec.id}?format=json&per_page=100&mrv=${mrv}`,
  );
  const series: SeriesPoint[] = rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.date, value: r.value as number }))
    .sort((a, b) => Number(a.date) - Number(b.date));
  const last = series[series.length - 1];
  return {
    label: spec.label,
    unit: spec.unit,
    series,
    latest: last?.value ?? null,
    latestYear: last ? Number(last.date) : 0,
  };
}
