import type { Holding } from "../data/types";
import type { FxRates } from "./fxRates";
import { toEur } from "./fxRates";

// All portfolio-level totals (summary, allocations) are computed in
// EUR. Each holding keeps its own native currency for display (its
// per-share price, in the HoldingsTable), but every aggregate figure
// is converted through fxRates first — see fxRates.ts for where those
// rates come from and their caveats.

export interface HoldingMetrics {
  holding: Holding;
  /** Market value in the holding's own currency. */
  marketValue: number;
  /** Market value converted to EUR. */
  marketValueEur: number;
  costBasis: number;
  costBasisEur: number;
  gainLoss: number;
  gainLossPct: number;
  annualDividendIncome: number;
  annualDividendIncomeEur: number;
}

export function computeHoldingMetrics(h: Holding, fxRates: FxRates): HoldingMetrics {
  const marketValue = h.shares * h.currentPrice;
  const costBasis = h.shares * h.avgCost;
  const gainLoss = marketValue - costBasis;
  const gainLossPct = costBasis === 0 ? 0 : (gainLoss / costBasis) * 100;
  const annualDividendIncome = h.shares * h.annualDividendPerShare;

  return {
    holding: h,
    marketValue,
    marketValueEur: toEur(marketValue, h.currency, fxRates),
    costBasis,
    costBasisEur: toEur(costBasis, h.currency, fxRates),
    gainLoss,
    gainLossPct,
    annualDividendIncome,
    annualDividendIncomeEur: toEur(annualDividendIncome, h.currency, fxRates),
  };
}

export interface PortfolioSummary {
  totalValueEur: number;
  totalCostEur: number;
  totalGainLossEur: number;
  totalGainLossPct: number;
  annualDividendIncomeEur: number;
  portfolioYieldPct: number;
}

export function computePortfolioSummary(holdings: Holding[], fxRates: FxRates): PortfolioSummary {
  const metrics = holdings.map((h) => computeHoldingMetrics(h, fxRates));
  const totalValueEur = sum(metrics.map((m) => m.marketValueEur));
  const totalCostEur = sum(metrics.map((m) => m.costBasisEur));
  const totalGainLossEur = totalValueEur - totalCostEur;
  const totalGainLossPct = totalCostEur === 0 ? 0 : (totalGainLossEur / totalCostEur) * 100;
  const annualDividendIncomeEur = sum(metrics.map((m) => m.annualDividendIncomeEur));
  const portfolioYieldPct = totalValueEur === 0 ? 0 : (annualDividendIncomeEur / totalValueEur) * 100;

  return {
    totalValueEur,
    totalCostEur,
    totalGainLossEur,
    totalGainLossPct,
    annualDividendIncomeEur,
    portfolioYieldPct,
  };
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
}

/**
 * Groups holdings by an arbitrary key (region, sector, assetType) and
 * returns each group's share of total portfolio value (in EUR),
 * sorted largest first.
 */
export function computeAllocation(
  holdings: Holding[],
  fxRates: FxRates,
  groupBy: (h: Holding) => string
): AllocationSlice[] {
  const metrics = holdings.map((h) => computeHoldingMetrics(h, fxRates));
  const totalValueEur = sum(metrics.map((m) => m.marketValueEur));

  const groups = new Map<string, number>();
  for (const m of metrics) {
    const key = groupBy(m.holding);
    groups.set(key, (groups.get(key) ?? 0) + m.marketValueEur);
  }

  const slices = Array.from(groups.entries()).map(([label, value]) => ({
    label,
    value,
    pct: totalValueEur === 0 ? 0 : (value / totalValueEur) * 100,
  }));

  return slices.sort((a, b) => b.value - a.value);
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
