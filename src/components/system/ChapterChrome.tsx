"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/lib/motion/MotionProvider";
import { scrollToEl } from "@/lib/scroll";

// Per-chapter accent + label, in page order. The grade tints the whole field
// so the journey shifts temperature (cool open → warm outbreak tension → cool close).
const CHAPTERS = [
  { label: "The garden", hex: "#5bd6a6" },
  { label: "The living globe", hex: "#4fcadb" },
  { label: "The species", hex: "#b79be0" },
  { label: "Blooms", hex: "#e8745c" },
  { label: "The seasons", hex: "#6fb6e8" },
  { label: "The atlas", hex: "#b9d06a" },
  { label: "A quiet close", hex: "#8f8ce8" },
];

export function ChapterChrome() {
  const { reducedMotion } = useMotion();
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const gradeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = () =>
      Array.from(document.querySelectorAll<HTMLElement>("section.chapter"));
    setCount(sections().length);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const secs = sections();
        const mid = window.innerHeight / 2;
        let idx = 0;
        secs.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          if (r.top <= mid) idx = i;
        });
        setActive(idx);
        const hex = CHAPTERS[Math.min(idx, CHAPTERS.length - 1)]?.hex ?? "#5bd6a6";
        if (gradeRef.current) gradeRef.current.style.background = grade(hex);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (i: number) => {
    const s = document.querySelectorAll<HTMLElement>("section.chapter")[i];
    if (s) scrollToEl(s, reducedMotion);
  };

  return (
    <>
      {/* Scroll-driven colour grade — a soft field tint that crossfades per chapter. */}
      <div
        ref={gradeRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 transition-[background] duration-[1400ms] ease-out"
        style={{ background: grade("#5bd6a6"), zIndex: -1 }}
      />
      {/* Progress / navigation rail. */}
      <nav
        aria-label="Chapters"
        className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex"
      >
        {Array.from({ length: count || CHAPTERS.length }).map((_, i) => {
          const ch = CHAPTERS[Math.min(i, CHAPTERS.length - 1)];
          const on = i === active;
          return (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={ch.label}
              aria-current={on}
              className="group relative flex items-center"
            >
              <span
                className="absolute right-6 whitespace-nowrap rounded-full border border-line bg-forest/90 px-2.5 py-1 text-[11px] text-sage opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                {ch.label}
              </span>
              <span
                className="block rounded-full transition-all duration-500"
                style={{
                  width: on ? 9 : 6,
                  height: on ? 9 : 6,
                  background: on ? ch.hex : "var(--color-faint)",
                  boxShadow: on ? `0 0 12px ${ch.hex}` : "none",
                  opacity: on ? 1 : 0.5,
                }}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}

function grade(hex: string): string {
  return `radial-gradient(120% 90% at 50% 18%, color-mix(in oklab, ${hex} 10%, transparent) 0%, transparent 60%)`;
}
