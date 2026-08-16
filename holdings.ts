import type { Holding } from "./types";

// ---------------------------------------------------------------
// This is your portfolio. Add, edit, or remove entries below.
// Everything else in the app (totals, allocation strips, table)
// derives automatically from this list — you never edit charts
// directly.
//
// currentPrice is not fetched live yet (see README "Next steps"),
// so update it by hand when you want fresh numbers.
// ---------------------------------------------------------------

export const holdings: Holding[] = [
  {
    ticker: "VWRL",
    name: "Vanguard FTSE All-World UCITS ETF",
    assetType: "ETF",
    region: "Global / Diversified",
    sector: "Diversified / Multi-Sector",
    shares: 40,
    avgCost: 98.5,
    currentPrice: 112.3,
    currency: "EUR",
    annualDividendPerShare: 1.85,
    broker: "DEGIRO",
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    assetType: "Stock",
    region: "North America",
    sector: "Technology",
    shares: 12,
    avgCost: 165.2,
    currentPrice: 221.4,
    currency: "USD",
    annualDividendPerShare: 1.0,
    broker: "DEGIRO",
  },
  {
    ticker: "ASML",
    name: "ASML Holding N.V.",
    assetType: "Stock",
    region: "Netherlands",
    sector: "Technology",
    shares: 3,
    avgCost: 610.0,
    currentPrice: 705.5,
    currency: "EUR",
    annualDividendPerShare: 6.4,
    broker: "DEGIRO",
  },
  {
    ticker: "VWCE",
    name: "Vanguard FTSE Emerging Markets UCITS ETF",
    assetType: "ETF",
    region: "Emerging Markets",
    sector: "Diversified / Multi-Sector",
    shares: 25,
    avgCost: 42.1,
    currentPrice: 45.8,
    currency: "EUR",
    annualDividendPerShare: 1.1,
    broker: "Trade Republic",
  },
  {
    ticker: "O",
    name: "Realty Income Corp.",
    assetType: "REIT",
    region: "North America",
    sector: "Real Estate",
    shares: 18,
    avgCost: 58.3,
    currentPrice: 56.1,
    currency: "USD",
    annualDividendPerShare: 3.08,
    broker: "Trade Republic",
  },
];
