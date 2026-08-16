// Real currency conversion, client-side, no API key.
//
// Backed by Frankfurter (https://frankfurter.dev) — a free, open-source
// API that serves European Central Bank reference rates. Unlike the
// Yahoo endpoints elsewhere in this app, Frankfurter sends proper CORS
// headers, so this is called directly from the browser — no proxy
// needed, and nothing to break if a proxy goes down.
//
// ECB rates update once per business day around 16:00 CET, so this is
// right for "what's my portfolio worth in euros today," not for
// intraday trading decisions. Rates are cached in localStorage for a
// few hours so a normal session doesn't refetch them on every price
// refresh, and the last successful fetch is kept as a fallback if a
// later one fails — so a network hiccup never silently reverts to the
// old "treat every currency as equal" behavior.

const BASE_CURRENCY = "EUR";
const CACHE_KEY = "portfolio-tracker:fxRates";
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Map of currency code -> how many EUR one unit of that currency is worth. */
export type FxRates = Record<string, number>;

interface CachedRates {
  rates: FxRates;
  fetchedAt: number;
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedRates) : null;
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
  } catch {
    // storage unavailable - rates just won't be cached across reloads
  }
}

async function fetchRateToEur(currency: string): Promise<number> {
  if (currency === BASE_CURRENCY) return 1;
  const res = await fetch(
    `https://api.frankfurter.dev/v2/rate/${currency}/${BASE_CURRENCY}`
  );
  if (!res.ok) throw new Error(`fx: HTTP ${res.status}`);
  const data = await res.json();
  const rate = data?.rate;
  if (typeof rate !== "number") throw new Error("fx: no rate in response");
  return rate;
}

/**
 * Fetches (or reuses a recent cache of) EUR conversion rates for the
 * given currencies. Never throws: any currency that fails to fetch
 * falls back to its last cached rate if one exists, or 1 (treated as
 * EUR) only as a last resort with no prior data at all — logged to the
 * console so it's visible during development rather than silently wrong.
 */
export async function fetchFxRates(currencies: string[]): Promise<FxRates> {
  const unique = Array.from(new Set(currencies));
  const cached = readCache();
  const cacheIsFresh = cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS;

  if (cacheIsFresh && unique.every((c) => c in cached!.rates)) {
    return cached!.rates;
  }

  const rates: FxRates = { ...(cached?.rates ?? {}) };
  await Promise.all(
    unique.map(async (currency) => {
      try {
        rates[currency] = await fetchRateToEur(currency);
      } catch (err) {
        if (!(currency in rates)) {
          console.warn(`Could not fetch FX rate for ${currency}, treating as EUR 1:1`, err);
          rates[currency] = 1;
        }
        // else: keep the stale cached rate rather than a raw guess
      }
    })
  );

  writeCache(rates);
  return rates;
}

/** Converts an amount from `currency` into EUR using a fetched rates map. */
export function toEur(amount: number, currency: string, rates: FxRates): number {
  return amount * (rates[currency] ?? 1);
}

/**
 * Converts an amount between any two currencies via EUR as the bridge
 * currency. Used by the Add Holding form's "convert to EUR" helper.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: FxRates
): number {
  if (from === to) return amount;
  const eur = toEur(amount, from, rates);
  const toRate = rates[to] ?? 1;
  return eur / toRate;
}
