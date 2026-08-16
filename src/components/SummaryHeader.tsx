import type { PortfolioSummary } from "../lib/calculations";

interface Props {
  summary: PortfolioSummary;
}

// All summary figures are computed in EUR (see calculations.ts), so
// this always displays with the euro sign — no currency prop needed.
export default function SummaryHeader({ summary }: Props) {
  const gainPositive = summary.totalGainLossEur >= 0;

  return (
    <header className="mb-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-2">
        Portfolio Ledger
      </p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-5xl sm:text-6xl font-semibold tabular">
          €{Math.round(summary.totalValueEur).toLocaleString()}
        </h1>
        <span
          className={`font-mono text-lg tabular ${gainPositive ? "text-gain" : "text-loss"}`}
        >
          {gainPositive ? "+" : ""}€{Math.round(summary.totalGainLossEur).toLocaleString()} (
          {gainPositive ? "+" : ""}
          {summary.totalGainLossPct.toFixed(1)}%)
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
        <span>
          Cost basis{" "}
          <span className="font-mono text-ink tabular">
            €{Math.round(summary.totalCostEur).toLocaleString()}
          </span>
        </span>
        <span>
          Annual dividend income{" "}
          <span className="font-mono text-ink tabular">
            €{Math.round(summary.annualDividendIncomeEur).toLocaleString()}
          </span>
        </span>
        <span>
          Portfolio yield{" "}
          <span className="font-mono text-ink tabular">
            {summary.portfolioYieldPct.toFixed(2)}%
          </span>
        </span>
      </div>
    </header>
  );
}
