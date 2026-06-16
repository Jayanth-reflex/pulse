"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useMotion } from "@/lib/motion/MotionProvider";
import { setLenis } from "@/lib/scroll";

/**
 * Lenis-driven smooth scroll for the cinematic chapter flow.
 * Under prefers-reduced-motion we never instantiate Lenis — native scroll
 * stays crisp and instant, satisfying the static fallback contract.
 */
export function SmoothScroll() {
  const { reducedMotion, ready } = useMotion();

  useEffect(() => {
    if (!ready || reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    document.documentElement.classList.add("lenis");
    setLenis(lenis);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      setLenis(null);
      document.documentElement.classList.remove("lenis");
    };
  }, [ready, reducedMotion]);

  return null;
}
