import type { Holding } from "../data/types";

// NOTE on currency: for this first version we treat 1 USD == 1 GBP == 1 EUR
// when summing totals, so mixed-currency portfolios will be slightly off.
// Real FX conversion is a "next step" — see README.

export interface HoldingMetrics {
  holding: Holding;
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPct: number;
  annualDividendIncome: number;
}

export function computeHoldingMetrics(h: Holding): HoldingMetrics {
  const marketValue = h.shares * h.currentPrice;
  const costBasis = h.shares * h.avgCost;
  const gainLoss = marketValue - costBasis;
  const gainLossPct = costBasis === 0 ? 0 : (gainLoss / costBasis) * 100;
  const annualDividendIncome = h.shares * h.annualDividendPerShare;

  return { holding: h, marketValue, costBasis, gainLoss, gainLossPct, annualDividendIncome };
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  annualDividendIncome: number;
  portfolioYieldPct: number;
}

export function computePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  const metrics = holdings.map(computeHoldingMetrics);
  const totalValue = sum(metrics.map((m) => m.marketValue));
  const totalCost = sum(metrics.map((m) => m.costBasis));
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost === 0 ? 0 : (totalGainLoss / totalCost) * 100;
  const annualDividendIncome = sum(metrics.map((m) => m.annualDividendIncome));
  const portfolioYieldPct = totalValue === 0 ? 0 : (annualDividendIncome / totalValue) * 100;

  return { totalValue, totalCost, totalGainLoss, totalGainLossPct, annualDividendIncome, portfolioYieldPct };
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
}

/**
 * Groups holdings by an arbitrary key (region, sector, assetType) and
 * returns each group's share of total portfolio value, sorted largest first.
 */
export function computeAllocation(
  holdings: Holding[],
  groupBy: (h: Holding) => string
): AllocationSlice[] {
  const metrics = holdings.map(computeHoldingMetrics);
  const totalValue = sum(metrics.map((m) => m.marketValue));

  const groups = new Map<string, number>();
  for (const m of metrics) {
    const key = groupBy(m.holding);
    groups.set(key, (groups.get(key) ?? 0) + m.marketValue);
  }

  const slices = Array.from(groups.entries()).map(([label, value]) => ({
    label,
    value,
    pct: totalValue === 0 ? 0 : (value / totalValue) * 100,
  }));

  return slices.sort((a, b) => b.value - a.value);
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
