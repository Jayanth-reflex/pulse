"use client";

import { useMemo } from "react";
import {
  useCovidGlobal,
  useCovidHistory,
  useOwid,
  useWorldBankSeries,
} from "@/lib/swr/hooks";
import { OWID } from "@/lib/sources/owid";
import { WB } from "@/lib/sources/worldBank";
import { trendPct } from "@/lib/format";
import type { SpeciesSelector } from "@/lib/taxonomy";

export interface SpeciesDatum {
  value: number | null;
  unit: string;
  series: number[];
  /** % change over the recent window. */
  trendPct: number;
  year: number;
  loading: boolean;
}

/**
 * Fetches every source the garden needs and resolves each species selector to
 * a normalized datum (current value + recent series + trend). All sources are
 * SWR-cached/deduped so this is cheap on re-render.
 */
export function useSpeciesGarden(): Record<SpeciesSelector, SpeciesDatum> {
  const covid = useCovidGlobal();
  const covidHist = useCovidHistory(120);
  const tb = useOwid(OWID.tbDeathRate);
  const dtp3 = useOwid(OWID.dtp3);
  const maternal = useOwid(OWID.maternalMortality);
  const life = useOwid(OWID.lifeExpectancy);
  const malaria = useWorldBankSeries(WB.malariaIncidence);
  const under5 = useWorldBankSeries(WB.under5Mortality);
  const measles = useWorldBankSeries(WB.measlesImmunization);

  return useMemo(() => {
    const fromOwidWorld = (
      d: typeof tb.data,
      unit: string,
      win = 10,
    ): SpeciesDatum => {
      const s = d?.worldSeries ?? [];
      const values = s.map((p) => p.value);
      return {
        value: d?.latestWorld ?? null,
        unit,
        series: values.slice(-25),
        trendPct: trendPct(values, win),
        year: d?.latestYear ?? 0,
        loading: !d,
      };
    };
    const fromWbSeries = (
      d: typeof malaria.data,
      unit: string,
      win = 10,
    ): SpeciesDatum => {
      const values = (d?.series ?? []).map((p) => p.value);
      return {
        value: d?.latest ?? null,
        unit,
        series: values.slice(-25),
        trendPct: trendPct(values, win),
        year: d?.latestYear ?? 0,
        loading: !d,
      };
    };

    const covidDaily = (covidHist.data?.daily ?? []).map((p) => p.value);

    return {
      covidActive: {
        value: covid.data?.active ?? null,
        unit: "active cases",
        series: covidDaily.slice(-60),
        trendPct: trendPct(covidDaily, 30),
        year: 0,
        loading: !covid.data,
      },
      tbMortality: fromOwidWorld(tb.data, "deaths / 100k"),
      dtp3Coverage: fromOwidWorld(dtp3.data, "% of infants"),
      maternalMortality: fromOwidWorld(maternal.data, "per 100k births"),
      lifeExpectancy: fromOwidWorld(life.data, "years"),
      malariaIncidence: fromWbSeries(malaria.data, "per 1k at risk"),
      under5Mortality: fromWbSeries(under5.data, "per 1k births"),
      measlesCoverage: fromWbSeries(measles.data, "% of children"),
    } satisfies Record<SpeciesSelector, SpeciesDatum>;
  }, [
    covid.data,
    covidHist.data,
    tb.data,
    dtp3.data,
    maternal.data,
    life.data,
    malaria.data,
    under5.data,
    measles.data,
  ]);
}
