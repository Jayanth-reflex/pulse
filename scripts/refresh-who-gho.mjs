#!/usr/bin/env node
/**
 * Refreshes the WHO GHO snapshot at public/data/who-gho.json.
 *
 * Why a snapshot? The WHO GHO OData API (ghoapi.azureedge.net) does NOT send
 * Access-Control-Allow-Origin headers, so a browser fetch is blocked by CORS.
 * Pulse is a 100% frontend static site, so instead of proxying through a server
 * we fetch WHO data here (Node, no CORS) and commit the reduced result.
 *
 * Run:  node scripts/refresh-who-gho.mjs
 * Then: commit the regenerated public/data/who-gho.json
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "who-gho.json");
const BASE = "https://ghoapi.azureedge.net/api";

// Indicators we surface. Labels/units hardcoded to avoid pulling the full
// indicator catalogue. sexFilter restricts to "both sexes" where applicable.
const INDICATORS = [
  {
    code: "WHOSIS_000001",
    label: "Life expectancy at birth",
    unit: "years",
    sexFilter: "SEX_BTSX",
  },
  {
    code: "MCV2",
    label: "Measles 2nd-dose immunization coverage",
    unit: "%",
    sexFilter: null,
  },
];

const ISO3 = /^[A-Z]{3}$/;

async function fetchIndicator({ code, label, unit, sexFilter }) {
  const res = await fetch(`${BASE}/${code}`);
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status}`);
  const { value } = await res.json();

  // Latest non-null observation per country (and the GLOBAL rollup if present).
  const latestByPlace = new Map();
  let global = null;

  for (const row of value) {
    if (sexFilter && row.Dim1 !== sexFilter) continue;
    if (row.NumericValue == null) continue;
    const place = row.SpatialDim;
    const year = row.TimeDim;

    if (place === "GLOBAL") {
      if (!global || year > global.year) {
        global = { year, value: round(row.NumericValue) };
      }
      continue;
    }
    if (row.SpatialDimType !== "COUNTRY" || !ISO3.test(place)) continue;

    const prev = latestByPlace.get(place);
    if (!prev || year > prev.year) {
      latestByPlace.set(place, { iso3: place, year, value: round(row.NumericValue) });
    }
  }

  const points = [...latestByPlace.values()].sort((a, b) => a.iso3.localeCompare(b.iso3));
  const latestYear = points.reduce((m, p) => Math.max(m, p.year), 0);
  return { code, label, unit, latestYear, global, points };
}

const round = (n) => Math.round(n * 100) / 100;

async function main() {
  const indicators = {};
  for (const ind of INDICATORS) {
    process.stdout.write(`fetching ${ind.code} … `);
    const data = await fetchIndicator(ind);
    indicators[ind.code] = data;
    console.log(`${data.points.length} countries, latest ${data.latestYear}`);
  }

  const snapshot = {
    source: "WHO Global Health Observatory (GHO OData)",
    sourceUrl: "https://ghoapi.azureedge.net/api/",
    note: "Browser-CORS-blocked source; refreshed via scripts/refresh-who-gho.mjs",
    asOf: new Date().toISOString().slice(0, 10),
    indicators,
  };

  await writeFile(OUT, JSON.stringify(snapshot) + "\n");
  console.log(`\nwrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
