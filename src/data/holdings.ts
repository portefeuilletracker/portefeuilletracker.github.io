import type { Holding } from "./types";

// ---------------------------------------------------------------
// This is your portfolio. Add, edit, or remove entries below.
// Everything else in the app (totals, allocation strips, table)
// derives automatically from this list — you never edit charts
// directly.
//
// ticker must match Yahoo Finance's symbol exactly, including any
// exchange suffix (e.g. ".AS" for Euronext Amsterdam) — the app
// fetches live prices by this symbol on load. If a symbol can't be
// found, the app falls back to the currentPrice below, so keep that
// reasonably up to date too.
//
// `countries` and `sectors` are breakdowns, not single values — see
// src/data/types.ts. When you add a holding through the app these are
// filled in automatically (src/lib/autoClassify.ts); the entries below
// are hand-set to reasonable real-world approximations for the starter
// portfolio, since there's no "add flow" for a file you're editing by
// hand. Each array's `pct` values should sum to ~100.
// ---------------------------------------------------------------

export const holdings: Holding[] = [
  {
    ticker: "VWRL.AS",
    name: "Vanguard FTSE All-World UCITS ETF",
    assetType: "ETF",
    countries: [
      { country: "United States", pct: 62 },
      { country: "Japan", pct: 6 },
      { country: "United Kingdom", pct: 4 },
      { country: "China", pct: 3 },
      { country: "France", pct: 3 },
      { country: "Canada", pct: 3 },
      { country: "Other / Unclassified", pct: 19 },
    ],
    sectors: [
      { sector: "Technology", pct: 24 },
      { sector: "Financials", pct: 16 },
      { sector: "Consumer Discretionary", pct: 11 },
      { sector: "Healthcare", pct: 10 },
      { sector: "Industrials", pct: 10 },
      { sector: "Communication Services", pct: 7 },
      { sector: "Diversified / Multi-Sector", pct: 22 },
    ],
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
    countries: [{ country: "United States", pct: 100 }],
    sectors: [{ sector: "Technology", pct: 100 }],
    shares: 12,
    avgCost: 165.2,
    currentPrice: 221.4,
    currency: "USD",
    annualDividendPerShare: 1.0,
    broker: "DEGIRO",
  },
  {
    ticker: "ASML.AS",
    name: "ASML Holding N.V.",
    assetType: "Stock",
    countries: [{ country: "Netherlands", pct: 100 }],
    sectors: [{ sector: "Technology", pct: 100 }],
    shares: 3,
    avgCost: 610.0,
    currentPrice: 705.5,
    currency: "EUR",
    annualDividendPerShare: 6.4,
    broker: "DEGIRO",
  },
  {
    ticker: "VFEM.AS",
    name: "Vanguard FTSE Emerging Markets UCITS ETF",
    assetType: "ETF",
    countries: [
      { country: "China", pct: 25 },
      { country: "India", pct: 19 },
      { country: "Taiwan", pct: 18 },
      { country: "Brazil", pct: 5 },
      { country: "South Africa", pct: 4 },
      { country: "Other / Unclassified", pct: 29 },
    ],
    sectors: [
      { sector: "Technology", pct: 22 },
      { sector: "Financials", pct: 21 },
      { sector: "Consumer Discretionary", pct: 12 },
      { sector: "Communication Services", pct: 9 },
      { sector: "Diversified / Multi-Sector", pct: 36 },
    ],
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
    countries: [{ country: "United States", pct: 100 }],
    sectors: [{ sector: "Real Estate", pct: 100 }],
    shares: 18,
    avgCost: 58.3,
    currentPrice: 56.1,
    currency: "USD",
    annualDividendPerShare: 3.08,
    broker: "Trade Republic",
  },
];
