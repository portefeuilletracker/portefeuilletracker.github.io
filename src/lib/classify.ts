// Best-effort mapping from Yahoo Finance's free-text classification
// fields onto this app's controlled vocabularies (see data/types.ts).
// These are starting guesses for the Add Holding form, not ground
// truth — Yahoo's categories don't line up 1:1 with ours, and this data
// is frequently missing (especially for ETFs and non-US listings), so
// every mapping here falls back to a sensible default rather than
// guessing wrong. The form always shows the result in an editable
// dropdown so you can correct it.

import type { AssetType, Region, Sector } from "../data/types";

export function mapAssetType(quoteType: string): AssetType {
  return quoteType === "ETF" ? "ETF" : "Stock";
}

const SECTOR_MAP: Record<string, Sector> = {
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

export function mapSector(yahooSector: string | undefined, assetType: AssetType): Sector {
  // ETFs hold many sectors at once — "Diversified" is the honest default
  // unless it's a clearly sector-specific fund, which we can't tell from
  // this field alone, so leave that correction to the user.
  if (assetType === "ETF") return "Diversified / Multi-Sector";
  if (yahooSector && SECTOR_MAP[yahooSector]) return SECTOR_MAP[yahooSector];
  return "Diversified / Multi-Sector";
}

const COUNTRY_REGION_MAP: Record<string, Region> = {
  "United States": "North America",
  Canada: "North America",
  Netherlands: "Netherlands",
  Germany: "Europe",
  France: "Europe",
  "United Kingdom": "Europe",
  Spain: "Europe",
  Italy: "Europe",
  Switzerland: "Europe",
  Ireland: "Europe",
  Sweden: "Europe",
  Belgium: "Europe",
  Denmark: "Europe",
  Norway: "Europe",
  Finland: "Europe",
  China: "Asia-Pacific",
  Japan: "Asia-Pacific",
  "South Korea": "Asia-Pacific",
  "Hong Kong": "Asia-Pacific",
  Australia: "Asia-Pacific",
  Singapore: "Asia-Pacific",
  Taiwan: "Asia-Pacific",
  India: "Emerging Markets",
  Brazil: "Emerging Markets",
  "South Africa": "Emerging Markets",
  Mexico: "Emerging Markets",
};

export function mapRegion(country: string | undefined, assetType: AssetType): Region {
  // Same logic as sector: a fund's holdings can span every region, so
  // default to "Global / Diversified" rather than pin it to the country
  // the fund happens to be domiciled or listed in.
  if (assetType === "ETF") return "Global / Diversified";
  if (country && COUNTRY_REGION_MAP[country]) return COUNTRY_REGION_MAP[country];
  return "Global / Diversified";
}
