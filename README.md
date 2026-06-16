# Pulse — a living atlas of global health

A cinematic, **frontend-only** web experience that renders global disease and
public-health data as a *living garden*: diseases grow as species, outbreaks open
as blooms, trends turn with the seasons. Inspired by the scroll-driven, organic
craft of [Immersive Garden](https://immersive-g.com).

No backend, no database, no API keys. The browser fetches public data directly
and the whole thing deploys as a static site.

## Chapters

1. **Hero** — a generative flow-field garden whose energy encodes live COVID momentum.
2. **The living globe** — a 3D globe (three.js) whose countries glow by a chosen metric; hover grows a data sprig.
3. **The species** — each disease as a procedural growing organism mapped to its live burden and trend.
4. **Blooms** — recent WHO outbreaks as blossoms on a filterable timeline.
5. **The seasons** — scrubbable long-arc world trends that grow and recede.
6. **A quiet close** — methodology, disclaimer, sources, credits.

## Data sources

Three are fetched **live in the browser** (CORS-enabled):

- [disease.sh](https://disease.sh) — COVID totals, history, vaccine coverage
- [Our World in Data](https://ourworldindata.org) — grapher CSVs (mortality, immunization, life expectancy)
- [World Bank](https://data.worldbank.org) — health indicators

Two are **CORS-restricted**, so they ship as dated snapshots under
[`public/data`](public/data) (see [`public/data/README.md`](public/data/README.md)):

- **WHO GHO** — refresh with `node scripts/refresh-who-gho.mjs`
- **WHO Disease Outbreak News** — curated, refreshed manually

The typed data layer lives in [`src/lib`](src/lib): sources normalize into a small
internal schema (`Disease`, `Country`, `MetricPoint`, `Outbreak`), fetched via SWR
with a localStorage-persisted stale-while-revalidate cache.

## Tech

Next.js 16 (App Router, `output: export`) · TypeScript · Tailwind v4 ·
three.js / @react-three/fiber / drei · Lenis smooth scroll · d3 (scale/shape) ·
SWR. Motion via CSS + rAF, honouring `prefers-reduced-motion` with full static
fallbacks and a lighter mobile motion tier. Design tokens in
[`DESIGN.md`](DESIGN.md).

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # static export → ./out
```

## Not medical advice

Pulse is a data-art piece. Figures can be delayed, cached, or incomplete, and
outbreak severity is an editorial index — not official case counts. For health
decisions, consult a qualified professional.
