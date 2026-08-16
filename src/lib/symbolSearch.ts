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
 * ticker, used to pre-fill the Add Holding form. Yahoo doesn't return
 * this for every symbol (ETFs especially often lack it), so every field
 * is optional — the form always lets you confirm or override via its
 * dropdowns rather than trusting this blindly. Fails silently (returns
 * {}) rather than blocking the add flow, since this is a nice-to-have.
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
