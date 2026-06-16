"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/lib/motion/MotionProvider";

/** Editorial chapter heading with a gentle reveal on first scroll into view. */
export function ChapterIntro({
  index,
  title,
  lede,
}: {
  index: string;
  title: string;
  lede: string;
}) {
  const { reducedMotion } = useMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setShown(true), io.disconnect()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className="max-w-2xl text-center transition-all duration-1000"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(28px)",
        transitionTimingFunction: "var(--ease-organic)",
      }}
    >
      <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-faint">
        Chapter {index}
      </p>
      <h2
        className="font-display text-mist"
        style={{ fontSize: "var(--text-display)", lineHeight: 1.02 }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-[34rem] text-balance text-sage">{lede}</p>
    </div>
  );
}
