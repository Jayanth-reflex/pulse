#!/usr/bin/env node
/**
 * Pulse data refresh — regenerates the committed snapshots that power the atlas.
 *
 * Sources WHO GHO (CORS-blocked), World Bank, and OWID into per-source snapshot
 * files plus a catalog with freshness. disease.sh stays a live browser fetch.
 *
 * Run:  cd pulse && node scripts/refresh.mjs
 * CI:   .github/workflows/refresh-data.yml runs this every 6h and commits changes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SNAP_DIR = join(ROOT, "public", "data", "snap");
const CATALOG = JSON.parse(readFileSync(join(__dirname, "catalog.json"), "utf8"));
const ASOF = new Date().toISOString();

const ISO3 = /^[A-Z]{3}$/;
const WB_AGGREGATES = new Set([
  "WLD","ARB","CSS","CEB","EAR","EAS","EAP","TEA","EMU","ECS","ECA","TEC","EUU",
  "FCS","HPC","HIC","IBD","IBT","IDB","IDX","IDA","LTE","LCN","LAC","TLA","LDC",
  "LMY","LIC","LMC","MEA","MNA","TMN","MIC","NAC","INX","OED","OSS","PSS","PST",
  "PRE","SST","SAS","TSA","SSF","SSA","TSS","UMC","WBG","AFE","AFW",
]);

const round = (n) => Math.round(n * 100) / 100;

async function getJSON(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "pulse-refresh" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (t === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 500 * (t + 1)));
    }
  }
}

async function getText(url, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "pulse-refresh" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (t === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 500 * (t + 1)));
    }
  }
}

/** Minimal RFC4180 CSV line splitter (handles quoted fields with commas). */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Concurrency pool.
async function pool(items, worker, concurrency = 6) {
  const results = [];
  let idx = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await worker(items[i], i); }
      catch (e) { results[i] = { error: String(e?.message || e) }; }
    }
  });
  await Promise.all(runners);
  return results;
}

// ── WHO GHO ────────────────────────────────────────────────────────────────
// Aggregate both-sexes value per (place, year): prefer the row whose every
// present Dim is null or SEX_BTSX; else mean of male+female.
function whoBothSexes(rows) {
  const isAgg = (r) =>
    [r.Dim1, r.Dim2, r.Dim3].every((d) => d == null || d === "" || d === "SEX_BTSX");
  const isSexSplit = (r) =>
    [r.Dim1, r.Dim2, r.Dim3].some((d) => d === "SEX_MLE" || d === "SEX_FMLE") &&
    [r.Dim1, r.Dim2, r.Dim3].every(
      (d) => d == null || d === "" || d === "SEX_MLE" || d === "SEX_FMLE",
    );

  const agg = new Map(); // place -> year -> value
  const split = new Map(); // place -> year -> {sum,n}
  for (const r of rows) {
    if (r.NumericValue == null) continue;
    const place = r.SpatialDim;
    const year = r.TimeDim;
    if (place == null || year == null) continue;
    if (isAgg(r)) {
      if (!agg.has(place)) agg.set(place, new Map());
      agg.get(place).set(year, r.NumericValue);
    } else if (isSexSplit(r)) {
      if (!split.has(place)) split.set(place, new Map());
      const m = split.get(place);
      const e = m.get(year) || { sum: 0, n: 0 };
      e.sum += r.NumericValue; e.n += 1; m.set(year, e);
    }
  }
  // merged place -> year -> value
  const merged = new Map();
  for (const [place, ym] of agg) {
    merged.set(place, new Map(ym));
  }
  for (const [place, ym] of split) {
    if (!merged.has(place)) merged.set(place, new Map());
    const dst = merged.get(place);
    for (const [year, { sum, n }] of ym) {
      if (!dst.has(year)) dst.set(year, sum / n);
    }
  }
  return merged;
}

async function fetchWho(ind) {
  const data = await getJSON(`https://ghoapi.azureedge.net/api/${ind.id}`);
  const rows = data.value || [];
  const merged = whoBothSexes(rows);

  const points = [];
  let globalSeries = [];
  for (const [place, ym] of merged) {
    const years = [...ym.keys()].sort((a, b) => a - b);
    if (place === "GLOBAL") {
      globalSeries = years.map((y) => ({ year: y, value: round(ym.get(y)) }));
      continue;
    }
    // countries only
    if (!ISO3.test(place)) continue;
    const isCountry = rows.some(
      (r) => r.SpatialDim === place && r.SpatialDimType === "COUNTRY",
    );
    if (!isCountry) continue;
    const ly = years[years.length - 1];
    points.push({ iso3: place, year: ly, value: round(ym.get(ly)) });
  }
  const latestYear = points.reduce((m, p) => Math.max(m, p.year), 0);
  const globalLatest = globalSeries.length
    ? globalSeries[globalSeries.length - 1]
    : null;
  return {
    name: ind.name, category: ind.category, unit: ind.unit, source: "who",
    latestYear, globalLatest, globalSeries, points,
  };
}

