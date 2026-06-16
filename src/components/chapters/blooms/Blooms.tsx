"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleTime } from "d3-scale";
import { ChapterIntro } from "@/components/system/ChapterIntro";
import { useOutbreaks } from "@/lib/swr/hooks";
import { useInView } from "@/lib/motion/useInView";
import { useMounted } from "@/lib/motion/useMounted";
import { CATEGORIES } from "@/lib/taxonomy";
import { fmtDate } from "@/lib/format";
import type { Outbreak, CategoryKey } from "@/lib/types";

const VB_W = 1000;
const VB_H = 360;
const VINE_Y = 188;
const PAD = 60;

export function Blooms() {
  const { data } = useOutbreaks();
  const mounted = useMounted();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });
  const [filter, setFilter] = useState<CategoryKey | "all">("all");
  const [selected, setSelected] = useState<Outbreak | null>(null);

  const outbreaks = mounted ? (data?.outbreaks ?? []) : [];
  const categoriesPresent = useMemo(
    () =>
      ([...new Set(outbreaks.map((o) => o.category))] as CategoryKey[]).filter(
        (k) => k in CATEGORIES,
      ),
    [outbreaks],
  );

  const layout = useMemo(() => {
    if (!outbreaks.length) return [];
    const dates = outbreaks.map((o) => +new Date(o.date));
    const x = scaleTime()
      .domain([Math.min(...dates), Math.max(...dates)])
      .range([PAD, VB_W - PAD]);
    const sorted = [...outbreaks].sort(
      (a, b) => +new Date(a.date) - +new Date(b.date),
    );
    return sorted.map((o, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const offset = side * (54 + (i % 3) * 30);
      return { o, cx: x(new Date(o.date)), cy: VINE_Y + offset, side };
    });
  }, [outbreaks]);

  return (
    <section
      ref={ref}
      className="chapter relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      <ChapterIntro
        index="IV"
        title="Blooms"
        lede="Each recent outbreak opens as a blossom on the timeline — its size the severity, its colour the family. Click to read it."
      />

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} hex="#a9b8ac">
          All
        </Chip>
        {categoriesPresent.map((k) => (
          <Chip
            key={k}
            active={filter === k}
            onClick={() => setFilter(k)}
            hex={CATEGORIES[k].hex}
          >
            {CATEGORIES[k].label}
          </Chip>
        ))}
      </div>

      <div className="mt-8 w-full max-w-5xl">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="Outbreak timeline">
          {/* the vine */}
          <line
            x1={PAD}
            y1={VINE_Y}
            x2={VB_W - PAD}
            y2={VINE_Y}
            stroke="var(--color-line)"
            strokeWidth={1.5}
          />
          {layout.map(({ o, cx, cy }, i) => {
            const cat = CATEGORIES[o.category];
            if (!cat) return null;
            const dim = filter !== "all" && filter !== o.category;
            const r = 6 + o.severity * 3.4;
            return (
              <g
                key={o.id}
                role="button"
                tabIndex={0}
                aria-label={`${o.disease}, ${o.country}. View details.`}
                onClick={() => setSelected(o)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && setSelected(o)
                }
                style={{
                  cursor: "pointer",
                  opacity: inView ? (dim ? 0.16 : 1) : 0,
                  transition: `opacity 700ms ${120 + i * 60}ms var(--ease-bloom)`,
                }}
              >
                <line
                  x1={cx}
                  y1={VINE_Y}
                  x2={cx}
                  y2={cy}
                  stroke={cat.hex}
                  strokeWidth={1}
                  opacity={0.4}
                />
                <Blossom cx={cx} cy={cy} r={r} hex={cat.hex} />
                <text
                  x={cx}
                  y={cy + (cy > VINE_Y ? r + 16 : -r - 10)}
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-sans)",
                    fill: "var(--color-sage)",
                  }}
                >
                  {o.disease.split(" (")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {data && (
        <p className="mt-6 text-[11px] text-faint">
          {outbreaks.length} events · curated snapshot of WHO Disease Outbreak
          News · as of {data.asOf}
        </p>
      )}

      {selected && (
        <OutbreakDetail outbreak={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

function Blossom({
  cx,
  cy,
  r,
  hex,
}: {
  cx: number;
  cy: number;
  r: number;
  hex: string;
}) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r * 2} fill={hex} opacity={0.14} />
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse
          key={i}
          rx={r * 0.95}
          ry={r * 0.42}
          transform={`rotate(${i * 30})`}
          fill={hex}
          opacity={0.6}
        />
      ))}
      <circle r={r * 0.55} fill={hex} />
    </g>
  );
}

function Chip({
  active,
  onClick,
  hex,
  children,
}: {
  active: boolean;
  onClick: () => void;
  hex: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300"
      style={{
        borderColor: active ? hex : "var(--color-line)",
        color: active ? "var(--color-mist)" : "var(--color-sage)",
        background: active ? `color-mix(in oklab, ${hex} 14%, transparent)` : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function OutbreakDetail({
  outbreak: o,
  onClose,
}: {
  outbreak: Outbreak;
  onClose: () => void;
}) {
  const cat = CATEGORIES[o.category];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-abyss/70 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${o.disease} detail`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-forest/95 p-7"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-faint transition-colors hover:text-mist"
        >
          ✕
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider"
            style={{ borderColor: cat.hex, color: cat.hex }}
          >
            {cat.label}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-[11px] text-sage">
            {o.status}
          </span>
        </div>
        <h3 className="font-display mt-4 text-2xl text-mist">{o.disease}</h3>
        <p className="mt-1 text-sm text-sage">
          {o.country} · {fmtDate(o.date)}
        </p>
        <p className="mt-4 text-balance leading-relaxed text-sage">{o.headline}</p>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[11px] text-faint">
            Severity {o.severity}/5 · editorial index
          </span>
          <a
            href={o.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-jade underline-offset-4 hover:underline"
          >
            WHO Disease Outbreak News ↗
          </a>
        </div>
      </div>
    </div>
  );
}
