import type { Country, GlobeDatum, SeriesPoint } from "../types";

/**
 * disease.sh — CORS-enabled (`Access-Control-Allow-Origin: *`), fetched live.
 * Cumulative COVID totals are real; the JHU-sourced daily history ends in
 * March 2023 (upstream stopped updating), which we surface honestly as history.
 */
const BASE = "https://disease.sh/v3/covid-19";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`disease.sh ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export interface CovidGlobal {
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  critical: number;
  affectedCountries: number;
  casesPerMillion: number;
  deathsPerMillion: number;
  population: number;
  updated: number;
}

interface RawAll {
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  critical: number;
  affectedCountries: number;
  casesPerOneMillion: number;
  deathsPerOneMillion: number;
  population: number;
  updated: number;
}

export async function fetchCovidGlobal(): Promise<CovidGlobal> {
  const r = await getJSON<RawAll>(`${BASE}/all`);
  return {
    cases: r.cases,
    deaths: r.deaths,
    recovered: r.recovered,
    active: r.active,
    critical: r.critical,
    affectedCountries: r.affectedCountries,
    casesPerMillion: r.casesPerOneMillion,
    deathsPerMillion: r.deathsPerOneMillion,
    population: r.population,
    updated: r.updated,
  };
}

interface RawCountry {
  country: string;
  countryInfo: {
    iso2: string | null;
    iso3: string | null;
    lat: number;
    long: number;
  };
  cases: number;
  deaths: number;
  active: number;
  recovered: number;
  casesPerOneMillion: number;
  deathsPerOneMillion: number;
  continent: string;
  population: number;
}

export async function fetchCovidCountries(): Promise<GlobeDatum[]> {
  const rows = await getJSON<RawCountry[]>(`${BASE}/countries`);
  return rows
    .filter((r) => r.countryInfo.iso3 && Number.isFinite(r.countryInfo.lat))
    .map((r): GlobeDatum => {
      const country: Country = {
        iso3: r.countryInfo.iso3 as string,
        iso2: r.countryInfo.iso2 ?? undefined,
        name: r.country,
        lat: r.countryInfo.lat,
        long: r.countryInfo.long,
        continent: r.continent,
        population: r.population,
      };
      return {
        country,
        value: r.casesPerOneMillion,
        cases: r.cases,
        deaths: r.deaths,
        active: r.active,
        casesPerMillion: r.casesPerOneMillion,
        deathsPerMillion: r.deathsPerOneMillion,
      };
    });
}

/** Turn a `{ "M/D/YY": value }` cumulative map into an ISO-dated series. */
function mapToSeries(map: Record<string, number>): SeriesPoint[] {
  return Object.entries(map).map(([k, value]) => {
    const [m, d, y] = k.split("/").map(Number);
    const year = 2000 + y;
    const iso = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { date: iso, value };
  });
}

export interface CovidHistory {
  cumulative: SeriesPoint[];
  /** Day-over-day new cases (7-day smoothed). */
  daily: SeriesPoint[];
  latestDate: string;
}

export async function fetchCovidHistory(days = 200): Promise<CovidHistory> {
  const r = await getJSON<{ cases: Record<string, number> }>(
    `${BASE}/historical/all?lastdays=${days}`,
  );
  const cumulative = mapToSeries(r.cases);
  const rawDaily: SeriesPoint[] = cumulative.map((p, i) => ({
    date: p.date,
    value: i === 0 ? 0 : Math.max(0, p.value - cumulative[i - 1].value),
  }));
  // 7-day moving average to read as organic growth rather than reporting noise.
  const daily = rawDaily.map((p, i) => {
    const win = rawDaily.slice(Math.max(0, i - 6), i + 1);
    const avg = win.reduce((s, q) => s + q.value, 0) / win.length;
    return { date: p.date, value: Math.round(avg) };
  });
  return {
    cumulative,
    daily,
    latestDate: cumulative[cumulative.length - 1]?.date ?? "",
  };
}

/** Per-country smoothed daily new-case series (for the globe hover sprig). */
export async function fetchCountryHistory(
  iso3: string,
  days = 120,
): Promise<SeriesPoint[]> {
  const r = await getJSON<{ timeline?: { cases?: Record<string, number> } }>(
    `${BASE}/historical/${iso3}?lastdays=${days}`,
  );
  const cases = r.timeline?.cases;
  if (!cases) return [];
  const cum = mapToSeries(cases);
  const daily = cum.map((p, i) => ({
    date: p.date,
    value: i === 0 ? 0 : Math.max(0, cum[i].value - cum[i - 1].value),
  }));
  // 7-day moving average.
  return daily.map((p, i) => {
    const win = daily.slice(Math.max(0, i - 6), i + 1);
    const avg = win.reduce((s, q) => s + q.value, 0) / win.length;
    return { date: p.date, value: Math.round(avg) };
  });
}

/** Cumulative global vaccine doses over time (runs more recent than cases). */
export async function fetchVaccineHistory(days = 400): Promise<SeriesPoint[]> {
  const r = await getJSON<Record<string, number>>(
    `${BASE}/vaccine/coverage?lastdays=${days}&fullData=false`,
  );
  return mapToSeries(r);
}
