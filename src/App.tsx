import { useEffect, useState } from "react";
import { holdings as storedHoldings } from "./data/holdings";
import type { Holding } from "./data/types";
import { computeAllocation, computePortfolioSummary } from "./lib/calculations";
import { fetchLivePrices } from "./lib/priceApi";
import SummaryHeader from "./components/SummaryHeader";
import AllocationStrip from "./components/AllocationStrip";
import HoldingsTable from "./components/HoldingsTable";
import PriceStatusBar from "./components/PriceStatusBar";

type FetchStatus = "idle" | "loading" | "success" | "error";

export default function App() {
  const [holdings, setHoldings] = useState<Holding[]>(storedHoldings);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);

  async function refreshPrices() {
    setStatus("loading");
    try {
      const { prices, failedTickers, fetchedAt } = await fetchLivePrices(
        storedHoldings.map((h) => h.ticker)
      );

      // Merge live prices over the stored data. Tickers that failed to
      // fetch keep their last stored currentPrice untouched.
      const updated = storedHoldings.map((h) => {
        const live = prices.get(h.ticker);
        return live ? { ...h, currentPrice: live.price } : h;
      });

      setHoldings(updated);
      setFailedTickers(failedTickers);
      setFetchedAt(fetchedAt);
      setStatus(failedTickers.length === storedHoldings.length ? "error" : "success");
    } catch {
      // Total failure (e.g. proxy down) - keep showing stored prices.
      setStatus("error");
    }
  }

  useEffect(() => {
    refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = computePortfolioSummary(holdings);
  const byRegion = computeAllocation(holdings, (h) => h.region);
  const bySector = computeAllocation(holdings, (h) => h.sector);
  const byAssetType = computeAllocation(holdings, (h) => h.assetType);

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
          <AllocationStrip title="By Region" slices={byRegion} />
          <AllocationStrip title="By Sector" slices={bySector} />
          <AllocationStrip title="By Asset Type" slices={byAssetType} />
        </section>

        <div className="mt-10">
          <HoldingsTable holdings={holdings} />
        </div>

        <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-soft">
          Live prices via Yahoo Finance (unofficial, keyless) - see README for details and
          limitations.
        </footer>
      </main>
    </div>
  );
}
