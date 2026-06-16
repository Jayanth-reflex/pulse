import * as THREE from "three";
import type { SourceTag } from "../types";

/** A metric the globe can breathe by. Colour runs lowHex → highHex. */
export interface GlobeMetric {
  key: "casesPerMillion" | "under5" | "lifeExpectancy";
  label: string;
  unit: string;
  source: SourceTag;
  lowHex: string;
  highHex: string;
  /** True when a higher value is the worse outcome (warm = bad). */
  higherIsWorse: boolean;
}

export const GLOBE_METRICS: GlobeMetric[] = [
  {
    key: "casesPerMillion",
    label: "COVID cases / M",
    unit: "per million",
    source: "disease.sh",
    lowHex: "#5bd6a6",
    highHex: "#e8745c",
    higherIsWorse: true,
  },
  {
    key: "under5",
    label: "Under-5 mortality",
    unit: "per 1,000 births",
    source: "World Bank",
    lowHex: "#5bd6a6",
    highHex: "#e8745c",
    higherIsWorse: true,
  },
  {
    key: "lifeExpectancy",
    label: "Life expectancy",
    unit: "years",
    source: "WHO GHO",
    lowHex: "#e8745c",
    highHex: "#5bd6a6",
    higherIsWorse: false,
  },
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/** Colour for a normalized value t∈[0,1] along a metric's ramp. */
export function rampColor(metric: GlobeMetric, t: number): THREE.Color {
  tmpA.set(metric.lowHex);
  tmpB.set(metric.highHex);
  return tmpA.clone().lerp(tmpB, Math.max(0, Math.min(1, t)));
}

/** Percentile clamp so a few outliers don't flatten the colour spread. */
export function percentileDomain(
  values: number[],
  lo = 0.04,
  hi = 0.96,
): [number, number] {
  if (!values.length) return [0, 1];
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  const min = at(lo);
  const max = at(hi);
  return max > min ? [min, max] : [sorted[0], sorted[sorted.length - 1] || sorted[0] + 1];
}
