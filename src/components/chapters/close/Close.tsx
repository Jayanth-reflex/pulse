"use client";

import { useWhoGho, useOutbreaks } from "@/lib/swr/hooks";
import { useMounted } from "@/lib/motion/useMounted";

const SOURCES = [
  {
    name: "WHO",
    detail: "Global Health Observatory — life expectancy, immunization",
    href: "https://www.who.int/data/gho",
  },
  {
    name: "Our World in Data",
    detail: "Long-run mortality, immunization and life-expectancy series",
    href: "https://ourworldindata.org",
  },
  {
    name: "disease.sh",
    detail: "COVID-19 totals, history and vaccine coverage",
    href: "https://disease.sh",
  },
  {
    name: "World Bank",
    detail: "Under-5 mortality, malaria, immunization indicators",
    href: "https://data.worldbank.org",
  },
];

export function Close() {
  const mounted = useMounted();
  const who = useWhoGho();
  const outbreaks = useOutbreaks();
  const whoAsOf = mounted ? who.data?.asOf : undefined;
  const donAsOf = mounted ? outbreaks.data?.asOf : undefined;

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center justify-center px-6 py-28">
      <div className="w-full max-w-2xl">
        <p className="mb-5 text-[11px] uppercase tracking-[0.4em] text-faint">
          Chapter VI
        </p>
        <h2
          className="font-display text-mist"
          style={{ fontSize: "var(--text-display)", lineHeight: 1.04 }}
        >
          A quiet close
        </h2>

        <p className="mt-8 max-w-[34rem] text-balance leading-relaxed text-sage">
          Pulse is a garden, not a clinic. It renders public health data as a
          living landscape to be felt as much as read — and it can be wrong,
          delayed, or incomplete.{" "}
          <span className="text-mist">This is not medical advice.</span> For
          decisions about your health, speak with a qualified professional.
        </p>

        <div className="mt-12">
          <h3 className="text-xs uppercase tracking-[0.3em] text-faint">
            Methodology
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-sage">
            <li>
              Figures are fetched live in your browser from public APIs and
              cached locally with a stale-while-revalidate pattern — numbers
              settle from cached to fresh as you read.
            </li>
            <li>
              WHO sources are CORS-restricted, so they ship as dated snapshots:
              GHO indicators
              {whoAsOf ? ` (as of ${whoAsOf})` : ""} and outbreak news
              {donAsOf ? ` (as of ${donAsOf})` : ""}, refreshable from committed
              scripts.
            </li>
            <li>
              COVID cumulative totals are real; the daily history ends in March
              2023, where the upstream JHU feed stopped. The hero&rsquo;s
              &ldquo;momentum&rdquo; reflects the latest available global series.
            </li>
            <li>
              Outbreak severity is an editorial 1–5 index for visual weight, not
              an official case count. Season trends are normalized to compare
              shapes, not absolute values.
            </li>
          </ul>
        </div>

        <div className="mt-12">
          <h3 className="text-xs uppercase tracking-[0.3em] text-faint">
            Sources
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-line bg-surface/30 p-4 transition-colors hover:border-jade/50"
              >
                <p className="font-display text-base text-mist">
                  {s.name}{" "}
                  <span className="text-jade opacity-0 transition-opacity group-hover:opacity-100">
                    ↗
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-faint">
                  {s.detail}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-line pt-6">
          <p className="text-sm text-sage">
            Designed and built by Jayanth. A cinematic, frontend-only atlas in
            the spirit of Immersive Garden — Next.js, three.js, Lenis, d3, set in
            Fraunces &amp; Manrope.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-faint">
            Data: WHO · OWID · disease.sh · World Bank
          </p>
        </div>
      </div>
    </section>
  );
}
