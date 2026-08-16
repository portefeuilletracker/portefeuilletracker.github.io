import type { AllocationSlice } from "../lib/calculations";

// A repeating palette derived from the ledger token set. Extend it if
// you commonly hold more than 8 distinct regions/sectors/types at once.
const PALETTE = [
  "#1B2A26",
  "#4C7A5E",
  "#B08D57",
  "#A6432D",
  "#7A8B87",
  "#D9C48A",
  "#3E5C56",
  "#C97B5C",
];

interface Props {
  title: string;
  slices: AllocationSlice[];
  currency?: string;
}

export default function AllocationStrip({ title, slices, currency = "€" }: Props) {
  return (
    <div className="border-t border-line pt-4">
      <h3 className="font-display text-sm uppercase tracking-[0.14em] text-ink-soft mb-3">
        {title}
      </h3>

      {/* the tape */}
      <div className="flex h-3 w-full overflow-hidden rounded-sm">
        {slices.map((slice, i) => (
          <div
            key={slice.label}
            style={{
              width: `${slice.pct}%`,
              backgroundColor: PALETTE[i % PALETTE.length],
            }}
            title={`${slice.label}: ${slice.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* legend */}
      <dl className="mt-3 grid grid-cols-1 gap-y-1.5 sm:grid-cols-2">
        {slices.map((slice, i) => (
          <div key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <dt className="truncate text-ink-soft">{slice.label}</dt>
            </div>
            <dd className="font-mono tabular text-ink shrink-0">
              {slice.pct.toFixed(1)}%
              <span className="text-ink-soft ml-2 hidden sm:inline">
                {currency}
                {Math.round(slice.value).toLocaleString()}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
