import type { Category, CategoryKey, SourceTag } from "./types";

/**
 * Disease-family taxonomy. Each family owns one luminous accent so colour
 * carries meaning across every chapter (globe, species, blooms). Hexes mirror
 * the `@theme` tokens in globals.css — keep them in sync.
 */
export const CATEGORIES: Record<CategoryKey, Category> = {
  respiratory: {
    key: "respiratory",
    label: "Respiratory",
    accent: "jade",
    hex: "#5bd6a6",
    blurb: "Airborne pathogens of the lungs and airways.",
  },
  communicableOther: {
    key: "communicableOther",
    label: "Communicable",
    accent: "teal",
    hex: "#4fcadb",
    blurb: "TB, HIV, malaria, hepatitis and the neglected tropical diseases.",
  },
  enteric: {
    key: "enteric",
    label: "Enteric & water",
    accent: "sky",
    hex: "#6fb6e8",
    blurb: "Spread through water, food and sanitation gaps.",
  },
  healthSystem: {
    key: "healthSystem",
    label: "Health systems",
    accent: "cerulean",
    hex: "#6f8fe8",
    blurb: "Coverage, spending and the people who deliver care.",
  },
  mentalHealth: {
    key: "mentalHealth",
    label: "Mental health",
    accent: "periwinkle",
    hex: "#8f8ce8",
    blurb: "Suicide, substance use and the mind's quiet burden.",
  },
  chronicNCD: {
    key: "chronicNCD",
    label: "Chronic & NCDs",
    accent: "lilac",
    hex: "#b79be0",
    blurb: "Obesity, diabetes, hypertension, cancer — the slow epidemics.",
  },
  riskFactor: {
    key: "riskFactor",
    label: "Risk factors",
    accent: "mauve",
    hex: "#cf8fd6",
    blurb: "Tobacco, alcohol, diet and the conditions that precede disease.",
  },
  vectorBorne: {
    key: "vectorBorne",
    label: "Vector-borne",
    accent: "orchid",
    hex: "#e0719e",
    blurb: "Carried by mosquitoes, midges and ticks.",
  },
  maternalChild: {
    key: "maternalChild",
    label: "Maternal & child",
    accent: "rose",
    hex: "#e87e93",
    blurb: "Survival at the start of life — mothers, newborns, children.",
  },
  hemorrhagic: {
    key: "hemorrhagic",
    label: "Hemorrhagic & emerging",
    accent: "ember",
    hex: "#e8745c",
    blurb: "Rare, severe, and watched for pandemic potential.",
  },
  injuries: {
    key: "injuries",
    label: "Injuries",
    accent: "terracotta",
    hex: "#e0935c",
    blurb: "Road traffic, falls and the everyday geography of harm.",
  },
  vaccinePreventable: {
    key: "vaccinePreventable",
    label: "Vaccine-preventable",
    accent: "amber",
    hex: "#e8b24c",
    blurb: "Diseases held back — or let through — by immunization.",
  },
  environmental: {
    key: "environmental",
    label: "Environmental",
    accent: "moss",
    hex: "#b9d06a",
    blurb: "Air, water and the planet's pressure on human health.",
  },
};

export const CATEGORY_LIST: Category[] = Object.values(CATEGORIES);

export const categoryHex = (key: CategoryKey): string => CATEGORIES[key].hex;
export const categoryAccent = (key: CategoryKey): string =>
  CATEGORIES[key].accent;

/**
 * Selector keys bind a species to a concrete live metric, resolved in the
 * Species chapter from the fetched datasets. Keeps the registry declarative.
 */
export type SpeciesSelector =
  | "covidActive"
  | "tbMortality"
  | "dtp3Coverage"
  | "malariaIncidence"
  | "maternalMortality"
  | "under5Mortality"
  | "measlesCoverage"
  | "lifeExpectancy";

export interface Species {
  id: string;
  name: string;
  latin: string;
  category: CategoryKey;
  source: SourceTag;
  selector: SpeciesSelector;
  metricLabel: string;
  /** When true, a falling metric is GOOD (e.g. mortality) → growth inverts. */
  lowerIsBetter: boolean;
  blurb: string;
}

/**
 * The garden's species. Each is a real public-health metric rendered as an
 * organic growing form whose size/trend maps to the latest live value.
 */
export const SPECIES: Species[] = [
  {
    id: "covid",
    name: "SARS-CoV-2",
    latin: "Coronaviridae",
    category: "respiratory",
    source: "disease.sh",
    selector: "covidActive",
    metricLabel: "active cases worldwide",
    lowerIsBetter: true,
    blurb:
      "The pandemic species. Now seasonal, it still pulses through the world in variant waves.",
  },
  {
    id: "tuberculosis",
    name: "Tuberculosis",
    latin: "M. tuberculosis",
    category: "respiratory",
    source: "OWID",
    selector: "tbMortality",
    metricLabel: "deaths per 100k, world",
    lowerIsBetter: true,
    blurb:
      "An ancient, slow bloom — still among the deadliest single infectious agents.",
  },
  {
    id: "measles",
    name: "Measles",
    latin: "Morbillivirus",
    category: "vaccinePreventable",
    source: "World Bank",
    selector: "measlesCoverage",
    metricLabel: "immunization, world",
    lowerIsBetter: false,
    blurb:
      "Held in check by vaccination. Where the second dose thins, it returns fast.",
  },
  {
    id: "dtp3",
    name: "Childhood immunity",
    latin: "DTP3 coverage",
    category: "vaccinePreventable",
    source: "OWID",
    selector: "dtp3Coverage",
    metricLabel: "DTP3 coverage, world",
    lowerIsBetter: false,
    blurb:
      "The garden's keystone canopy — the share of infants fully protected against diphtheria, tetanus and pertussis.",
  },
  {
    id: "malaria",
    name: "Malaria",
    latin: "Plasmodium",
    category: "vectorBorne",
    source: "World Bank",
    selector: "malariaIncidence",
    metricLabel: "incidence per 1k at risk",
    lowerIsBetter: true,
    blurb:
      "Carried by Anopheles mosquitoes whose range widens as the world warms.",
  },
  {
    id: "maternal",
    name: "Maternal mortality",
    latin: "MMR",
    category: "maternalChild",
    source: "OWID",
    selector: "maternalMortality",
    metricLabel: "deaths per 100k births",
    lowerIsBetter: true,
    blurb:
      "A measure of whether a health system holds when it matters most.",
  },
  {
    id: "under5",
    name: "Under-5 survival",
    latin: "U5MR",
    category: "maternalChild",
    source: "World Bank",
    selector: "under5Mortality",
    metricLabel: "deaths per 1k live births",
    lowerIsBetter: true,
    blurb:
      "One of humanity's clearest wins — falling for decades, unevenly.",
  },
  {
    id: "longevity",
    name: "Longevity",
    latin: "Life expectancy",
    category: "chronicNCD",
    source: "OWID",
    selector: "lifeExpectancy",
    metricLabel: "years at birth, world",
    lowerIsBetter: false,
    blurb:
      "The sum of every other species — how long a life now lasts, on average.",
  },
];
