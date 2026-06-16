# Static data snapshots

Pulse is a 100% frontend static site. Three of its four sources are fetched
**live in the browser** (they send `Access-Control-Allow-Origin: *`):

- **disease.sh** — `https://disease.sh/v3/` (COVID totals, per-country, history, vaccines)
- **Our World in Data** — `https://ourworldindata.org/grapher/<slug>.csv`
- **World Bank** — `https://api.worldbank.org/v2/`

Two sources are **not** browser-fetchable, so they are committed here as dated
snapshots (no runtime server, per the project's no-backend constraint):

## `who-gho.json` — WHO Global Health Observatory

The GHO OData API (`ghoapi.azureedge.net`) does **not** send CORS headers, so the
browser cannot fetch it directly. We fetch it from Node (no CORS) and commit the
reduced result.

**Refresh:**

```bash
node scripts/refresh-who-gho.mjs
git add public/data/who-gho.json && git commit -m "data: refresh WHO GHO snapshot"
```

Indicators currently captured: life expectancy at birth (`WHOSIS_000001`), measles
2nd-dose immunization coverage (`MCV2`). Edit `INDICATORS` in the script to add more.
The `asOf` field inside the file records the snapshot date.

## `outbreaks.json` — WHO Disease Outbreak News

WHO DON publishes as HTML articles with no clean public API or CORS-enabled feed.
This is a **curated, dated snapshot** of notable active/recent events.

- `severity` is an **editorial 1–5 index** (5 = PHEIC / multi-country emergency),
  **not** an official case count. We deliberately do not invent case numbers.
- `asOf` records the snapshot date.

**Refresh:** manually, from <https://www.who.int/emergencies/disease-outbreak-news>.
Update the `outbreaks` array and bump `asOf`, then commit.