// ── World Bank ───────────────────────────────────────────────────────────────
async function fetchWb(ind) {
  const latestUrl = `https://api.worldbank.org/v2/country/all/indicator/${ind.id}?format=json&per_page=400&mrnev=1`;
  const seriesUrl = `https://api.worldbank.org/v2/country/WLD/indicator/${ind.id}?format=json&per_page=100&mrv=40`;
  const [latest, series] = await Promise.all([getJSON(latestUrl), getJSON(seriesUrl)]);
  const points = [];
  let latestYear = 0;
  for (const r of latest[1] || []) {
    const iso = r.countryiso3code;
    if (r.value == null || !ISO3.test(iso) || WB_AGGREGATES.has(iso)) continue;
    const y = Number(r.date);
    points.push({ iso3: iso, year: y, value: round(r.value) });
    if (y > latestYear) latestYear = y;
  }
  const globalSeries = (series[1] || [])
    .filter((r) => r.value != null)
    .map((r) => ({ year: Number(r.date), value: round(r.value) }))
    .sort((a, b) => a.year - b.year);
  const globalLatest = globalSeries.length
    ? globalSeries[globalSeries.length - 1]
    : null;
  return {
    name: ind.name, category: ind.category, unit: ind.unit, source: "worldbank",
    latestYear, globalLatest, globalSeries, points,
  };
}

// ── OWID ─────────────────────────────────────────────────────────────────────
async function fetchOwid(ind) {
  const [slug, col] = ind.id.split("::");
  const text = await getText(
    `https://ourworldindata.org/grapher/${slug}.csv?csvType=full&useColumnShortNames=true`,
  );
  const lines = text.split("\n").filter((l) => l.length);
  const header = splitCsvLine(lines[0]);
  const ci = { code: header.indexOf("code"), year: header.indexOf("year"), val: header.indexOf(col) };
  if (ci.code < 0 || ci.year < 0 || ci.val < 0) throw new Error(`cols not found for ${slug}`);
  const latestByIso = new Map();
  const world = [];
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i]);
    const code = f[ci.code];
    const year = Number(f[ci.year]);
    const raw = f[ci.val];
    if (raw === "" || raw == null || !Number.isFinite(year)) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    if (code === "OWID_WRL") { world.push({ year, value: round(v) }); continue; }
    if (!ISO3.test(code)) continue;
    const prev = latestByIso.get(code);
    if (!prev || year > prev.year) latestByIso.set(code, { iso3: code, year, value: round(v) });
  }
  world.sort((a, b) => a.year - b.year);
  const points = [...latestByIso.values()];
  const latestYear = points.reduce((m, p) => Math.max(m, p.year), 0);
  return {
    name: ind.name, category: ind.category, unit: ind.unit, source: "owid",
    latestYear, globalLatest: world.length ? world[world.length - 1] : null,
    globalSeries: world, points,
  };
}

async function main() {
  mkdirSync(SNAP_DIR, { recursive: true });
  const bySource = { who: [], worldbank: [], owid: [] };
  for (const ind of CATALOG) if (bySource[ind.source]) bySource[ind.source].push(ind);

  const fetchers = { who: fetchWho, worldbank: fetchWb, owid: fetchOwid };
  const catalogOut = [];

  for (const source of ["who", "worldbank", "owid"]) {
    const inds = bySource[source];
    process.stdout.write(`\n${source}: ${inds.length} indicators … `);
    const results = await pool(inds, (ind) => fetchers[source](ind), 6);
    const indicators = {};
    let ok = 0, fail = 0;
    results.forEach((r, i) => {
      const ind = inds[i];
      if (!r || r.error || !r.points || r.points.length === 0) {
        fail++;
        return;
      }
      indicators[ind.id] = r;
      catalogOut.push({
        id: ind.id, name: ind.name, category: ind.category, unit: ind.unit,
        source, latestYear: r.latestYear, countries: r.points.length,
        hasSeries: r.globalSeries.length > 1,
      });
      ok++;
    });
    writeFileSync(
      join(SNAP_DIR, `${source}.json`),
      JSON.stringify({ source, asOf: ASOF, indicators }),
    );
    console.log(`ok ${ok}, dropped ${fail}`);
  }

  // disease.sh stays live — record its catalog entries (no snapshot).
  for (const ind of CATALOG.filter((c) => c.source === "diseasesh")) {
    catalogOut.push({
      id: ind.id, name: ind.name, category: ind.category, unit: ind.unit,
      source: "diseasesh", latestYear: ind.latestYear, live: true,
    });
  }

  writeFileSync(
    join(ROOT, "public", "data", "catalog.json"),
    JSON.stringify({ asOf: ASOF, count: catalogOut.length, indicators: catalogOut }),
  );
  console.log(`\ncatalog: ${catalogOut.length} indicators · asOf ${ASOF}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
