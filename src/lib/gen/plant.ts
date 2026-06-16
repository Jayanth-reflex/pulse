/**
 * Procedural organism generator. Each species grows a deterministic organic
 * form from a seed: a curved stem, leaves along it, and a bloom at the crown.
 * Geometry is data-driven (height/vigor from the live metric) and rendered as
 * animatable SVG by the Plant component.
 */
export type LeafStyle = "frond" | "flower" | "spike" | "reed" | "broad";

export interface PlantSpec {
  seed: number;
  /** 0..1 — drives height, leaf count and bloom size. */
  vigor: number;
  leafStyle: LeafStyle;
}

export interface Leaf {
  x: number;
  y: number;
  /** degrees from vertical, signed by side */
  angle: number;
  scale: number;
}

export interface PlantGeo {
  stem: string;
  stemLen: number;
  leaves: Leaf[];
  bloom: { x: number; y: number; r: number; petals: number };
}

export const PLANT_W = 120;
export const PLANT_H = 240;
const BASE_X = 60;
const BASE_Y = 232;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function growPlant({ seed, vigor, leafStyle }: PlantSpec): PlantGeo {
  const rnd = mulberry32(seed);
  const v = Math.max(0.18, Math.min(1, vigor));
  const height = 96 + v * 116;
  const topY = BASE_Y - height;
  const sway = (rnd() - 0.5) * 26;
  const topX = BASE_X + sway;

  const c1x = BASE_X + sway * 0.15;
  const c1y = BASE_Y - height * 0.35;
  const c2x = topX - sway * 0.4;
  const c2y = BASE_Y - height * 0.72;
  const stem = `M${BASE_X} ${BASE_Y} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${topX.toFixed(1)} ${topY.toFixed(1)}`;

  const count = Math.round(2 + v * 4);
  const leaves: Leaf[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.16 + (i / Math.max(1, count - 1)) * 0.7;
    const x = BASE_X + (topX - BASE_X) * t;
    const y = BASE_Y - height * t;
    const side = i % 2 === 0 ? -1 : 1;
    const baseAngle =
      leafStyle === "spike" ? 28 : leafStyle === "reed" ? 18 : 42;
    const angle = side * (baseAngle + rnd() * 16) * (1 - t * 0.25);
    const scale = (0.7 + v * 0.7) * (1.05 - t * 0.35);
    leaves.push({ x, y, angle, scale });
  }

  const bloom = {
    x: topX,
    y: topY,
    r: 5 + v * 11,
    petals: leafStyle === "flower" ? 8 : leafStyle === "spike" ? 5 : 6,
  };

  return { stem, stemLen: height * 1.25, leaves, bloom };
}

/** Unit leaf path (~origin at attach point) shaped by style. */
export function leafPath(style: LeafStyle): string {
  switch (style) {
    case "reed":
      return "M0 0 Q 4 -10 1 -24 Q -2 -10 0 0 Z";
    case "spike":
      return "M0 0 Q 5 -6 0 -20 Q -5 -6 0 0 Z";
    case "broad":
      return "M0 0 Q 13 -6 16 0 Q 13 6 0 0 Z";
    case "frond":
      return "M0 0 Q 9 -5 18 -2 Q 9 1 0 0 Z";
    case "flower":
    default:
      return "M0 0 Q 8 -5 13 0 Q 8 5 0 0 Z";
  }
}

const STYLE_BY_CATEGORY: Record<string, LeafStyle> = {
  respiratory: "frond",
  vaccinePreventable: "flower",
  vectorBorne: "spike",
  enteric: "reed",
  hemorrhagic: "spike",
  chronic: "broad",
};

export const leafStyleFor = (category: string): LeafStyle =>
  STYLE_BY_CATEGORY[category] ?? "broad";
