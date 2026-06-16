"use client";

import { useMemo } from "react";
import { useCovidCountries, useWorldBank, useWhoGho } from "@/lib/swr/hooks";
import { WB } from "@/lib/sources/worldBank";
import { percentileDomain } from "./metrics";
import type { GlobeMetric } from "./metrics";

export interface GlobeMarker {
  iso3: string;
  name: string;
  lat: number;
  long: number;
  value: number;
  cases: number;
  deaths: number;
  casesPerMillion: number;
  deathsPerMillion: number;
}

export interface GlobeData {
  markers: GlobeMarker[];
  /** Colour domain (percentile-clamped). */
  domain: [number, number];
  /** Max value for size scaling. */
  max: number;
  loading: boolean;
}

/**
 * Joins disease.sh country positions (which carry lat/long) with the selected
 * metric. All sources are fetched unconditionally so switching metric is instant.
 */
export function useGlobeData(metric: GlobeMetric): GlobeData {
  const covid = useCovidCountries();
  const under5 = useWorldBank(WB.under5Mortality);
  const who = useWhoGho();

  return useMemo(() => {
    const positions = covid.data ?? [];
    if (!positions.length) {
      return { markers: [], domain: [0, 1], max: 1, loading: true };
    }

    const valueByIso = new Map<string, number>();
    if (metric.key === "casesPerMillion") {
      for (const d of positions) valueByIso.set(d.country.iso3, d.casesPerMillion);
    } else if (metric.key === "under5") {
      for (const p of under5.data?.points ?? []) valueByIso.set(p.iso3, p.value);
    } else {
      for (const p of who.data?.lifeExpectancy.points ?? [])
        valueByIso.set(p.iso3, p.value);
    }

    const markers: GlobeMarker[] = [];
    for (const d of positions) {
      const v = valueByIso.get(d.country.iso3);
      if (v == null || !Number.isFinite(v)) continue;
      markers.push({
        iso3: d.country.iso3,
        name: d.country.name,
        lat: d.country.lat,
        long: d.country.long,
        value: v,
        cases: d.cases,
        deaths: d.deaths,
        casesPerMillion: d.casesPerMillion,
        deathsPerMillion: d.deathsPerMillion,
      });
    }

    const values = markers.map((m) => m.value);
    const domain = percentileDomain(values);
    const max = values.length ? Math.max(...values) : 1;

    const dependsReady =
      metric.key === "casesPerMillion"
        ? true
        : metric.key === "under5"
          ? !!under5.data
          : !!who.data;

    return { markers, domain, max, loading: !dependsReady && !markers.length };
  }, [covid.data, under5.data, who.data, metric.key]);
}
