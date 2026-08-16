import { computeHoldingMetrics } from "../lib/calculations";
import type { CountryWeight, Holding, SectorWeight } from "../data/types";
import type { FxRates } from "../lib/fxRates";

interface Props {
  holdings: Holding[];
  fxRates: FxRates;
  onRemove?: (ticker: string) => void;
}

const CURRENCY_SYMBOL: Record<Holding["currency"], string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

/**
 * Renders a breakdown array (countries or sectors) as a compact,
 * truncated summary line with a full-detail tooltip — e.g.
 * "US 62% · Japan 6% · +5 more" with every entry in the title attr.
 */
function BreakdownSummary({ items }: { items: { label: string; pct: number }[] }) {
  if (items.length === 0) return <span className="text-ink-soft">—</span>;
  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  const shown = sorted.slice(0, 2);
  const rest = sorted.length - shown.length;
  const full = sorted.map((i) => `${i.label} ${i.pct.toFixed(0)}%`).join(", ");

  return (
    <span title={full} className="cursor-help">
      {shown.map((i) => `${i.label} ${i.pct.toFixed(0)}%`).join(" · ")}
      {rest > 0 && <span className="text-ink-soft"> · +{rest} more</span>}
    </span>
  );
}

function countryItems(countries: CountryWeight[]) {
  return countries.map((c) => ({ label: c.country, pct: c.pct }));
}

function sectorItems(sectors: SectorWeight[]) {
  return sectors.map((s) => ({ label: s.sector, pct: s.pct }));
}

export default function HoldingsTable({ holdings, fxRates, onRemove }: Props) {
  const rows = holdings
    .map((h) => computeHoldingMetrics(h, fxRates))
    .sort((a, b) => b.marketValueEur - a.marketValueEur);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft border-b border-line">
              <th className="py-2 pr-4 font-normal">Ticker</th>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Type</th>
              <th className="py-2 pr-4 font-normal">Countries</th>
              <th className="py-2 pr-4 font-normal">Sectors</th>
              <th className="py-2 pr-4 font-normal text-right">Shares</th>
              <th className="py-2 pr-4 font-normal text-right">Price</th>
              <th className="py-2 pr-4 font-normal text-right">Value (EUR)</th>
              <th className="py-2 font-normal text-right">Gain/Loss</th>
              {onRemove && <th className="py-2 pl-4 font-normal text-right sr-only">Remove</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ holding, marketValueEur, gainLoss, gainLossPct }) => {
              const sym = CURRENCY_SYMBOL[holding.currency];
              const positive = gainLoss >= 0;
              return (
                <tr key={holding.ticker} className="border-b border-line/60">
                  <td className="py-2.5 pr-4 font-mono text-ink">
                    {holding.ticker}
                    {holding.referenceCode && (
                      <span className="block font-sans text-[10px] text-ink-soft">
                        {holding.referenceCode}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{holding.name}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{holding.assetType}</td>
                  <td className="py-2.5 pr-4 text-ink-soft text-xs whitespace-nowrap">
                    <BreakdownSummary items={countryItems(holding.countries)} />
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft text-xs whitespace-nowrap">
                    <BreakdownSummary items={sectorItems(holding.sectors)} />
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">{holding.shares}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">
                    {sym}
                    {holding.currentPrice.toFixed(2)}
                    {holding.currency !== "EUR" && (
                      <span className="block text-[10px] text-ink-soft">
                        {holding.currency}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular">
                    €{Math.round(marketValueEur).toLocaleString()}
                  </td>
                  <td
                    className={`py-2.5 text-right font-mono tabular ${
                      positive ? "text-gain" : "text-loss"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {gainLossPct.toFixed(1)}%
                  </td>
                  {onRemove && (
                    <td className="py-2.5 pl-4 text-right">
                      <button
                        onClick={() => onRemove(holding.ticker)}
                        aria-label={`Remove ${holding.ticker}`}
                        className="text-ink-soft hover:text-loss font-mono text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
