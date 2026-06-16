"use client";

import { useMemo } from "react";
import { useInView } from "@/lib/motion/useInView";
import {
  growPlant,
  leafPath,
  leafStyleFor,
  PLANT_W,
  PLANT_H,
} from "@/lib/gen/plant";
import { CATEGORIES, type Species } from "@/lib/taxonomy";
import type { SpeciesDatum } from "@/lib/species/useSpeciesGarden";
import { fmtCompact, fmtNum, fmtSigned } from "@/lib/format";
import { Skeleton } from "@/components/system/Skeleton";

function vigorFromSeries(value: number | null, series: number[]): number {
  if (value == null) return 0.5;
  if (series.length < 2) return 0.6;
  const min = Math.min(...series);
  const max = Math.max(...series);
  if (max <= min) return 0.6;
  return (value - min) / (max - min);
}

const seedFor = (id: string) =>
  [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7);

export function Plant({
  species,
  datum,
  index,
  onSelect,
}: {
  species: Species;
  datum: SpeciesDatum;
  index: number;
  onSelect: (s: Species) => void;
}) {
  const { ref, inView } = useInView<HTMLButtonElement>({ threshold: 0.2 });
  const cat = CATEGORIES[species.category];
  const style = leafStyleFor(species.category);

  const geo = useMemo(
    () =>
      growPlant({
        seed: seedFor(species.id),
        vigor: vigorFromSeries(datum.value, datum.series),
        leafStyle: style,
      }),
    [species.id, datum.value, datum.series, style],
  );

  const improving = species.lowerIsBetter
    ? datum.trendPct < 0
    : datum.trendPct > 0;
  const trendColor = improving ? "var(--color-jade)" : "var(--color-ember)";
  const valueText =
    datum.value == null
      ? "—"
      : datum.unit.includes("cases")
        ? fmtCompact(datum.value)
        : fmtNum(datum.value);

  return (
    <button
      ref={ref}
      onClick={() => onSelect(species)}
      className="group flex flex-col items-center rounded-2xl px-2 pb-4 pt-2 text-center outline-none transition-colors duration-300 hover:bg-surface/40 focus-visible:bg-surface/40"
      aria-label={`${species.name}: ${valueText} ${datum.unit}. View details.`}
    >
      <svg
        viewBox={`0 0 ${PLANT_W} ${PLANT_H}`}
        className="h-52 w-auto overflow-visible sway"
        style={{ animationDelay: `${index * 0.4}s` }}
        aria-hidden
      >
        {/* soft ground glow */}
        <ellipse
          cx={PLANT_W / 2}
          cy={232}
          rx={26}
          ry={5}
          fill={cat.hex}
          opacity={inView ? 0.18 : 0}
          style={{ transition: "opacity 900ms var(--ease-organic)" }}
        />
        {/* stem — draws on reveal */}
        <path
          d={geo.stem}
          fill="none"
          stroke={cat.hex}
          strokeWidth={2.4}
          strokeLinecap="round"
          style={{
            strokeDasharray: geo.stemLen,
            strokeDashoffset: inView ? 0 : geo.stemLen,
            transition: "stroke-dashoffset 1200ms var(--ease-bloom)",
            opacity: 0.92,
          }}
        />
        {/* leaves — fade in staggered up the stem */}
        {geo.leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}>
            <path
              d={leafPath(style)}
              transform={`scale(${l.scale})`}
              fill={cat.hex}
              style={{
                opacity: inView ? 0.7 : 0,
                transition: `opacity 600ms ${300 + i * 90}ms var(--ease-bloom)`,
              }}
            />
          </g>
        ))}
        {/* crown bloom */}
        <g
          transform={`translate(${geo.bloom.x} ${geo.bloom.y})`}
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 700ms 650ms var(--ease-bloom)",
          }}
        >
          <circle r={geo.bloom.r * 1.7} fill={cat.hex} opacity={0.14} />
          {Array.from({ length: geo.bloom.petals }).map((_, i) => (
            <ellipse
              key={i}
              rx={geo.bloom.r * 0.62}
              ry={geo.bloom.r * 0.26}
              transform={`rotate(${(i * 360) / geo.bloom.petals})`}
              fill={cat.hex}
              opacity={0.55}
            />
          ))}
          <circle
            r={geo.bloom.r * 0.5}
            fill={cat.hex}
            className="bloom-core"
          />
        </g>
      </svg>

      <p className="font-display text-base text-mist">{species.name}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        {datum.loading ? (
          <Skeleton width="3.5rem" />
        ) : (
          <>
            <span className="tnum text-lg" style={{ color: cat.hex }}>
              {valueText}
            </span>
            <span
              className="tnum text-[11px]"
              style={{ color: trendColor }}
              title="recent trend"
            >
              {fmtSigned(datum.trendPct)}%
            </span>
          </>
        )}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-faint">
        {datum.unit}
      </p>
    </button>
  );
}
