"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

const CACHE_KEY = "pulse-swr-v1";

/**
 * localStorage-backed SWR cache → stale-while-revalidate across reloads.
 * On boot the cache hydrates from the last session (instant stale numbers),
 * then SWR revalidates in the background and the figures settle to fresh.
 */
function localStorageProvider(): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (typeof window === "undefined") return map;

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      for (const [k, v] of JSON.parse(stored) as [string, unknown][]) {
        map.set(k, v);
      }
    }
  } catch {
    // Corrupt or oversized cache — start clean.
  }

  const persist = () => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify([...map.entries()]));
    } catch {
      // Quota exceeded — drop persistence rather than throw.
    }
  };

  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  return map;
}

export function SwrProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: localStorageProvider,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        keepPreviousData: true,
        dedupingInterval: 60_000,
        errorRetryCount: 2,
        focusThrottleInterval: 30_000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
