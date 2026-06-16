"use client";

import {
  useCovidGlobal,
  useWhoGho,
  useWorldBankSeries,
} from "@/lib/swr/hooks";
import { WB } from "@/lib/sources/worldBank";
import { fmtCompact, fmtNum } from "@/lib/format";
import { Skeleton } from "@/components/system/Skeleton";
import { useMounted } from "@/lib/motion/useMounted";
import type { ReactNode } from "react";

function Figure({
  label,
  value,
  source,
  loading,
  accent = "var(--color-mist)",
}: {
  label: string;
  value: ReactNode;
  source: string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="flex min-w-[7.5rem] flex-col items-center gap-1 px-4 text-center sm:items-start sm:text-left">
      <span className="text-[10px] uppercase tracking-[0.28em] text-faint">
        {label}
      </span>
      <span
        className="font-display tnum text-3xl leading-none sm:text-4xl"
        style={{ color: accent }}
      >
        {loading ? <Skeleton width="4.5rem" height="0.7em" /> : value}
      </span>
      <span className="text-[10px] tracking-wide text-faint/80">{source}</span>
    </div>
  );
}

/**
 * Live global figures — proves the data layer end to end. Real numbers from
 * disease.sh, the WHO GHO snapshot and the World Bank, with graceful skeletons.
 */
export function LiveFigures() {
  const mounted = useMounted();
  const covid = useCovidGlobal();
  const who = useWhoGho();
  const u5 = useWorldBankSeries(WB.under5Mortality);

  // Gate on mount so the first client render matches the data-less static HTML.
  const covidReady = mounted && !!covid.data;
  const whoReady = mounted && !!who.data;
  const u5Ready = mounted && !!u5.data;

  return (
    <div className="flex flex-wrap items-end justify-center gap-y-8 divide-line sm:divide-x">
      <Figure
        label="Cumulative COVID cases"
        value={covidReady ? fmtCompact(covid.data!.cases) : "—"}
        source="disease.sh"
        loading={!covidReady}
        accent="var(--color-jade)"
      />
      <Figure
        label="Confirmed deaths"
        value={covidReady ? fmtCompact(covid.data!.deaths) : "—"}
        source="disease.sh"
        loading={!covidReady}
      />
      <Figure
        label="Countries affected"
        value={covidReady ? covid.data!.affectedCountries : "—"}
        source="disease.sh"
        loading={!covidReady}
      />
      <Figure
        label="Life expectancy"
        value={
          whoReady && who.data!.lifeExpectancy.global
            ? `${fmtNum(who.data!.lifeExpectancy.global.value)} yr`
            : "—"
        }
        source={`WHO GHO · ${(whoReady && who.data!.lifeExpectancy.global?.year) || ""}`}
        loading={!whoReady}
        accent="var(--color-lilac)"
      />
      <Figure
        label="Under-5 mortality"
        value={u5Ready && u5.data!.latest != null ? fmtNum(u5.data!.latest) : "—"}
        source={`World Bank · ${(u5Ready && u5.data!.latestYear) || ""}`}
        loading={!u5Ready}
        accent="var(--color-sky)"
      />
    </div>
  );
}
