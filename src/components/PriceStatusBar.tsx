interface Props {
  status: "idle" | "loading" | "success" | "error";
  fetchedAt: Date | null;
  failedTickers: string[];
  onRefresh: () => void;
}

export default function PriceStatusBar({ status, fetchedAt, failedTickers, onRefresh }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-soft">
      <div>
        {status === "loading" && <span>Fetching live prices…</span>}
        {status === "success" && fetchedAt && (
          <span>
            Prices as of{" "}
            <span className="font-mono text-ink">
              {fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {failedTickers.length > 0 && (
              <span className="text-loss">
                {" "}
                — couldn't refresh {failedTickers.join(", ")}, showing last known price
              </span>
            )}
          </span>
        )}
        {status === "error" && (
          <span className="text-loss">Couldn't reach live prices — showing last known prices</span>
        )}
        {status === "idle" && <span>Prices not yet loaded</span>}
      </div>
      <button
        onClick={onRefresh}
        disabled={status === "loading"}
        className="font-mono uppercase tracking-wide text-ink-soft hover:text-ink underline underline-offset-2 disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
}
