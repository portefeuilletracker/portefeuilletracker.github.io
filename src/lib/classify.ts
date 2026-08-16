// Best-effort mapping from Yahoo Finance's free-text classification
// fields onto this app's controlled vocabularies (see data/types.ts).
// These are automated guesses, not ground truth — Yahoo's categories
// don't line up 1:1 with ours, and coverage is inconsistent (especially
// for ETFs and non-US listings) — but the app always uses whatever this
// produces directly rather than asking you to pick from a dropdown, so
// every function here is written to degrade to a labelled "Other /
// Unclassified" or "Diversified / Multi-Sector" bucket rather than
// silently guessing wrong.

import type { AssetType, Country, CountryWeight, Sector, SectorWeight } from "../data/types";

export function mapAssetType(quoteType: string): AssetType {
  return quoteType === "ETF" ? "ETF" : "Stock";
}

// ---------------------------------------------------------------------
// Sector mapping
// ---------------------------------------------------------------------

// Yahoo's summaryProfile.sector, for individual stocks.
const YAHOO_STOCK_SECTOR_MAP: Record<string, Sector> = {
  Technology: "Technology",
  "Financial Services": "Financials",
  Financials: "Financials",
  Healthcare: "Healthcare",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  Industrials: "Industrials",
  Energy: "Energy",
  Utilities: "Utilities",
  "Real Estate": "Real Estate",
  "Basic Materials": "Materials",
  "Communication Services": "Communication Services",
};

/** Single-sector classification for a stock/REIT, from Yahoo's summaryProfile.sector. */
export function mapStockSector(yahooSector: string | undefined): Sector {
  if (yahooSector && YAHOO_STOCK_SECTOR_MAP[yahooSector]) return YAHOO_STOCK_SECTOR_MAP[yahooSector];
  return "Diversified / Multi-Sector";
}

// Yahoo's quoteSummary `topHoldings.sectorWeightings` keys, for funds.
const YAHOO_FUND_SECTOR_KEY_MAP: Record<string, Sector> = {
  realestate: "Real Estate",
  consumer_cyclical: "Consumer Discretionary",
  basic_materials: "Materials",
  consumer_defensive: "Consumer Staples",
  technology: "Technology",
  communication_services: "Communication Services",
  financial_services: "Financials",
  utilities: "Utilities",
  industrials: "Industrials",
  energy: "Energy",
  healthcare: "Healthcare",
};

/**
 * Turns Yahoo's raw fund sector weightings (key -> fraction 0-1) into
 * our Sector vocabulary, merging any keys that map onto the same
 * bucket. Whatever fraction of the fund isn't covered by a recognized
 * sector key (bonds, cash, unclassified holdings, rounding) is folded
 * into "Diversified / Multi-Sector" so the weights still sum to ~100.
 */
export function mapFundSectorWeightings(
  raw: { key: string; fraction: number }[]
): SectorWeight[] {
  const totals = new Map<Sector, number>();
  let classifiedPct = 0;

  for (const { key, fraction } of raw) {
    const sector = YAHOO_FUND_SECTOR_KEY_MAP[key];
    const pct = fraction * 100;
    if (!sector || pct <= 0) continue;
    totals.set(sector, (totals.get(sector) ?? 0) + pct);
    classifiedPct += pct;
  }

  const remainder = 100 - classifiedPct;
  if (remainder > 0.5) {
    totals.set("Diversified / Multi-Sector", (totals.get("Diversified / Multi-Sector") ?? 0) + remainder);
  }

  return Array.from(totals.entries())
    .map(([sector, pct]) => ({ sector, pct }))
    .sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------------
// Country mapping
// ---------------------------------------------------------------------

// Yahoo's summaryProfile.country strings onto our Country vocabulary.
// Yahoo's own text is inconsistent (e.g. "USA" vs "United States"
// depending on the endpoint), so this covers the common variants.
const YAHOO_COUNTRY_MAP: Record<string, Country> = {
  "United States": "United States",
  USA: "United States",
  Canada: "Canada",
  Mexico: "Mexico",
  Brazil: "Brazil",
  "United Kingdom": "United Kingdom",
  UK: "United Kingdom",
  Germany: "Germany",
  France: "France",
  Netherlands: "Netherlands",
  Switzerland: "Switzerland",
  Spain: "Spain",
  Italy: "Italy",
  Sweden: "Sweden",
  Belgium: "Belgium",
  Denmark: "Denmark",
  Norway: "Norway",
  Finland: "Finland",
  Ireland: "Ireland",
  Austria: "Austria",
  Portugal: "Portugal",
  Poland: "Poland",
  Luxembourg: "Luxembourg",
  Japan: "Japan",
  China: "China",
  "Hong Kong": "Hong Kong",
  "South Korea": "South Korea",
  Taiwan: "Taiwan",
  Singapore: "Singapore",
  Australia: "Australia",
  "New Zealand": "New Zealand",
  India: "India",
  Indonesia: "Indonesia",
  Thailand: "Thailand",
  Malaysia: "Malaysia",
  Philippines: "Philippines",
  Vietnam: "Vietnam",
  "South Africa": "South Africa",
  "Saudi Arabia": "Saudi Arabia",
  "United Arab Emirates": "United Arab Emirates",
  Israel: "Israel",
  Turkey: "Turkey",
};

/** Maps a single free-text country string (from Yahoo) onto our vocabulary. */
export function mapCountry(yahooCountry: string | undefined): Country {
  if (yahooCountry && YAHOO_COUNTRY_MAP[yahooCountry]) return YAHOO_COUNTRY_MAP[yahooCountry];
  return "Other / Unclassified";
}

/**
 * Builds a fund's country breakdown from the resolved country of each
 * of its top holdings (each already weighted by its % of the fund).
 * Yahoo only discloses a fund's top ~10 holdings, so whatever fraction
 * of the fund isn't covered by them — plus any top holding whose own
 * country lookup failed — is folded into "Other / Unclassified" with
 * its real weight, rather than silently dropped. That bucket is the
 * honest cost of not having a paid holdings-lookthrough data source;
 * see the README.
 */
export function buildCountryWeights(
  resolved: { country: Country; pctOfFund: number }[]
): CountryWeight[] {
  if (resolved.length === 0) return [{ country: "Other / Unclassified", pct: 100 }];

  const totals = new Map<Country, number>();
  let classifiedPct = 0;
  for (const { country, pctOfFund } of resolved) {
    if (pctOfFund <= 0) continue;
    totals.set(country, (totals.get(country) ?? 0) + pctOfFund);
    classifiedPct += pctOfFund;
  }

  const remainder = 100 - classifiedPct;
  if (remainder > 0.5) {
    totals.set("Other / Unclassified", (totals.get("Other / Unclassified") ?? 0) + remainder);
  }

  return Array.from(totals.entries())
    .map(([country, pct]) => ({ country, pct }))
    .sort((a, b) => b.pct - a.pct);
}
