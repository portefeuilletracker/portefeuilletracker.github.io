import { useEffect, useRef, useState } from "react";
import type { Holding } from "./data/types";
import { computeWeightedAllocation, computePortfolioSummary } from "./lib/calculations";
import { fetchLivePrices } from "./lib/priceApi";
import { fetchFxRates, type FxRates } from "./lib/fxRates";
import { classifyHolding } from "./lib/autoClassify";
import { loadHoldings, resetHoldings, saveHoldings } from "./lib/portfolioStore";
import SummaryHeader from "./components/SummaryHeader";
import AllocationStrip from "./components/AllocationStrip";
import HoldingsTable from "./components/HoldingsTable";
import PriceStatusBar from "./components/PriceStatusBar";
import AddHoldingModal from "./components/AddHoldingModal";

type FetchStatus = "idle" | "loading" | "success" | "error";

/** True when a holding's country breakdown is just the generic "we
 *  couldn't classify this" placeholder rather than real data - worth
 *  retrying (e.g. after knownFundAllocations.ts gains a new entry)
 *  rather than treating it as a settled classification forever. */
function isUnclassified(h: Holding): boolean {
  return h.countries.length === 1 && h.countries[0].country === "Other / Unclassified";
}

export default function App() {
  // loadHoldings() also migrates any old-schema data in localStorage
  // (see portfolioStore.ts) - keep that one-time result in a ref so we
  // can kick off background re-classification for migrated tickers
  // without loading/parsing localStorage a second time.
  const initialLoadRef = useRef<ReturnType<typeof loadHoldings> | null>(null);
  if (initialLoadRef.current === null) {
    initialLoadRef.current = loadHoldings();
  }

  const [holdings, setHoldings] = useState<Holding[]>(() => initialLoadRef.current!.holdings);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);
  const [fxRates, setFxRates] = useState<FxRates>({ EUR: 1 });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);

  async function refreshPrices() {
    setStatus("loading");
    try {
      const tickers = holdings.map((h) => h.ticker);
      const currencies = holdings.map((h) => h.currency);

      const [{ prices, failedTickers, fetchedAt }, rates] = await Promise.all([
        fetchLivePrices(tickers),
        fetchFxRates(currencies),
      ]);

      // Merge live prices over the stored data. Tickers that failed to
      // fetch keep their last stored currentPrice untouched.
      setHoldings((prev) => {
        const updated = prev.map((h) => {
          const live = prices.get(h.ticker);
          return live ? { ...h, currentPrice: live.price } : h;
        });
        saveHoldings(updated);
        return updated;
      });
      setFxRates(rates);
      setFailedTickers(failedTickers);
      setFetchedAt(fetchedAt);
      setStatus(failedTickers.length === tickers.length ? "error" : "success");
    } catch {
      // Total failure (e.g. proxy down) - keep showing stored prices.
      setStatus("error");
    }
  }

  /** Re-runs classification for a specific set of holdings and merges
   *  the result in as each one resolves (not all-at-once), so the
   *  table fills in progressively rather than waiting on the slowest
   *  ticker. Used both for the initial-load retry below and the manual
   *  "Reclassify" button. */
  async function reclassify(targets: Holding[]) {
    if (targets.length === 0) return;
    setIsReclassifying(true);
    await Promise.all(
      targets.map(async (holding) => {
        const result = await classifyHolding(holding.ticker, holding.assetType, holding.name);
        setHoldings((prev) => {
          const updated = prev.map((h) =>
            h.ticker === holding.ticker
              ? { ...h, countries: result.countries, sectors: result.sectors }
              : h
          );
          saveHoldings(updated);
          return updated;
        });
      })
    );
    setIsReclassifying(false);
  }

  useEffect(() => {
    refreshPrices();

    // Two groups of holdings are worth automatically re-classifying on
    // load, using the current classifier (which checks the curated
    // known-fund table in knownFundAllocations.ts before ever touching
    // the network):
    //  1. migratedTickers - came from an older data schema and got a
    //     placeholder breakdown just so the app wouldn't crash on load.
    //  2. anything else still sitting on "Other / Unclassified" from a
    //     previous attempt - e.g. common UCITS ETFs that used to fail
    //     the live-only lookup but are now covered by the curated
    //     table, or added before that table existed.
    // Deduped by ticker so a holding in both groups is only retried once.
    const base = initialLoadRef.current?.holdings ?? [];
    const migratedTickers = new Set(initialLoadRef.current?.migratedTickers ?? []);
    const targets = base.filter((h) => migratedTickers.has(h.ticker) || isUnclassified(h));
    reclassify(targets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addHolding(holding: Holding) {
    setHoldings((prev) => {
      const updated = [...prev, holding];
      saveHoldings(updated);
      return updated;
    });
    // Fetch a fresh price (and make sure we have an FX rate for its
    // currency) so the table isn't stuck showing the manually-entered
    // placeholder or defaulting that currency to 1:1 EUR.
    Promise.all([
      fetchLivePrices([holding.ticker]),
      fetchFxRates([holding.currency]),
    ]).then(([{ prices }, rates]) => {
      setFxRates((prev) => ({ ...prev, ...rates }));
      const live = prices.get(holding.ticker);
      if (!live) return;
      setHoldings((prev) => {
        const updated = prev.map((h) =>
          h.ticker === holding.ticker ? { ...h, currentPrice: live.price } : h
        );
        saveHoldings(updated);
        return updated;
      });
    });
  }

  function removeHolding(ticker: string) {
    setHoldings((prev) => {
      const updated = prev.filter((h) => h.ticker !== ticker);
      saveHoldings(updated);
      return updated;
    });
  }

  function handleReset() {
    if (!confirm("Reset your portfolio back to the starter holdings? This can't be undone.")) {
      return;
    }
    setHoldings(resetHoldings());
  }

  const summary = computePortfolioSummary(holdings, fxRates);
  const byCountry = computeWeightedAllocation(holdings, fxRates, (h) =>
    h.countries.map((c) => ({ key: c.country, pct: c.pct }))
  );
  const bySector = computeWeightedAllocation(holdings, fxRates, (h) =>
    h.sectors.map((s) => ({ key: s.sector, pct: s.pct }))
  );
  const byAssetType = computeWeightedAllocation(holdings, fxRates, (h) => [
    { key: h.assetType, pct: 100 },
  ]);

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <SummaryHeader summary={summary} />

        <PriceStatusBar
          status={status}
          fetchedAt={fetchedAt}
          failedTickers={failedTickers}
          onRefresh={refreshPrices}
        />

        <section className="space-y-8">
          <AllocationStrip title="By Country" slices={byCountry} />
          <AllocationStrip title="By Sector" slices={bySector} />
          <AllocationStrip title="By Asset Type" slices={byAssetType} />
        </section>

        <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
          <h3 className="font-display text-sm uppercase tracking-[0.14em] text-ink-soft">
            Holdings
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => reclassify(holdings)}
              disabled={isReclassifying}
              className="text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink underline underline-offset-2 disabled:opacity-40"
            >
              {isReclassifying ? "Reclassifying…" : "Reclassify countries/sectors"}
            </button>
            <button
              onClick={handleReset}
              className="text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink underline underline-offset-2"
            >
              Reset to starter
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="rounded-sm bg-ink px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-paper hover:bg-ink/90"
            >
              + Add holding
            </button>
          </div>
        </div>

        <div className="mt-2">
          <HoldingsTable holdings={holdings} fxRates={fxRates} onRemove={removeHolding} />
        </div>

        <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-soft space-y-1">
          <p>
            Live prices via Yahoo Finance (unofficial, keyless); exchange rates via Frankfurter
            (ECB, daily) - see README for details and limitations. Your portfolio is saved in
            this browser only (localStorage) - it won't sync across devices.
          </p>
        </footer>
      </main>

      <AddHoldingModal
        isOpen={isAddOpen}
        existingTickers={holdings.map((h) => h.ticker)}
        fxRates={fxRates}
        onClose={() => setIsAddOpen(false)}
        onAdd={addHolding}
      />
    </div>
  );
}
