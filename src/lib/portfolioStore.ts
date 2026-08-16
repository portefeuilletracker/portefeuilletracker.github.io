// Persistence for the working portfolio. This is a static, no-backend
// site, so "your portfolio" lives in the browser's localStorage rather
// than in git — holdings.ts becomes just the *starter* portfolio used
// to seed a fresh browser, and the "reset" option below to get back to.
//
// Everything you add or remove via the UI is saved here immediately, and
// reloaded on your next visit (same browser/device only — this doesn't
// sync across devices).

import type { Holding } from "../data/types";
import { holdings as starterHoldings } from "../data/holdings";

const STORAGE_KEY = "portfolio-tracker:holdings";

export function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Holding[];
  } catch {
    // corrupted or inaccessible storage - fall back to the starter portfolio
  }
  return starterHoldings;
}

export function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch {
    // storage unavailable (private browsing, quota exceeded, etc.) -
    // changes still work for this session, just won't persist on reload
  }
}

/** Wipes your saved changes and goes back to the repo's starter holdings. */
export function resetHoldings(): Holding[] {
  saveHoldings(starterHoldings);
  return starterHoldings;
}
