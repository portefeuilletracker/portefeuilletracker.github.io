// Curated, hand-sourced geographic (and where noted, sector) breakdowns
// for a handful of very common broad-market ETFs.
//
// WHY THIS EXISTS: src/lib/autoClassify.ts's live path relies on Yahoo
// Finance's public API for a fund's top holdings, then resolves each
// holding's country. In practice Yahoo's coverage of UCITS ETFs (Irish-
// domiciled, EU-listed — i.e. what most European/DEGIRO portfolios are
// built from) is poor: the top-holdings lookup routinely comes back
// empty for exactly these funds, so they were landing on "Other /
// Unclassified" for 100% of their value even though a fund like
// Vanguard FTSE All-World has a well-known, published composition.
//
// This table is checked FIRST, before any network call — see
// classifyFund() in autoClassify.ts. A match here is free (no CORS
// proxy, nothing to time out or rate-limit) and, being sourced from
// the fund's own factsheet data, more accurate than resolving ~10 top
// holdings ever could be for a fund with thousands of constituents.
//
// GRANULARITY: most entries here are continent-level, not country-
// level. That's not a shortcut — continent weightings are genuinely
// the finest breakdown these funds' own factsheets publish; a precise
// country-by-country split for a 4,000-stock global index isn't public
// data anywhere for free. Where a fund's largest few countries ARE
// individually well-documented (e.g. a single-country or few-country
// fund), those are used instead. See data/types.ts for why Country
// includes continent buckets like "Europe" alongside specific nations.
//
// SOURCES & FRESHNESS: pulled from published fund factsheets and
// index-provider data (Vanguard, iShares, FTSE Russell, MSCI) as of
// mid-2026 — see each entry's `source`. These weights drift by a few
// points a year as markets move; this is a snapshot, not a live feed.
// Treat the numbers as "directionally right," and expect to refresh
// this file occasionally (check the fund's factsheet, e.g. on
// justetf.com or the provider's own site) rather than never.
//
// MATCHING: by ticker first — the part before any exchange suffix
// (".AS", ".DE", ".L", ...), uppercased — then by a case-insensitive
// substring match against the fund's name as a fallback. Prefer adding
// a missing share-class ticker here over relying on name matching,
// which is more failure-prone (e.g. matches a themed fund that happens
// to share words with a broad-index fund's name).

import type { CountryWeight, SectorWeight } from "./types";

export interface KnownFundAllocation {
  /** For reading this file only. */
  label: string;
  tickers: string[];
  nameContains: string[];
  countries: CountryWeight[];
  /**
   * Optional — only set where the sourced sector data used the same
   * GICS-style vocabulary this app does. Most entries omit this and
   * fall back to the live per-fund sector lookup, which draws on a
   * different (broader) Yahoo endpoint than the top-holdings country
   * lookup and tends to actually work even for UCITS funds.
   */
  sectors?: SectorWeight[];
  source: string;
}

export const KNOWN_FUND_ALLOCATIONS: KnownFundAllocation[] = [
  {
    label: "Vanguard FTSE All-World",
    tickers: ["VWRL", "VWCE", "VWCG", "VWRA", "VWRD", "VVAL", "VWRP", "VGWL"],
    nameContains: ["ftse all-world", "ftse all world"],
    countries: [
      { country: "North America", pct: 64.4 },
      { country: "Europe", pct: 16.3 },
      { country: "Asia", pct: 15.8 },
      { country: "Oceania", pct: 1.7 },
      { country: "Middle East", pct: 1.0 },
      { country: "Latin America", pct: 0.6 },
      { country: "Africa", pct: 0.2 },
    ],
    source: "FTSE All-World factsheet/fund data aggregators, mid-2026",
  },
  {
    label: "iShares Core MSCI World",
    tickers: ["IWDA", "SWDA", "XDWD", "SWRD", "WLDS"],
    nameContains: ["msci world"],
    countries: [
      { country: "North America", pct: 72.5 },
      { country: "Europe", pct: 19.0 },
      { country: "Asia", pct: 6.4 },
      { country: "Oceania", pct: 1.8 },
      { country: "Middle East", pct: 0.2 },
      { country: "Latin America", pct: 0.1 },
    ],
    source: "MSCI World index / iShares factsheet data, mid-2026",
  },
  {
    label: "S&P 500 trackers (Vanguard/iShares)",
    tickers: ["VUSA", "VUAA", "CSPX", "SXR8", "IUSA", "VSPX", "SPY5", "CSSPX"],
    nameContains: ["s&p 500", "s&p500"],
    countries: [{ country: "United States", pct: 100 }],
    source: "S&P 500 constituents are ~entirely US-domiciled by index construction",
  },
  {
    label: "Nasdaq-100 trackers",
    tickers: ["EQQQ", "CNDX", "SXRV"],
    nameContains: ["nasdaq-100", "nasdaq 100"],
    countries: [{ country: "United States", pct: 100 }],
    source: "Nasdaq-100 is overwhelmingly US-listed/domiciled; simplified to 100%",
  },
  {
    label: "Developed Europe trackers (Vanguard/iShares)",
    tickers: ["VEUR", "VERX", "IMEU", "MEUD"],
    nameContains: ["developed europe", "msci europe"],
    countries: [{ country: "Europe", pct: 100 }],
    source: "Europe-focused funds by definition; no further split published at this granularity",
  },
  {
    label: "Vanguard FTSE Emerging Markets",
    tickers: ["VFEM", "VFEA", "VDEM", "VDEA"],
    nameContains: ["ftse emerging"],
    countries: [
      { country: "China", pct: 24 },
      { country: "Taiwan", pct: 19 },
      { country: "India", pct: 18 },
      { country: "Other / Unclassified", pct: 39 },
    ],
    source:
      "FTSE Emerging index top-country weights, mid-2026 - partial: only the three largest countries are well-documented across sources, remainder left unclassified rather than guessed",
  },
  {
    label: "MSCI Emerging Markets trackers (iShares Core EM IMI etc.)",
    tickers: ["EIMI", "IEMM", "EMIM"],
    nameContains: ["msci emerging"],
    countries: [
      { country: "China", pct: 25 },
      { country: "India", pct: 18 },
      { country: "Taiwan", pct: 17 },
      { country: "South Korea", pct: 12 },
      { country: "Other / Unclassified", pct: 28 },
    ],
    source:
      "MSCI Emerging Markets top-country weights, mid-2026 - partial, same caveat as FTSE Emerging above. Note MSCI (unlike FTSE) classifies South Korea as emerging, not developed.",
  },
];

function normalizeTicker(ticker: string): string {
  return ticker.split(".")[0].toUpperCase();
}

/** Looks up a curated allocation by ticker (preferred) or fund name. */
export function findKnownFundAllocation(
  ticker: string,
  name: string
): KnownFundAllocation | undefined {
  const base = normalizeTicker(ticker);
  const byTicker = KNOWN_FUND_ALLOCATIONS.find((f) => f.tickers.includes(base));
  if (byTicker) return byTicker;

  const lowerName = name.toLowerCase();
  return KNOWN_FUND_ALLOCATIONS.find((f) => f.nameContains.some((s) => lowerName.includes(s)));
}
