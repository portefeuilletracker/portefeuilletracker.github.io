import type { PortfolioSummary } from "../lib/calculations";

interface Props {
  summary: PortfolioSummary;
  currency?: string;
}

export default function SummaryHeader({ summary, currency = "€" }: Props) {
  const gainPositive = summary.totalGainLoss >= 0;

  return (
    <header className="mb-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-2">
        Portfolio Ledger
      </p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-5xl sm:text-6xl font-semibold tabular">
          {currency}
          {Math.round(summary.totalValue).toLocaleString()}
        </h1>
        <span
          className={`font-mono text-lg tabular ${gainPositive ? "text-gain" : "text-loss"}`}
        >
          {gainPositive ? "+" : ""}
          {currency}
          {Math.round(summary.totalGainLoss).toLocaleString()} (
          {gainPositive ? "+" : ""}
          {summary.totalGainLossPct.toFixed(1)}%)
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
        <span>
          Cost basis{" "}
          <span className="font-mono text-ink tabular">
            {currency}
            {Math.round(summary.totalCost).toLocaleString()}
          </span>
        </span>
        <span>
          Annual dividend income{" "}
          <span className="font-mono text-ink tabular">
            {currency}
            {Math.round(summary.annualDividendIncome).toLocaleString()}
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
