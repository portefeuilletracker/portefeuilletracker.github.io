// Shared list of free, keyless CORS proxies used to reach Yahoo Finance's
// public (but CORS-blocked) endpoints directly from the browser. See
// priceApi.ts for the full rationale and caveats — the same tradeoffs
// apply everywhere this is used (symbolSearch.ts too): these are
// unofficial, best-effort, and can go down or rate-limit without notice.

export const CORS_PROXIES: Array<(target: string) => string> = [
  (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
  (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
];

const FETCH_TIMEOUT_MS = 8000;

export function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
