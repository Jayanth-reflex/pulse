"use client";

import { useMemo } from "react";
import { useOwid, useWorldBankSeries } from "@/lib/swr/hooks";
import { OWID } from "@/lib/sources/owid";
import { WB } from "@/lib/sources/worldBank";
import type { SourceTag } from "@/lib/types";

export interface SeasonPoint {
  year: number;
  value: number;
  /** 0..1 within the metric's own range. */
  norm: number;
}

export interface SeasonMetric {
  key: string;
  label: string;
  unit: string;
  hex: string;
  source: SourceTag;
  /** True when falling is the good direction. */
  lowerIsBetter: boolean;
  points: SeasonPoint[];
}

export interface Seasons {
  metrics: SeasonMetric[];
  yearMin: number;
  yearMax: number;
  loading: boolean;
}

const FROM_YEAR = 2000;

function normalize(
  raw: { year: number; value: number }[],
): SeasonPoint[] {
  const pts = raw.filter((p) => p.year >= FROM_YEAR);
  if (!pts.length) return [];
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return pts
    .map((p) => ({ year: p.year, value: p.value, norm: (p.value - min) / span }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Long-arc annual world trends for the Seasons chapter. Five metrics across
 * disease families, each normalized so their rise/decay shapes compare directly.
 */
export function useSeasons(): Seasons {
  const tb = useOwid(OWID.tbDeathRate);
  const life = useOwid(OWID.lifeExpectancy);
  const measles = useWorldBankSeries(WB.measlesImmunization);
  const malaria = useWorldBankSeries(WB.malariaIncidence);
  const under5 = useWorldBankSeries(WB.under5Mortality);

  return useMemo(() => {
    const owidPts = (d: typeof tb.data) =>
      (d?.worldSeries ?? []).map((p) => ({ year: Number(p.date), value: p.value }));
    const wbPts = (d: typeof malaria.data) =>
      (d?.series ?? []).map((p) => ({ year: Number(p.date), value: p.value }));

    const metrics: SeasonMetric[] = [
      {
        key: "life",
        label: "Life expectancy",
        unit: "years",
        hex: "#b79be0",
        source: "OWID",
        lowerIsBetter: false,
        points: normalize(owidPts(life.data)),
      },
      {
        key: "under5",
        label: "Under-5 mortality",
        unit: "per 1k births",
        hex: "#6fb6e8",
        source: "World Bank",
        lowerIsBetter: true,
        points: normalize(wbPts(under5.data)),
      },
      {
        key: "tb",
        label: "Tuberculosis deaths",
        unit: "per 100k",
        hex: "#5bd6a6",
        source: "OWID",
        lowerIsBetter: true,
        points: normalize(owidPts(tb.data)),
      },
      {
        key: "measles",
        label: "Measles immunization",
        unit: "% of children",
        hex: "#e8b24c",
        source: "World Bank",
        lowerIsBetter: false,
        points: normalize(wbPts(measles.data)),
      },
      {
        key: "malaria",
        label: "Malaria incidence",
        unit: "per 1k at risk",
        hex: "#e0719e",
        source: "World Bank",
        lowerIsBetter: true,
        points: normalize(wbPts(malaria.data)),
      },
    ];

    const withData = metrics.filter((m) => m.points.length > 1);
    const years = withData.flatMap((m) => m.points.map((p) => p.year));
    const yearMin = years.length ? Math.min(...years) : FROM_YEAR;
    const yearMax = years.length ? Math.max(...years) : FROM_YEAR + 20;

    return { metrics, yearMin, yearMax, loading: withData.length === 0 };
  }, [tb.data, life.data, measles.data, malaria.data, under5.data]);
}

/** Interpolated actual value of a metric at a (possibly fractional) year. */
export function valueAtYear(m: SeasonMetric, year: number): number | null {
  const pts = m.points;
  if (!pts.length) return null;
  if (year <= pts[0].year) return pts[0].value;
  if (year >= pts[pts.length - 1].year) return pts[pts.length - 1].value;
  for (let i = 1; i < pts.length; i++) {
    if (year <= pts[i].year) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (year - a.year) / (b.year - a.year || 1);
      return a.value + (b.value - a.value) * t;
    }
  }
  return pts[pts.length - 1].value;
}
