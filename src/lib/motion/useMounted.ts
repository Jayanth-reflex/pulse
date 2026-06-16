"use client";

import { useEffect, useState } from "react";

/**
 * False during SSR/prerender and the first client render, true after mount.
 * Gates client-only data (SWR hydrates its cache from localStorage synchronously,
 * so without this the first client render diverges from the static HTML).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
