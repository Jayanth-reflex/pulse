"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GLOBE_METRICS, rampColor } from "@/lib/geo/metrics";
import type { GlobeMetric } from "@/lib/geo/metrics";
import { useGlobeData } from "@/lib/geo/useGlobeData";
import { useMotion } from "@/lib/motion/MotionProvider";
import { latLngToVector3 } from "@/lib/geo/sphere";
import { ChapterIntro } from "@/components/system/ChapterIntro";

const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <GlobeGlow />,
});

function GlobeGlow() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        className="h-1/2 w-1/2 animate-pulse rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(91,214,166,0.12), transparent 70%)",
        }}
      />
    </div>
  );
}

export function Globe() {
  const { reducedMotion } = useMotion();
  const [metric, setMetric] = useState<GlobeMetric>(GLOBE_METRICS[0]);
  const [mounted, setMounted] = useState(false);

  // Defer heavy WebGL init past first paint — mount on idle or first scroll,
  // whichever comes first. Keeps three.js out of the critical path for Lighthouse
  // without depending on IntersectionObserver timing.
  useEffect(() => {
    if (reducedMotion) return;
    let done = false;
    const mountNow = () => {
      if (done) return;
      done = true;
      cleanup();
      setMounted(true);
    };
    const cleanup = () => window.removeEventListener("scroll", mountNow);
    window.addEventListener("scroll", mountNow, { passive: true });
    const ric = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const id = ric.requestIdleCallback
      ? ric.requestIdleCallback(mountNow, { timeout: 1600 })
      : window.setTimeout(mountNow, 1200);
    return () => {
      cleanup();
      window.clearTimeout(id);
    };
  }, [reducedMotion]);

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <ChapterIntro
        index="II"
        title="The living globe"
        lede="Every country breathes by the metric you choose. Hover one to grow its data sprig."
      />

      {/* Explicit square box — a WebGL host needs a concretely-sized parent.
          Sized by viewport WIDTH (never height) so it can't collapse to zero. */}
      <div className="relative mt-8 h-[min(88vw,560px)] w-[min(88vw,560px)]">
        {reducedMotion ? (
          <StaticGlobe metric={metric} />
        ) : mounted ? (
          <GlobeScene metric={metric} />
        ) : (
          <GlobeGlow />
        )}
      </div>

      <MetricControls metric={metric} onChange={setMetric} />
    </section>
  );
}

function MetricControls({
  metric,
  onChange,
}: {
  metric: GlobeMetric;
  onChange: (m: GlobeMetric) => void;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {GLOBE_METRICS.map((m) => {
          const active = m.key === metric.key;
          return (
            <button
              key={m.key}
              onClick={() => onChange(m)}
              aria-pressed={active}
              className="rounded-full border px-4 py-1.5 text-xs transition-colors duration-300"
              style={{
                borderColor: active ? m.highHex : "var(--color-line)",
                color: active ? "var(--color-mist)" : "var(--color-sage)",
                background: active
                  ? "color-mix(in oklab, " + m.highHex + " 14%, transparent)"
                  : "transparent",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <Legend metric={metric} />
    </div>
  );
}

function Legend({ metric }: { metric: GlobeMetric }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-faint">
      <span>{metric.higherIsWorse ? "lower" : "shorter"}</span>
      <span
        className="h-1.5 w-32 rounded-full"
        style={{
          background: `linear-gradient(to right, ${metric.lowHex}, ${metric.highHex})`,
        }}
      />
      <span>{metric.higherIsWorse ? "higher" : "longer"}</span>
      <span className="ml-2 normal-case tracking-normal text-faint/70">
        {metric.source}
      </span>
    </div>
  );
}

/** Reduced-motion fallback: a still equirectangular plate of the same data. */
function StaticGlobe({ metric }: { metric: GlobeMetric }) {
  const { markers, domain } = useGlobeData(metric);
  const W = 640;
  const H = 320;
  const [d0, d1] = domain;
  const span = d1 - d0 || 1;
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="World map of the selected metric">
        <rect width={W} height={H} rx={12} fill="#0b1712" />
        {markers.map((m) => {
          const x = ((m.long + 180) / 360) * W;
          const y = ((90 - m.lat) / 180) * H;
          const t = Math.max(0, Math.min(1, (m.value - d0) / span));
          return (
            <circle
              key={m.iso3}
              cx={x}
              cy={y}
              r={2 + t * 5}
              fill={rampColor(metric, t).getStyle()}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}
