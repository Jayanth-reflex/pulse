"use client";

import { useMemo, useState } from "react";
import { ChapterIntro } from "@/components/system/ChapterIntro";
import { Sparkline } from "@/components/data/Sparkline";
import { useCatalog, useSnapshot } from "@/lib/catalog/hooks";
import { useMounted } from "@/lib/motion/useMounted";
import { CATEGORIES, CATEGORY_LIST, categoryHex } from "@/lib/taxonomy";
import { fmtNum, fmtCompact } from "@/lib/format";
import type { CategoryKey } from "@/lib/types";
import type { IndicatorData } from "@/lib/catalog/types";

const CAP = 60;

export function Atlas() {
  const mounted = useMounted();
  const { data: catalog } = useCatalog();
  const who = useSnapshot("who");
  const wb = useSnapshot("worldbank");
  const owid = useSnapshot("owid");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryKey | "all">("all");

  const lookup = useMemo(() => {
    const m = new Map<string, IndicatorData>();
    for (const snap of [who.data, wb.data, owid.data]) {
      if (!snap) continue;
      for (const [id, d] of Object.entries(snap.indicators)) m.set(`${d.source}:${id}`, d);
    }
    return m;
  }, [who.data, wb.data, owid.data]);

  const entries = mounted ? (catalog?.indicators ?? []) : [];
  const catsPresent = useMemo(() => {
    const set = new Set(entries.map((e) => e.category));
    return CATEGORY_LIST.filter((c) => set.has(c.key));
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [entries, q, cat]);

  const shown = filtered.slice(0, CAP);

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center px-6 py-24">
      <ChapterIntro
        index="VI"
        title="The atlas"
        lede="Every measure we track — obesity, tobacco, suicide, clean air, immunization, cancer — across thirteen families, auto-synced every six hours."
      />

      <div className="mt-8 w-full max-w-5xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 240+ indicators — obesity, malaria, road deaths…"
          className="w-full rounded-lg border border-line bg-surface/50 px-4 py-2.5 text-sm text-mist outline-none placeholder:text-faint focus:border-jade/50"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")} hex="#a9b8ac">
            All
          </Chip>
          {catsPresent.map((c) => (
            <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)} hex={c.hex}>
              {c.label}
            </Chip>
          ))}
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-wider text-faint">
          {catalog ? `${catalog.count} indicators tracked` : "loading…"}
          {filtered.length > CAP ? ` · showing ${CAP} of ${filtered.length}` : filtered.length ? ` · ${filtered.length} shown` : ""}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((e) => {
            const d = lookup.get(`${e.source}:${e.id}`);
            const hex = categoryHex(e.category);
            const series = (d?.globalSeries ?? []).slice(-20).map((p) => p.value);
            const latest = d?.globalLatest;
            return (
              <div
                key={`${e.source}:${e.id}`}
                className="flex flex-col rounded-xl border border-line bg-surface/30 p-4 transition-colors hover:border-line/80"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: hex }} />
                  <p className="text-sm leading-snug text-mist">{e.name}</p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    {latest ? (
                      <p className="tnum text-xl" style={{ color: hex }}>
                        {Math.abs(latest.value) >= 1000 ? fmtCompact(latest.value) : fmtNum(latest.value)}
                        <span className="ml-1 text-[10px] text-faint">{e.unit}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-faint">{e.live ? "live · disease.sh" : "—"}</p>
                    )}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">
                      {CATEGORIES[e.category].label}
                      {e.latestYear ? ` · ${e.latestYear}` : ""}
                    </p>
                  </div>
                  {series.length > 1 && (
                    <Sparkline values={series} color={hex} width={84} height={26} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
      className="rounded-full border px-2.5 py-1 text-[11px] transition-colors"
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
