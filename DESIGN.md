# Pulse — Design System

> **Twilight Conservatory** · a nocturnal glasshouse where live global-health data
> grows in the dark like bioluminescent plants. Organic, calm, premium.
> Editorial serif display, clean grotesque body, generous negative space, film grain.

Tokens live in [`src/app/globals.css`](src/app/globals.css) under `@theme`. This doc is
the human-readable rationale; the CSS is the source of truth.

---

## 1. Color

A deep botanical/twilight ground with a few luminous accents. Accents are not
decorative — each maps to a **disease family**, so color carries meaning across
every chapter (the globe, the species, the blooms).

### Surfaces (dark → less dark)

| Token             | Hex       | Use                                  |
| ----------------- | --------- | ------------------------------------ |
| `--color-abyss`   | `#0a120e` | Page ground, deepest backdrop        |
| `--color-forest`  | `#0f1d17` | Section grounds                      |
| `--color-surface` | `#15261d` | Cards, panels                        |
| `--color-surface-2` | `#1c3328` | Raised / hovered surfaces          |
| `--color-line`    | `#2a4034` | Hairlines, borders                   |

### Ink

| Token           | Hex       | Use                         |
| --------------- | --------- | --------------------------- |
| `--color-mist`  | `#e9efe7` | Primary text                |
| `--color-sage`  | `#a9b8ac` | Secondary text              |
| `--color-faint` | `#6e8175` | Captions, axis labels       |

### Category accents (luminous)

| Token             | Hex       | Disease family            |
| ----------------- | --------- | ------------------------- |
| `--color-jade`    | `#5bd6a6` | Respiratory               |
| `--color-amber`   | `#e8b24c` | Vaccine-preventable       |
| `--color-orchid`  | `#e0719e` | Vector-borne              |
| `--color-sky`     | `#6fb6e8` | Enteric / waterborne      |
| `--color-ember`   | `#e8745c` | Hemorrhagic / emerging    |
| `--color-lilac`   | `#b79be0` | Chronic / noncommunicable |

Accents are used at full strength only for live figures, glow, and growth;
large fields stay in the surface range. Never two accents fighting for the
same focal point.

---

## 2. Type

Two families only (perf + restraint).

- **Display — Fraunces** (`--font-display`). Optical-sized editorial serif with a
  touch of organic warmth. Used for chapter titles and the manifesto (italic).
  Letter-spacing tightened `-0.02em`. Apply via `.font-display`.
- **Body — Manrope** (`--font-sans`). Quiet modern grotesque. All running copy,
  labels, UI.
- **Figures** use `.tnum` (tabular numerals) so live numbers don't jitter as they
  update.

### Scale (fluid)

| Token             | clamp                            | Use                |
| ----------------- | -------------------------------- | ------------------ |
| `--text-hero`     | `clamp(2.75rem, 8vw, 7rem)`      | Hero title         |
| `--text-display`  | `clamp(2rem, 5vw, 4rem)`         | Chapter titles     |
| `--text-title`    | `clamp(1.5rem, 3vw, 2.5rem)`     | Sub-headings       |

Body copy sits at `1rem–1.125rem`, line-height `1.7`, max width `var(--measure)`
(`38rem`) for editorial readability.

---

## 3. Spacing & layout

Tailwind's default spacing scale, used generously. Chapters are full-viewport
stages with wide gutters. `--measure` (38rem) caps prose width. Negative space is
a feature, not a gap to fill.

---

## 4. Motion

Calm, organic, eased. No linear, no bounce.

| Token             | Value                               | Use                       |
| ----------------- | ----------------------------------- | ------------------------- |
| `--ease-organic`  | `cubic-bezier(0.22, 1, 0.36, 1)`    | Reveals, parallax         |
| `--ease-bloom`    | `cubic-bezier(0.16, 1, 0.3, 1)`     | Growth, blossoming        |
| `--dur-fast`      | `240ms`                             | Micro-interactions        |
| `--dur-med`       | `600ms`                             | Element reveals           |
| `--dur-slow`      | `1200ms`                            | Scene transitions, growth |

### Motion tiers (see `src/lib/motion/MotionProvider.tsx`)

| Tier     | When                                                    | Behaviour                                   |
| -------- | ------------------------------------------------------- | ------------------------------------------- |
| `full`   | Desktop, capable GPU                                    | Full particle counts, Lenis smooth scroll   |
| `lite`   | Coarse pointer / ≤820px / ≤4 cores / ≤4GB               | ~40% particle budget, lighter FX            |
| `static` | `prefers-reduced-motion: reduce`                        | No animation; native scroll; static visuals |

`tierBudget(tier, full, lite?)` scales any particle/instance count to the tier.

---

## 5. Texture

- **Grain** — fixed `feTurbulence` layer at `opacity 0.05`, `mix-blend: soft-light`.
- **Vignette** — radial darkening at the edges for depth.
- **Glow** — luminous figures use `text-shadow` / `color-mix` halos, never harsh.

Both texture layers are static (zero runtime cost) and live in
[`src/components/system/Grain.tsx`](src/components/system/Grain.tsx).
