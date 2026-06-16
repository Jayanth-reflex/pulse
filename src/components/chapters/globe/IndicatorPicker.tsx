"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LIST, categoryHex } from "@/lib/taxonomy";
import { LIVE_COVID_PER_M } from "@/lib/geo/useGlobeIndicator";
import type { Catalog, CatalogEntry } from "@/lib/catalog/types";
import type { CategoryKey } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  who: "WHO GHO",
  worldbank: "World Bank",
  owid: "OWID",
  diseasesh: "disease.sh",
};

export function IndicatorPicker({
  catalog,
  current,
  onSelect,
  onClose,
}: {
  catalog: Catalog;
  current: CatalogEntry | null;
  onSelect: (e: CatalogEntry) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const entries = useMemo(
    () => [LIVE_COVID_PER_M, ...catalog.indicators],
    [catalog],
  );

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-abyss/75 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an indicator"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-forest/95 p-5"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-mist">
            Choose an indicator{" "}
            <span className="text-sm text-faint">· {catalog.count} live</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-faint transition-colors hover:text-mist"
          >
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search obesity, malaria, suicide, air pollution…"
          className="mt-4 w-full rounded-lg border border-line bg-surface/60 px-4 py-2.5 text-sm text-mist outline-none placeholder:text-faint focus:border-jade/50"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")} hex="#a9b8ac">
            All
          </Chip>
          {catsPresent.map((c) => (
            <Chip
              key={c.key}
              active={cat === c.key}
              onClick={() => setCat(c.key)}
              hex={c.hex}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-faint">No match.</p>
          )}
          <ul className="space-y-1">
            {filtered.map((e) => {
              const isCurrent = current?.id === e.id && current?.source === e.source;
              return (
                <li key={`${e.source}:${e.id}`}>
                  <button
                    onClick={() => onSelect(e)}
                    aria-current={isCurrent}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface/60"
                    style={{ background: isCurrent ? "color-mix(in oklab, " + categoryHex(e.category) + " 12%, transparent)" : undefined }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: categoryHex(e.category) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-mist">
                      {e.name}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                      {CATEGORIES[e.category].label}
                    </span>
                    <span className="shrink-0 text-[10px] text-faint/70">
                      {SOURCE_LABEL[e.source]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
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
