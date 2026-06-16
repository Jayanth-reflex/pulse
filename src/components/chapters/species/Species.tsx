"use client";

import { useEffect, useState } from "react";
import { ChapterIntro } from "@/components/system/ChapterIntro";
import { Plant } from "./Plant";
import { Sparkline } from "@/components/data/Sparkline";
import { SPECIES, CATEGORIES, type Species as Sp } from "@/lib/taxonomy";
import {
  useSpeciesGarden,
  type SpeciesDatum,
} from "@/lib/species/useSpeciesGarden";
import { useMounted } from "@/lib/motion/useMounted";
import { fmtCompact, fmtNum, fmtSigned } from "@/lib/format";

export function Species() {
  const garden = useSpeciesGarden();
  const mounted = useMounted();
  const [selected, setSelected] = useState<Sp | null>(null);

  // Null the dynamic values until mounted (keeps static unit) so the first
  // client render — and thus the generated plant geometry — matches the SSR HTML.
  const effective = (d: SpeciesDatum): SpeciesDatum =>
    mounted ? d : { ...d, value: null, series: [], trendPct: 0, loading: true };

  return (
    <section className="chapter relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-24">
      <ChapterIntro
        index="III"
        title="The species"
        lede="Each disease grows as an organism — its height the weight of its burden, its colour its family, its bloom alive. Click one to open it."
      />

      <div className="relative mt-12 w-full max-w-5xl">
        {/* soil horizon */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[68px] h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--color-line), transparent)",
          }}
        />
        <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-10">
          {SPECIES.map((sp, i) => (
            <Plant
              key={sp.id}
              species={sp}
              datum={effective(garden[sp.selector])}
              index={i}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {selected && (
        <SpeciesDetail
          species={selected}
          datum={garden[selected.selector]}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function SpeciesDetail({
  species,
  datum,
  onClose,
}: {
  species: Sp;
  datum: ReturnType<typeof useSpeciesGarden>[keyof ReturnType<
    typeof useSpeciesGarden
  >];
  onClose: () => void;
}) {
  const cat = CATEGORIES[species.category];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 grid place-items-center px-6"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-abyss/70 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${species.name} detail`}
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

        <span
          className="inline-block rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider"
          style={{ borderColor: cat.hex, color: cat.hex }}
        >
          {cat.label}
        </span>

        <h3 className="font-display mt-4 text-3xl text-mist">{species.name}</h3>
        <p className="font-display italic text-sm text-faint">
          {species.latin}
        </p>

        <div className="mt-6 flex items-end gap-3">
          <span className="tnum text-5xl" style={{ color: cat.hex }}>
            {valueText}
          </span>
          <div className="pb-1">
            <p className="text-xs text-sage">{datum.unit}</p>
            <p className="tnum text-xs" style={{ color: trendColor }}>
              {fmtSigned(datum.trendPct)}% · {improving ? "improving" : "worsening"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Sparkline
            values={datum.series}
            color={cat.hex}
            width={460}
            height={64}
          />
          <p className="mt-1 text-[10px] uppercase tracking-wider text-faint">
            {species.source}
            {datum.year ? ` · to ${datum.year}` : ""}
          </p>
        </div>

        <p className="mt-5 text-balance leading-relaxed text-sage">
          {species.blurb}
        </p>
      </div>
    </div>
  );
}
