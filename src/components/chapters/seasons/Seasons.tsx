"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveCatmullRom } from "d3-shape";
import { ChapterIntro } from "@/components/system/ChapterIntro";
import { useSeasons, valueAtYear, type SeasonMetric } from "@/lib/seasons/useSeasons";
import { useMounted } from "@/lib/motion/useMounted";
import { useMotion } from "@/lib/motion/MotionProvider";
import { fmtNum } from "@/lib/format";

const W = 1000;
const H = 440;
const M = { top: 28, right: 24, bottom: 40, left: 24 };

export function Seasons() {
  const { metrics, yearMin, yearMax, loading } = useSeasons();
  const mounted = useMounted();
  const { reducedMotion } = useMotion();

  const [active, setActive] = useState<Set<string>>(
    () => new Set(["life", "under5", "tb", "measles", "malaria"]),
  );
  const [scrub, setScrub] = useState(yearMax);
  const [playing, setPlaying] = useState(false);

  // Keep scrub pinned to the latest year until the user scrubs/plays.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setScrub(yearMax);
  }, [yearMax]);

  // Autoplay: advance the scrubber through the years.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    const span = yearMax - yearMin || 1;
    const step = (ts: number) => {
      if (last) {
        const dt = (ts - last) / 1000;
        setScrub((s) => Math.min(yearMax, s + (span / 7) * dt)); // ~7s sweep
      }
      last = ts;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, yearMin, yearMax]);

  // Stop autoplay at the end (kept out of the setScrub updater — updaters must be pure).
  useEffect(() => {
    if (playing && scrub >= yearMax) setPlaying(false);
  }, [playing, scrub, yearMax]);

  const ready = mounted && !loading;
  const shown = reducedMotion ? yearMax : scrub;

  const x = useMemo(
    () => scaleLinear().domain([yearMin, yearMax]).range([M.left, W - M.right]),
    [yearMin, yearMax],
  );
  const y = useMemo(
    () => scaleLinear().domain([0, 1]).range([H - M.bottom, M.top]),
    [],
  );
  const lineGen = useMemo(
    () =>
      d3line<{ year: number; norm: number }>()
        .x((p) => x(p.year))
        .y((p) => y(p.norm))
        .curve(curveCatmullRom.alpha(0.5)),
    [x, y],
  );

  const revealW = Math.max(0, x(shown) - M.left);
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let yr = Math.ceil(yearMin / 5) * 5; yr <= yearMax; yr += 5) out.push(yr);
    return out;
  }, [yearMin, yearMax]);

  const activeMetrics = metrics.filter((m) => active.has(m.key) && m.points.length > 1);

  const toggle = (k: string) =>
    setActive((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <ChapterIntro
        index="V"
        title="The seasons"
        lede="Scrub through the years and watch each trend grow or recede — the long, uneven turning of global health."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            aria-pressed={active.has(m.key)}
            className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300"
            style={{
              borderColor: active.has(m.key) ? m.hex : "var(--color-line)",
              color: active.has(m.key) ? "var(--color-mist)" : "var(--color-faint)",
              background: active.has(m.key)
                ? `color-mix(in oklab, ${m.hex} 12%, transparent)`
                : "transparent",
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: m.hex }}
            />
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6 w-full max-w-5xl">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Global health trends over time">
          <defs>
            <clipPath id="seasons-reveal">
              <rect x={M.left} y={0} width={revealW} height={H} />
            </clipPath>
          </defs>

          {/* baseline + year ticks */}
          <line
            x1={M.left}
            y1={H - M.bottom}
            x2={W - M.right}
            y2={H - M.bottom}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          {ready &&
            ticks.map((yr) => (
              <text
                key={yr}
                x={x(yr)}
                y={H - M.bottom + 22}
                textAnchor="middle"
                style={{ fontSize: 11, fill: "var(--color-faint)", fontFamily: "var(--font-sans)" }}
              >
                {yr}
              </text>
            ))}

          {/* lines, clipped to the scrubbed year */}
          <g clipPath="url(#seasons-reveal)">
            {ready &&
              activeMetrics.map((m) => (
                <path
                  key={m.key}
                  d={lineGen(m.points) ?? ""}
                  fill="none"
                  stroke={m.hex}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.92}
                />
              ))}
          </g>

          {/* scrub marker + value dots */}
          {ready && activeMetrics.length > 0 && (
            <>
              <line
                x1={x(shown)}
                y1={M.top}
                x2={x(shown)}
                y2={H - M.bottom}
                stroke="var(--color-mist)"
                strokeWidth={1}
                opacity={0.25}
              />
              {activeMetrics.map((m) => {
                const v = valueAtYear(m, shown);
                const nrm = normAtYear(m, shown);
                if (v == null || nrm == null) return null;
                return (
                  <circle
                    key={m.key}
                    cx={x(shown)}
                    cy={y(nrm)}
                    r={4}
                    fill={m.hex}
                  />
                );
              })}
            </>
          )}
        </svg>
      </div>

      {/* scrubber + play */}
      <div className="mt-4 flex w-full max-w-3xl items-center gap-4">
        {!reducedMotion && (
          <button
            onClick={() => {
              touched.current = true;
              if (!playing && scrub >= yearMax) setScrub(yearMin);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-sage transition-colors hover:text-mist"
          >
            {playing ? "❚❚" : "▶"}
          </button>
        )}
        <input
          type="range"
          min={yearMin}
          max={yearMax}
          step={0.1}
          value={shown}
          onChange={(e) => {
            touched.current = true;
            setPlaying(false);
            setScrub(Number(e.target.value));
          }}
          aria-label="Year"
          className="h-1 flex-1 cursor-pointer accent-jade"
          style={{ accentColor: "var(--color-jade)" }}
        />
        <span className="tnum w-12 text-right font-display text-lg text-mist">
          {ready ? Math.round(shown) : "—"}
        </span>
      </div>

      {/* legend with live values at the scrub */}
      <div className="mt-7 grid w-full max-w-3xl grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
        {activeMetrics.map((m) => {
          const v = valueAtYear(m, shown);
          return (
            <div key={m.key} className="flex items-baseline justify-between gap-2 border-b border-line/60 pb-1">
              <span className="flex items-center gap-2 text-xs text-sage">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: m.hex }} />
                {m.label}
              </span>
              <span className="tnum text-sm" style={{ color: m.hex }}>
                {v == null ? "—" : fmtNum(v)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Interpolated normalized value at a year (for plotting the scrub dot). */
function normAtYear(m: SeasonMetric, year: number): number | null {
  const pts = m.points;
  if (!pts.length) return null;
  if (year <= pts[0].year) return pts[0].norm;
  if (year >= pts[pts.length - 1].year) return pts[pts.length - 1].norm;
  for (let i = 1; i < pts.length; i++) {
    if (year <= pts[i].year) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (year - a.year) / (b.year - a.year || 1);
      return a.norm + (b.norm - a.norm) * t;
    }
  }
  return pts[pts.length - 1].norm;
}
