"use client";

import useSWR from "swr";
import {
  fetchCovidGlobal,
  fetchCovidCountries,
  fetchCovidHistory,
  fetchCountryHistory,
  fetchVaccineHistory,
} from "../sources/diseaseSh";
import { fetchOwid, type OwidSpec } from "../sources/owid";
import {
  fetchWorldBank,
  fetchWorldBankSeries,
  type WBSpec,
} from "../sources/worldBank";
import { fetchWhoGho } from "../sources/whoGho";
import { fetchOutbreaks } from "../sources/outbreaks";

// Snapshots rarely change within a session → long dedupe; live sources shorter.
const SNAPSHOT = { revalidateOnMount: true, dedupingInterval: 3_600_000 };

export const useCovidGlobal = () =>
  useSWR("disease.sh:all", fetchCovidGlobal);

export const useCovidCountries = () =>
  useSWR("disease.sh:countries", fetchCovidCountries);

export const useCovidHistory = (days = 200) =>
  useSWR(["disease.sh:history", days], () => fetchCovidHistory(days));

export const useVaccineHistory = (days = 400) =>
  useSWR(["disease.sh:vaccine", days], () => fetchVaccineHistory(days));

/** Lazy per-country history — only fetches when an iso3 is provided (hover). */
export const useCountryHistory = (iso3: string | null) =>
  useSWR(iso3 ? ["disease.sh:country", iso3] : null, () =>
    fetchCountryHistory(iso3 as string),
  );

export const useOwid = (spec: OwidSpec) =>
  useSWR(["owid", spec.slug], () => fetchOwid(spec));

export const useWorldBank = (spec: WBSpec) =>
  useSWR(["wb", spec.id], () => fetchWorldBank(spec));

export const useWorldBankSeries = (spec: WBSpec, country = "WLD") =>
  useSWR(["wb-series", spec.id, country], () =>
    fetchWorldBankSeries(spec, country),
  );

export const useWhoGho = () =>
  useSWR("who:gho", fetchWhoGho, SNAPSHOT);

export const useOutbreaks = () =>
  useSWR("who:outbreaks", fetchOutbreaks, SNAPSHOT);
