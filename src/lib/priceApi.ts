// Live price fetching, client-side, no API key.
//
// Yahoo Finance's chart endpoint is public and free but doesn't send
// CORS headers, so browsers block direct requests to it. We route
// through a free CORS proxy instead. This is an UNOFFICIAL endpoint —
// Yahoo could change or rate-limit it without notice, and has been
// increasingly blocking requests (401s) from shared IPs, which public
// proxies are. That's an acceptable tradeoff for a personal tracker
// refreshed occasionally; it is not something to build a production
// service on.
//
// To reduce how often a single blocked proxy takes the whole feature
// down, we try a short list of independent proxies per ticker and use
// whichever responds first successfully.
//
// Ticker format: use the symbol exactly as Yahoo Finance shows it.
// US tickers are bare (AAPL). Non-US listings need an exchange suffix,
// e.g. ASML.AS for ASML on Euronext Amsterdam, or VWRL.AS for a
// Amsterdam-listed ETF. Look the symbol up on finance.yahoo.com if
// you're not sure of the suffix.

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

const CORS_PROXIES: Array<(target: string) => string> = [
  (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
  (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
];

const FETCH_TIMEOUT_MS = 8000;

export interface LivePrice {
  ticker: string;
  price: number;
  currency: string;
}

export interface PriceFetchResult {
  prices: Map<string, LivePrice>;
  failedTickers: string[];
  fetchedAt: Date;
}

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function tryProxy(
  buildUrl: (target: string) => string,
  ticker: string
): Promise<LivePrice> {
  const target = `${YAHOO_CHART_URL}${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetchWithTimeout(buildUrl(target));
  if (!res.ok) throw new Error(`${ticker}: HTTP ${res.status}`);

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const currency = meta?.currency;

  if (typeof price !== "number") throw new Error(`${ticker}: no price in response`);

  return { ticker, price, currency: currency ?? "USD" };
}

/** Tries each proxy in turn for one ticker, returning the first success. */
async function fetchOnePrice(ticker: string): Promise<LivePrice> {
  let lastError: unknown;
  for (const buildUrl of CORS_PROXIES) {
    try {
      return await tryProxy(buildUrl, ticker);
    } catch (err) {
      lastError = err;
      // try the next proxy
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${ticker}: all proxies failed`);
}

/**
 * Fetches live prices for every given ticker in parallel. Tickers that
 * fail on every proxy (network error, rate limit, bad symbol) are
 * collected in failedTickers rather than failing the whole batch — the
 * caller should fall back to each holding's stored currentPrice for those.
 */
export async function fetchLivePrices(tickers: string[]): Promise<PriceFetchResult> {
  const unique = Array.from(new Set(tickers));
  const settled = await Promise.allSettled(unique.map(fetchOnePrice));

  const prices = new Map<string, LivePrice>();
  const failedTickers: string[] = [];

  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      prices.set(result.value.ticker, result.value);
    } else {
      failedTickers.push(unique[i]);
    }
  });

  return { prices, failedTickers, fetchedAt: new Date() };
}
