import { holdings } from "./data/holdings";
import { computeAllocation, computePortfolioSummary } from "./lib/calculations";
import SummaryHeader from "./components/SummaryHeader";
import AllocationStrip from "./components/AllocationStrip";
import HoldingsTable from "./components/HoldingsTable";

export default function App() {
  const summary = computePortfolioSummary(holdings);
  const byRegion = computeAllocation(holdings, (h) => h.region);
  const bySector = computeAllocation(holdings, (h) => h.sector);
  const byAssetType = computeAllocation(holdings, (h) => h.assetType);

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <SummaryHeader summary={summary} />

        <section className="space-y-8">
          <AllocationStrip title="By Region" slices={byRegion} />
          <AllocationStrip title="By Sector" slices={bySector} />
          <AllocationStrip title="By Asset Type" slices={byAssetType} />
        </section>

        <div className="mt-10">
          <HoldingsTable holdings={holdings} />
        </div>

        <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-soft">
          Prices updated by hand — see README for next steps.
        </footer>
      </main>
    </div>
  );
}
