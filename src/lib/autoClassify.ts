// Ties symbolSearch.ts (raw Yahoo data) and classify.ts (mapping onto
// our vocabularies) together into one call: given a ticker, produce the
// country and sector breakdown to store on the holding. This is what
// the Add Holding form calls instead of showing you a dropdown — see
// AddHoldingModal.tsx.
//
// For a single stock/REIT/bond, this is one country and one sector at
// 100% each, straight from Yahoo's profile data.
//
// For an ETF, this is genuinely harder: Yahoo's public API gives a
// fund's sector weightings directly (reliable, usually sums close to
// 100%) but no country weightings at all. The closest available proxy
// is to look up the country of each of the fund's disclosed top
// holdings (Yahoo gives ~10) and weight by each one's % of the fund.
// For a fund holding a handful of large positions this covers most of
// its value; for a broad index fund with thousands of holdings (e.g. a
// total-world tracker) the top 10 might only be 15-20% of assets — the
// rest is honestly labelled "Other / Unclassified" rather than guessed
// at. This is a real limitation of not having a paid holdings
// look-through data source; see the README.

import type { AssetType, Country, CountryWeight, SectorWeight } from "../data/types";
import { findKnownFundAllocation } from "../data/knownFundAllocations";
import {
  fetchFundBreakdown,
  fetchSymbolProfile,
  type FundTopHolding,
} from "./symbolSearch";
import { buildCountryWeights, mapCountry, mapFundSectorWeightings, mapStockSector } from "./classify";

export interface ClassificationResult {
  countries: CountryWeight[];
  sectors: SectorWeight[];
  /**
   * True if this came back as an honest "couldn't classify" fallback
   * (100% Other / Diversified) rather than real data — worth surfacing
   * in the UI so it doesn't look like a confident answer.
   */
  isFallback: boolean;
}

const FALLBACK: ClassificationResult = {
  countries: [{ country: "Other / Unclassified", pct: 100 }],
  sectors: [{ sector: "Diversified / Multi-Sector", pct: 100 }],
  isFallback: true,
};

/** Resolves the country of each of a fund's top holdings, in parallel. */
async function resolveTopHoldingCountries(
  topHoldings: FundTopHolding[]
): Promise<{ country: Country; pctOfFund: number }[]> {
  // Yahoo discloses at most ~10 top holdings anyway; cap defensively so
  // a single malformed response can't trigger a burst of requests.
  const capped = topHoldings.slice(0, 10).filter((h) => h.symbol && h.pctOfFund > 0);

  const settled = await Promise.allSettled(
    capped.map(async (h) => {
      const profile = await fetchSymbolProfile(h.symbol);
      return { country: mapCountry(profile.country), pctOfFund: h.pctOfFund };
    })
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<{ country: Country; pctOfFund: number }> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function classifyStock(ticker: string): Promise<ClassificationResult> {
  const profile = await fetchSymbolProfile(ticker);
  if (!profile.country && !profile.sector) return FALLBACK;

  return {
    countries: [{ country: mapCountry(profile.country), pct: 100 }],
    sectors: [{ sector: mapStockSector(profile.sector), pct: 100 }],
    isFallback: false,
  };
}

async function classifyFund(ticker: string, name: string): Promise<ClassificationResult> {
  const known = findKnownFundAllocation(ticker, name);
  if (known) {
    // Curated, sourced data - see knownFundAllocations.ts for why this
    // is checked before any network call. Sector data isn't always
    // curated (see that file's comment); when it's missing here, still
    // attempt the live per-fund sector lookup, which draws on a
    // different Yahoo endpoint than the top-holdings country lookup
    // and tends to work even when that one doesn't.
    let sectors = known.sectors;
    if (!sectors) {
      try {
        const fund = await fetchFundBreakdown(ticker);
        sectors = fund.sectorWeightings.length > 0 ? mapFundSectorWeightings(fund.sectorWeightings) : undefined;
      } catch {
        // fine - fall through to the fallback sector bucket below
      }
    }
    return {
      countries: known.countries,
      sectors: sectors ?? FALLBACK.sectors,
      isFallback: false,
    };
  }

  const fund = await fetchFundBreakdown(ticker);
  if (fund.sectorWeightings.length === 0 && fund.topHoldings.length === 0) return FALLBACK;

  const resolvedCountries = await resolveTopHoldingCountries(fund.topHoldings);

  return {
    countries: buildCountryWeights(resolvedCountries),
    sectors:
      fund.sectorWeightings.length > 0
        ? mapFundSectorWeightings(fund.sectorWeightings)
        : FALLBACK.sectors,
    isFallback: false,
  };
}

/**
 * Automatically classifies a holding's country and sector breakdown.
 * For ETFs, checks the curated known-fund table first (see
 * knownFundAllocations.ts) before falling back to a live Yahoo lookup.
 * Never throws — any failure degrades to the "Other / Unclassified" +
 * "Diversified / Multi-Sector" fallback so the add flow always completes.
 */
export async function classifyHolding(
  ticker: string,
  assetType: AssetType,
  name = ""
): Promise<ClassificationResult> {
  try {
    return assetType === "ETF" ? await classifyFund(ticker, name) : await classifyStock(ticker);
  } catch {
    return FALLBACK;
  }
}
