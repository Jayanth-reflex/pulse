"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Three motion tiers drive the whole experience:
 *   - "full"   → desktop with capable GPU; full particle counts + post FX
 *   - "lite"   → mobile / coarse pointer / modest hardware; reduced counts, no heavy FX
 *   - "static" → prefers-reduced-motion; no animation, full static fallback
 *
 * Components read the tier to decide particle budgets, whether to mount
 * WebGL at all, and whether scroll is driven by Lenis or native.
 */
export type MotionTier = "full" | "lite" | "static";

interface MotionState {
  tier: MotionTier;
  reducedMotion: boolean;
  /** True once we've measured the real client capabilities (post-hydration). */
  ready: boolean;
}

const MotionContext = createContext<MotionState>({
  tier: "full",
  reducedMotion: false,
  ready: false,
});

function detectTier(): { tier: MotionTier; reducedMotion: boolean } {
  if (typeof window === "undefined") {
    return { tier: "full", reducedMotion: false };
  }

  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduced) return { tier: "static", reducedMotion: true };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 820px)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  // deviceMemory is non-standard but widely available on Chromium.
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const modest = cores <= 4 || (memory !== undefined && memory <= 4);

  const tier: MotionTier = coarse || narrow || modest ? "lite" : "full";
  return { tier, reducedMotion: false };
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MotionState>({
    tier: "full",
    reducedMotion: false,
    ready: false,
  });

  useEffect(() => {
    const apply = () => {
      const { tier, reducedMotion } = detectTier();
      setState({ tier, reducedMotion, ready: true });
    };
    apply();

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sizeMq = window.matchMedia("(max-width: 820px)");
    reduceMq.addEventListener("change", apply);
    sizeMq.addEventListener("change", apply);
    return () => {
      reduceMq.removeEventListener("change", apply);
      sizeMq.removeEventListener("change", apply);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion(): MotionState {
  return useContext(MotionContext);
}

/** Scale a particle/instance budget by tier. */
export function tierBudget(
  tier: MotionTier,
  full: number,
  lite = Math.round(full * 0.4),
): number {
  if (tier === "static") return 0;
  return tier === "full" ? full : lite;
}
