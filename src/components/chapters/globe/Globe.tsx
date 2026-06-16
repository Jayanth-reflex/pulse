"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ChapterIntro } from "@/components/system/ChapterIntro";
import { IndicatorPicker } from "./IndicatorPicker";
import { useCatalog } from "@/lib/catalog/hooks";
import {
  useGlobeIndicator,
  LIVE_COVID_PER_M,
} from "@/lib/geo/useGlobeIndicator";
import { intensityColor } from "@/lib/geo/metrics";
import { categoryHex, CATEGORIES } from "@/lib/taxonomy";
import { latLngToVector3 } from "@/lib/geo/sphere";
import { useMotion } from "@/lib/motion/MotionProvider";
import { useMounted } from "@/lib/motion/useMounted";
import { fmtNum } from "@/lib/format";
import type { CatalogEntry } from "@/lib/catalog/types";

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

const DEFAULT_ID = "NCD_BMI_30A"; // obesity — shows the new NCD breadth

export function Globe() {
  const { reducedMotion } = useMotion();
  const mounted = useMounted();
  const { data: catalog } = useCatalog();
  const [entry, setEntry] = useState<CatalogEntry | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [webglMounted, setWebglMounted] = useState(false);

  // Pick a striking default once the catalog loads.
  useEffect(() => {
    if (entry || !catalog) return;
    const obesity = catalog.indicators.find((i) => i.id === DEFAULT_ID);
    setEntry(obesity ?? catalog.indicators[0] ?? LIVE_COVID_PER_M);
  }, [catalog, entry]);

  // Defer heavy WebGL init past first paint.
  useEffect(() => {
    if (reducedMotion) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scroll", go);
      setWebglMounted(true);
    };
    window.addEventListener("scroll", go, { passive: true });
    const ric = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const usedRic = !!ric.requestIdleCallback;
    const id = usedRic
      ? ric.requestIdleCallback!(go, { timeout: 1600 })
      : window.setTimeout(go, 1200);
    return () => {
      window.removeEventListener("scroll", go);
      if (usedRic) ric.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, [reducedMotion]);

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <ChapterIntro
        index="II"
        title="The living globe"
        lede="Every country breathes by the metric you choose — from obesity to malaria to clean air. Hover or tap a country; pick from 190+ indicators."
      />

      {entry && (
        <button
          onClick={() => setPickerOpen(true)}
          className="mt-7 flex items-center gap-3 rounded-full border border-line bg-surface/40 px-5 py-2 text-left transition-colors hover:border-jade/50"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: categoryHex(entry.category) }}
          />
          <span className="font-display text-base text-mist">{entry.name}</span>
          <span className="text-xs text-faint">{CATEGORIES[entry.category].label} · change ▾</span>
        </button>
      )}

      <div className="relative mt-6 h-[min(88vw,560px)] w-[min(88vw,560px)]">
        {!entry ? (
          <GlobeGlow />
        ) : reducedMotion ? (
          <StaticGlobe entry={entry} mounted={mounted} />
        ) : webglMounted ? (
          <GlobeScene entry={entry} />
        ) : (
          <GlobeGlow />
        )}
      </div>

      {entry && <Legend entry={entry} />}

      {pickerOpen && catalog && (
        <IndicatorPicker
          catalog={catalog}
          current={entry}
          onSelect={(e) => {
            setEntry(e);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  );
}

function Legend({ entry }: { entry: CatalogEntry }) {
  const { markers, loading, error } = useGlobeIndicator(entry);
  const hex = categoryHex(entry.category);
  return (
    <div className="mt-7 flex flex-col items-center gap-2 text-[10px] uppercase tracking-wider text-faint">
      <div className="flex items-center gap-3">
        <span>lower</span>
        <span
          className="h-1.5 w-36 rounded-full"
          style={{
            background: `linear-gradient(to right, color-mix(in oklab, ${hex} 28%, #0a120e), ${hex})`,
          }}
        />
        <span>higher</span>
      </div>
      <p className="normal-case tracking-normal text-faint/80">
        {error
          ? "couldn't load this metric"
          : loading
            ? "loading…"
            : `${markers.length} countries · ${entry.unit} · ${entry.source === "diseasesh" ? "disease.sh" : entry.source === "who" ? "WHO GHO" : entry.source === "worldbank" ? "World Bank" : "OWID"}`}
      </p>
    </div>
  );
}

/** Reduced-motion fallback: a still equirectangular plate (no WebGL). */
function StaticGlobe({
  entry,
  mounted,
}: {
  entry: CatalogEntry;
  mounted: boolean;
}) {
  const { markers, domain, loading, error } = useGlobeIndicator(entry);
  const hex = categoryHex(entry.category);
  const W = 560;
  const H = 300;
  const [d0, d1] = domain;
  const span = d1 - d0 || 1;

  const dots = useMemo(
    () =>
      markers.map((m) => ({
        x: ((m.long + 180) / 360) * W,
        y: ((90 - m.lat) / 180) * H,
        t: Math.max(0, Math.min(1, (m.value - d0) / span)),
        iso3: m.iso3,
      })),
    [markers, d0, span],
  );

  if (!mounted || loading) {
    return (
      <div className="absolute inset-0 grid place-items-center text-xs text-faint">
        loading map…
      </div>
    );
  }
  if (error) {
    return (
      <div className="absolute inset-0 grid place-items-center text-xs text-faint">
        couldn&rsquo;t load this metric
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`World map of ${entry.name}`}>
        <rect width={W} height={H} rx={12} fill="#0b1712" />
        {dots.map((d) => (
          <circle
            key={d.iso3}
            cx={d.x}
            cy={d.y}
            r={2 + Math.sqrt(d.t) * 5}
            fill={intensityColor(hex, d.t).getStyle()}
            opacity={0.9}
          />
        ))}
      </svg>
    </div>
  );
}
