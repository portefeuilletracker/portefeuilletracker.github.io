// The core data model. Every holding you own gets one entry.
// Keep assetType/sector/country from a controlled vocabulary so the
// allocation charts stay consistent — see the unions below rather
// than free-typing strings in holdings.ts.

export type AssetType =
  | "Stock"
  | "ETF"
  | "Bond"
  | "REIT"
  | "Crypto"
  | "Cash";

// Countries an ETF's underlying holdings (or a single stock's HQ
// country) can be classified into. This is deliberately a flat list
// of individual countries rather than macro regions ("Europe",
// "Emerging Markets") — see classify.ts for how a fund's basket of
// countries gets built up automatically. "Other / Unclassified"
// covers anything the auto-classifier couldn't resolve (e.g. the
// long tail of an index fund's holdings beyond what Yahoo discloses).
export type Country =
  | "United States"
  | "Canada"
  | "Mexico"
  | "Brazil"
  | "United Kingdom"
  | "Germany"
  | "France"
  | "Netherlands"
  | "Switzerland"
  | "Spain"
  | "Italy"
  | "Sweden"
  | "Belgium"
  | "Denmark"
  | "Norway"
  | "Finland"
  | "Ireland"
  | "Austria"
  | "Portugal"
  | "Poland"
  | "Luxembourg"
  | "Japan"
  | "China"
  | "Hong Kong"
  | "South Korea"
  | "Taiwan"
  | "Singapore"
  | "Australia"
  | "New Zealand"
  | "India"
  | "Indonesia"
  | "Thailand"
  | "Malaysia"
  | "Philippines"
  | "Vietnam"
  | "South Africa"
  | "Saudi Arabia"
  | "United Arab Emirates"
  | "Israel"
  | "Turkey"
  | "Other / Unclassified";

/** One country's share of a holding's value, as a percentage (0-100). */
export interface CountryWeight {
  country: Country;
  pct: number;
}

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

/** One sector's share of a holding's value, as a percentage (0-100). */
export interface SectorWeight {
  sector: Sector;
  pct: number;
}

export interface Holding {
  /** Ticker symbol, e.g. "VWRL" or "AAPL" */
  ticker: string;
  /** Full display name */
  name: string;
  assetType: AssetType;
  /**
   * Geographic breakdown of this holding. A single stock is one entry
   * at 100%; an ETF/fund is however many countries its underlying
   * holdings span, each with its share of the fund's value. Built
   * automatically when you add a holding through the app (see
   * src/lib/classify.ts and src/lib/autoClassify.ts) — this is not
   * meant to be hand-typed.
   */
  countries: CountryWeight[];
  /**
   * Sector breakdown of this holding, same shape/reasoning as
   * `countries` above.
   */
  sectors: SectorWeight[];
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
