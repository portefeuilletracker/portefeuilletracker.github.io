// Search for stocks and ETFs by ticker or company name, and best-effort
// classification data (sector/industry/country) for a chosen symbol.
// Same unofficial, keyless, CORS-proxied approach as priceApi.ts — see
// that file for the full rationale and caveats.

import { CORS_PROXIES, fetchWithTimeout } from "./corsProxy";

const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_QUOTE_SUMMARY_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/";

export interface SymbolMatch {
  ticker: string;
  name: string;
  exchange: string;
  /** Yahoo's quoteType, e.g. "EQUITY" or "ETF". */
  quoteType: string;
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
}

async function searchViaProxy(
  buildUrl: (target: string) => string,
  query: string
): Promise<SymbolMatch[]> {
  const target = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
  const res = await fetchWithTimeout(buildUrl(target));
  if (!res.ok) throw new Error(`search: HTTP ${res.status}`);

  const data = await res.json();
  const quotes: YahooSearchQuote[] = data?.quotes ?? [];

  return quotes
    .filter((q) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
    .map((q) => ({
      ticker: q.symbol as string,
      name: q.longname ?? q.shortname ?? (q.symbol as string),
      exchange: q.exchDisp ?? "",
      quoteType: q.quoteType as string,
    }));
}

/**
 * Searches Yahoo Finance's symbol database for stocks and ETFs matching
 * a free-text query (ticker or company/fund name) — effectively every
 * symbol Yahoo Finance lists, which covers the vast majority of
 * publicly traded stocks and ETFs worldwide.
 */
export async function searchSymbols(query: string): Promise<SymbolMatch[]> {
  if (query.trim().length < 1) return [];

  let lastError: unknown;
  for (const buildUrl of CORS_PROXIES) {
    try {
      return await searchViaProxy(buildUrl, query);
    } catch (err) {
      lastError = err;
      // try the next proxy
    }
  }
  throw lastError instanceof Error ? lastError : new Error("search: all proxies failed");
}

export interface SymbolProfile {
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
}

async function profileViaProxy(
  buildUrl: (target: string) => string,
  ticker: string
): Promise<SymbolProfile> {
  const target = `${YAHOO_QUOTE_SUMMARY_URL}${encodeURIComponent(
    ticker
  )}?modules=summaryProfile,price`;
  const res = await fetchWithTimeout(buildUrl(target));
  if (!res.ok) throw new Error(`profile: HTTP ${res.status}`);

  const data = await res.json();
  const result = data?.quoteSummary?.result?.[0];

  return {
    sector: result?.summaryProfile?.sector,
    industry: result?.summaryProfile?.industry,
    country: result?.summaryProfile?.country,
    currency: result?.price?.currency,
  };
}

/**
 * Best-effort fetch of sector/industry/country/currency for a single
 * ticker, used to auto-classify a stock (single country/sector at
 * 100%) and to resolve the country of each of a fund's top holdings.
 * Yahoo doesn't return this for every symbol, so every field is
 * optional. Fails silently (returns {}) rather than blocking the add
 * flow.
 */
export async function fetchSymbolProfile(ticker: string): Promise<SymbolProfile> {
  for (const buildUrl of CORS_PROXIES) {
    try {
      return await profileViaProxy(buildUrl, ticker);
    } catch {
      // try next proxy, then give up quietly
    }
  }
  return {};
}

export interface FundTopHolding {
  symbol: string;
  name: string;
  /** This holding's share of the fund's total value, 0-100. */
  pctOfFund: number;
}

export interface FundBreakdown {
  /** Raw Yahoo sector-weighting keys with their fraction (0-1) of the fund. */
  sectorWeightings: { key: string; fraction: number }[];
  /** The fund's disclosed top holdings (Yahoo typically gives up to ~10). */
  topHoldings: FundTopHolding[];
}

async function fundBreakdownViaProxy(
  buildUrl: (target: string) => string,
  ticker: string
): Promise<FundBreakdown> {
  const target = `${YAHOO_QUOTE_SUMMARY_URL}${encodeURIComponent(ticker)}?modules=topHoldings`;
  const res = await fetchWithTimeout(buildUrl(target));
  if (!res.ok) throw new Error(`fundBreakdown: HTTP ${res.status}`);

  const data = await res.json();
  const result = data?.quoteSummary?.result?.[0]?.topHoldings;

  const sectorWeightings: { key: string; fraction: number }[] = (result?.sectorWeightings ?? []).map(
    (entry: Record<string, { raw?: number }>) => {
      const key = Object.keys(entry)[0];
      return { key, fraction: entry[key]?.raw ?? 0 };
    }
  );

  const topHoldings: FundTopHolding[] = (result?.holdings ?? []).map(
    (h: { symbol?: string; holdingName?: string; holdingPercent?: { raw?: number } }) => ({
      symbol: h.symbol ?? "",
      name: h.holdingName ?? h.symbol ?? "",
      pctOfFund: (h.holdingPercent?.raw ?? 0) * 100,
    })
  );

  return { sectorWeightings, topHoldings };
}

/**
 * Best-effort fetch of an ETF/fund's sector weightings and top
 * holdings, used to automatically build its country and sector
 * breakdown (see autoClassify.ts). Not every fund has this data on
 * Yahoo (bond funds especially) — callers should treat an empty
 * result as "couldn't classify" rather than "invested in nothing".
 */
export async function fetchFundBreakdown(ticker: string): Promise<FundBreakdown> {
  for (const buildUrl of CORS_PROXIES) {
    try {
      return await fundBreakdownViaProxy(buildUrl, ticker);
    } catch {
      // try next proxy, then give up quietly
    }
  }
  return { sectorWeightings: [], topHoldings: [] };
}
