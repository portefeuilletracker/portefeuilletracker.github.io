import { computeHoldingMetrics } from "../lib/calculations";
import type { Holding } from "../data/types";

interface Props {
  holdings: Holding[];
}

const CURRENCY_SYMBOL: Record<Holding["currency"], string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

export default function HoldingsTable({ holdings }: Props) {
  const rows = holdings.map(computeHoldingMetrics).sort((a, b) => b.marketValue - a.marketValue);

  return (
    <div className="border-t border-line pt-4">
      <h3 className="font-display text-sm uppercase tracking-[0.14em] text-ink-soft mb-3">
        Holdings
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft border-b border-line">
              <th className="py-2 pr-4 font-normal">Ticker</th>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Type</th>
              <th className="py-2 pr-4 font-normal text-right">Shares</th>
              <th className="py-2 pr-4 font-normal text-right">Price</th>
              <th className="py-2 pr-4 font-normal text-right">Value</th>
              <th className="py-2 font-normal text-right">Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ holding, marketValue, gainLoss, gainLossPct }) => {
              const sym = CURRENCY_SYMBOL[holding.currency];
              const positive = gainLoss >= 0;
              return (
                <tr key={holding.ticker} className="border-b border-line/60">
                  <td className="py-2.5 pr-4 font-mono text-ink">{holding.ticker}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{holding.name}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{holding.assetType}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">{holding.shares}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">
                    {sym}
                    {holding.currentPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">
                    {sym}
                    {Math.round(marketValue).toLocaleString()}
                  </td>
                  <td
                    className={`py-2.5 text-right font-mono tabular ${
                      positive ? "text-gain" : "text-loss"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {gainLossPct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
