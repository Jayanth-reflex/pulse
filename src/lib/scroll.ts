import type Lenis from "lenis";

/**
 * Single source of truth for programmatic scrolling. Lenis owns the scroll, so
 * native scrollIntoView is ignored — anchor/nav jumps must go through Lenis.
 */
let lenis: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  lenis = l;
};

export function scrollToEl(el: Element, reduced: boolean) {
  if (lenis) {
    lenis.scrollTo(el as HTMLElement, { offset: 0, duration: 1.2 });
  } else {
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
}
