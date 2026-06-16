"use client";

import { useEffect, useRef, useState } from "react";

/** Fires once when the element first scrolls into view. */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  opts: IntersectionObserverInit = { threshold: 0.25 },
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, opts);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}
