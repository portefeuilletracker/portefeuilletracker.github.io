// Persistence for the working portfolio. This is a static, no-backend
// site, so "your portfolio" lives in the browser's localStorage rather
// than in git — holdings.ts becomes just the *starter* portfolio used
// to seed a fresh browser, and the "reset" option below to get back to.
//
// Everything you add or remove via the UI is saved here immediately, and
// reloaded on your next visit (same browser/device only — this doesn't
// sync across devices).
//
// SCHEMA MIGRATION: this data model used to store one region + one
// sector per holding as plain strings; it's since moved to a
// countries[]/sectors[] breakdown (see data/types.ts). Anything already
// saved in a browser from before that change is missing the new
// fields, and just JSON.parse-ing and trusting it produces a Holding
// object where .countries and .sectors are undefined — which crashes
// the app the moment something calls .map() on them (blank page).
// loadHoldings() below normalizes every holding on the way in so that
// can't happen: old-shaped entries get a safe "Other / Unclassified" /
// "Diversified / Multi-Sector" placeholder instead of a missing field,
// and are flagged in migratedTickers so the caller can kick off a
// proper re-classification against live data (see App.tsx).

import type { Country, CountryWeight, Holding, Sector, SectorWeight } from "../data/types";
import { holdings as starterHoldings } from "../data/holdings";

const STORAGE_KEY = "portfolio-tracker:holdings";

const FALLBACK_COUNTRY: Country = "Other / Unclassified";
const FALLBACK_SECTOR: Sector = "Diversified / Multi-Sector";
const FALLBACK_COUNTRIES: CountryWeight[] = [{ country: FALLBACK_COUNTRY, pct: 100 }];
const FALLBACK_SECTORS: SectorWeight[] = [{ sector: FALLBACK_SECTOR, pct: 100 }];

// Mirrors the Sector union in data/types.ts, purely to validate an old
// holding's single `sector: string` field before trusting it as a
// placeholder — see normalizeHolding below. The old sector vocabulary
// happens to be identical to the new one (only the shape changed, from
// one sector to a weighted list), so a valid old value is worth
// preserving as an interim 100% entry rather than discarding.
const VALID_SECTORS = new Set<string>([
  "Technology",
  "Financials",
  "Healthcare",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
  "Communication Services",
  "Diversified / Multi-Sector",
  "Cash",
]);

function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/** Loosely checks the fields every holding needs regardless of schema
 *  version — anything failing this is too corrupted to recover and gets
 *  dropped rather than crash the whole load. */
function hasCoreFields(raw: unknown): raw is Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.ticker === "string" &&
    typeof r.name === "string" &&
    typeof r.assetType === "string" &&
    typeof r.shares === "number" &&
    typeof r.avgCost === "number" &&
    typeof r.currentPrice === "number" &&
    typeof r.currency === "string"
  );
}

/** Upgrades one stored holding to the current schema. Returns
 *  migrated: true when countries/sectors had to be filled in because
 *  the saved data predates that field — the caller should queue a
 *  proper re-classification for those. Where the old data had a usable
 *  single region/sector, that's kept as an interim placeholder (better
 *  than a generic "Unclassified") rather than discarded outright. */
function normalizeHolding(raw: Record<string, unknown>): { holding: Holding; migrated: boolean } {
  const hasCountries = isNonEmptyArray(raw.countries);
  const hasSectors = isNonEmptyArray(raw.sectors);

  // Old holdings had `region: string`, e.g. "Netherlands" or "Europe".
  // Only "Netherlands" happens to also be a valid Country value in the
  // new vocabulary - the other old regions were macro groupings
  // ("Europe", "Emerging Markets", ...) with no single-country
  // equivalent, so those fall through to the generic fallback instead
  // of a wrong guess.
  const legacyRegion = typeof raw.region === "string" ? raw.region : undefined;
  const countries: CountryWeight[] = hasCountries
    ? (raw.countries as CountryWeight[])
    : legacyRegion === "Netherlands"
    ? [{ country: "Netherlands", pct: 100 }]
    : FALLBACK_COUNTRIES;

  const legacySector = typeof raw.sector === "string" ? raw.sector : undefined;
  const sectors: SectorWeight[] = hasSectors
    ? (raw.sectors as SectorWeight[])
    : legacySector && VALID_SECTORS.has(legacySector)
    ? [{ sector: legacySector as Sector, pct: 100 }]
    : FALLBACK_SECTORS;

  const holding: Holding = {
    ticker: raw.ticker as string,
    name: raw.name as string,
    assetType: raw.assetType as Holding["assetType"],
    countries,
    sectors,
    shares: raw.shares as number,
    avgCost: raw.avgCost as number,
    currentPrice: raw.currentPrice as number,
    currency: raw.currency as Holding["currency"],
    annualDividendPerShare:
      typeof raw.annualDividendPerShare === "number" ? raw.annualDividendPerShare : 0,
    broker: typeof raw.broker === "string" ? raw.broker : undefined,
    referenceCode: typeof raw.referenceCode === "string" ? raw.referenceCode : undefined,
  };

  // Still flag as migrated even when we preserved a legacy value: a
  // single old region/sector is a coarser placeholder than the real,
  // weighted breakdown re-classification will produce.
  return { holding, migrated: !hasCountries || !hasSectors };
}

export interface LoadResult {
  holdings: Holding[];
  /** Tickers that were on the old region/sector schema and got a
   *  placeholder breakdown — worth re-classifying against live data
   *  rather than leaving as "Other / Unclassified" forever. */
  migratedTickers: string[];
}

export function loadHoldings(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("stored portfolio is not an array");

      const results = parsed.filter(hasCoreFields).map(normalizeHolding);
      const holdings = results.map((r) => r.holding);
      const migratedTickers = results.filter((r) => r.migrated).map((r) => r.holding.ticker);

      if (migratedTickers.length > 0) {
        // Persist the normalized shape right away, so if something
        // interrupts re-classification the app still loads cleanly
        // next time instead of re-crashing on the raw old data.
        saveHoldings(holdings);
      }

      return { holdings, migratedTickers };
    }
  } catch {
    // corrupted or inaccessible storage - fall back to the starter portfolio
  }
  return { holdings: starterHoldings, migratedTickers: [] };
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
