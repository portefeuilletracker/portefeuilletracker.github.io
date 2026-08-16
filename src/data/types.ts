// The core data model. Every holding you own gets one entry.
// Keep the categories (assetType, sector, region) from a controlled
// vocabulary so the allocation charts stay consistent — see the
// unions below rather than free-typing strings in holdings.ts.

export type AssetType =
  | "Stock"
  | "ETF"
  | "Bond"
  | "REIT"
  | "Crypto"
  | "Cash";

export type Region =
  | "North America"
  | "Europe"
  | "Emerging Markets"
  | "Asia-Pacific"
  | "Global / Diversified"
  | "Netherlands";

export type Sector =
  | "Technology"
  | "Financials"
  | "Healthcare"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Industrials"
  | "Energy"
  | "Utilities"
  | "Real Estate"
  | "Materials"
  | "Communication Services"
  | "Diversified / Multi-Sector"
  | "Cash";

export interface Holding {
  /** Ticker symbol, e.g. "VWRL" or "AAPL" */
  ticker: string;
  /** Full display name */
  name: string;
  assetType: AssetType;
  region: Region;
  sector: Sector;
  /** Number of shares/units held */
  shares: number;
  /** Average price paid per share, in the holding's own currency */
  avgCost: number;
  /** Current price per share — update this periodically by hand for now */
  currentPrice: number;
  /** ISO currency code, e.g. "EUR", "USD" */
  currency: "EUR" | "USD" | "GBP";
  /** Annual dividend per share, in the holding's currency. 0 if none. */
  annualDividendPerShare: number;
  /** Brokerage/account this is held in, e.g. "DEGIRO", "Trade Republic" */
  broker?: string;
  /**
   * Free-text personal note for cross-referencing this holding elsewhere —
   * e.g. your broker's own symbol (DEGIRO shows Tradegate-listed
   * instruments as "TDG:XXX") or an ISIN from justETF. Purely a label:
   * it's never looked up or used for live pricing, which always goes
   * through `ticker` via Yahoo Finance.
   */
  referenceCode?: string;
}
