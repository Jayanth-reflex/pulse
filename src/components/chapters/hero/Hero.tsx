"use client";

import { useEffect, useRef, useState } from "react";
import { GardenCanvas } from "./GardenCanvas";
import { LiveFigures } from "@/components/data/LiveFigures";
import { useCovidHistory } from "@/lib/swr/hooks";
import { useMotion } from "@/lib/motion/MotionProvider";
import { useMounted } from "@/lib/motion/useMounted";
import { trendPct, fmtSigned, fmtMonthYear } from "@/lib/format";

// Cool-leaning palette with a few warm sparks; the engine samples per particle.
const PALETTE = ["#5bd6a6", "#6fb6e8", "#b79be0", "#5bd6a6", "#e8b24c", "#e0719e"];

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function Hero() {
  const { reducedMotion } = useMotion();
  const mounted = useMounted();
  const hist = useCovidHistory(120);
  const contentRef = useRef<HTMLDivElement>(null);

  const daily = hist.data?.daily ?? [];
  const values = daily.map((d) => d.value);
  const change = values.length ? trendPct(values, 30) : 0;
  // Visual energy floor keeps the garden alive; the precise % is shown honestly below.
  const momentum = clamp(0.5 + change / 220, 0.32, 1);
  const latest = hist.data?.latestDate;

  // Cinematic exit: fade + lift the hero copy as the next chapter rises.
  useEffect(() => {
    if (reducedMotion) return;
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = clamp(window.scrollY / window.innerHeight, 0, 1);
        el.style.opacity = `${1 - p * 1.15}`;
        el.style.transform = `translateY(${p * -40}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <section className="chapter relative h-screen min-h-[600px] overflow-hidden">
      <GardenCanvas momentum={momentum} palette={PALETTE} />

      {/* Legibility scrim — soft radial darken behind the copy. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 42%, rgba(10,18,14,0.62) 0%, rgba(10,18,14,0.25) 55%, transparent 80%)",
        }}
      />

      <div
        ref={contentRef}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <p className="mb-7 text-[11px] uppercase tracking-[0.42em] text-sage">
          A living atlas of global health
        </p>
        <h1
          className="font-display text-mist"
          style={{ fontSize: "var(--text-hero)", lineHeight: 0.92 }}
        >
          Pulse
        </h1>
        <p
          className="font-display mt-7 max-w-[34rem] text-balance italic text-sage"
          style={{ fontSize: "var(--text-title)" }}
        >
          The world&rsquo;s health, grown as a garden.
        </p>

        <MomentumReadout
          change={change}
          latest={latest}
          ready={mounted && !!hist.data}
        />

        <div className="mt-14 w-full max-w-4xl">
          <LiveFigures />
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}

function MomentumReadout({
  change,
  latest,
  ready,
}: {
  change: number;
  latest?: string;
  ready: boolean;
}) {
  // Until data is ready (and mounted), render a neutral dot with no value so
  // the static HTML and first client render match exactly.
  const rising = change >= 0;
  const color = !ready
    ? "var(--color-faint)"
    : rising
      ? "var(--color-ember)"
      : "var(--color-jade)";
  return (
    <p className="mt-8 flex items-center gap-2 text-xs text-faint">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: color,
          boxShadow: ready ? `0 0 10px ${color}` : "none",
        }}
      />
      <span className="uppercase tracking-[0.2em]">
        COVID-19 · 30-day momentum
      </span>
      {ready && (
        <>
          <span className="tnum" style={{ color }}>
            {fmtSigned(change)}%
          </span>
          {latest && (
            <span className="text-faint/70">to {fmtMonthYear(latest)}</span>
          )}
        </>
      )}
    </p>
  );
}

function ScrollCue() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-3 transition-opacity duration-700"
      style={{ opacity: hidden ? 0 : 1 }}
    >
      <span className="text-[10px] uppercase tracking-[0.35em] text-faint">
        Scroll to enter
      </span>
      <span className="relative h-10 w-px overflow-hidden bg-line">
        <span className="absolute inset-x-0 top-0 h-4 animate-[drip_2.4s_ease-in-out_infinite] bg-jade" />
      </span>
    </div>
  );
}
