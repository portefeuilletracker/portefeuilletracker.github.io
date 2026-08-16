import { useEffect, useRef, useState } from "react";
import type { AssetType, Holding, Region, Sector } from "../data/types";
import { fetchSymbolProfile, searchSymbols, type SymbolMatch } from "../lib/symbolSearch";
import { fetchLivePrices } from "../lib/priceApi";
import { mapAssetType, mapRegion, mapSector } from "../lib/classify";

const ASSET_TYPES: AssetType[] = ["Stock", "ETF", "Bond", "REIT", "Crypto", "Cash"];
const REGIONS: Region[] = [
  "North America",
  "Europe",
  "Emerging Markets",
  "Asia-Pacific",
  "Global / Diversified",
  "Netherlands",
];
const SECTORS: Sector[] = [
  "Technology",
  "Financials",
  "Healthcare",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
  "Communication Services",
  "Diversified / Multi-Sector",
  "Cash",
];
const CURRENCIES: Holding["currency"][] = ["EUR", "USD", "GBP"];

interface Props {
  isOpen: boolean;
  existingTickers: string[];
  onClose: () => void;
  onAdd: (holding: Holding) => void;
}

type Step = "search" | "form";

const emptyForm = {
  ticker: "",
  name: "",
  assetType: "Stock" as AssetType,
  region: "Global / Diversified" as Region,
  sector: "Diversified / Multi-Sector" as Sector,
  shares: "",
  avgCost: "",
  currentPrice: "",
  currency: "EUR" as Holding["currency"],
  broker: "",
  referenceCode: "",
};

export default function AddHoldingModal({ isOpen, existingTickers, onClose, onAdd }: Props) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolMatch[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [manualEntry, setManualEntry] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // reset everything when the modal closes so it opens fresh next time
      setStep("search");
      setQuery("");
      setResults([]);
      setManualEntry(false);
      setForm(emptyForm);
      setDuplicateWarning(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      setSearchStatus("idle");
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchStatus("loading");
      try {
        const matches = await searchSymbols(query);
        setResults(matches);
        setSearchStatus("idle");
      } catch {
        setSearchStatus("error");
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function selectSymbol(match: SymbolMatch) {
    if (existingTickers.includes(match.ticker)) {
      setDuplicateWarning(true);
      return;
    }
    setDuplicateWarning(false);
    setManualEntry(false);
    setStep("form");

    const assetType = mapAssetType(match.quoteType);
    setForm({
      ...emptyForm,
      ticker: match.ticker,
      name: match.name,
      assetType,
    });

    // Best-effort pre-fill: sector/region/currency/price. Every one of
    // these can silently come back empty - the form still works, you'll
    // just fill those fields in yourself.
    const [profile, priceResult] = await Promise.all([
      fetchSymbolProfile(match.ticker),
      fetchLivePrices([match.ticker]).catch(() => null),
    ]);

    const live = priceResult?.prices.get(match.ticker);

    setForm((f) => ({
      ...f,
      region: mapRegion(profile.country, assetType),
      sector: mapSector(profile.sector, assetType),
      currency: (live?.currency as Holding["currency"]) ?? (profile.currency as Holding["currency"]) ?? f.currency,
      currentPrice: live ? String(live.price) : f.currentPrice,
    }));
  }

  function startManualEntry() {
    setDuplicateWarning(false);
    setManualEntry(true);
    setForm({ ...emptyForm, ticker: query.trim() });
    setStep("form");
  }

  function submit() {
    const ticker = form.ticker.trim();
    const name = form.name.trim() || ticker;
    if (!ticker) return;
    if (existingTickers.includes(ticker)) {
      setDuplicateWarning(true);
      return;
    }

    const shares = parseFloat(form.shares);
    const avgCost = parseFloat(form.avgCost);
    const currentPrice = parseFloat(form.currentPrice) || avgCost;
    if (!shares || !avgCost) return;

    onAdd({
      ticker,
      name,
      assetType: form.assetType,
      region: form.region,
      sector: form.sector,
      shares,
      avgCost,
      currentPrice,
      currency: form.currency,
      annualDividendPerShare: 0,
      broker: form.broker || undefined,
      referenceCode: form.referenceCode || undefined,
    });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 py-10 overflow-y-auto">
      <div className="w-full max-w-lg rounded-sm bg-paper border border-line shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg">
            {step === "search" ? "Add a holding" : manualEntry ? "Add manually" : form.name}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink text-sm font-mono uppercase tracking-wide"
          >
            Close
          </button>
        </div>

        {step === "search" && (
          <div className="p-5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ticker or name (e.g. AAPL, Vanguard)"
              className="w-full rounded-sm border border-line bg-white/60 px-3 py-2 text-sm outline-none focus:border-brass"
            />

            {duplicateWarning && (
              <p className="mt-2 text-xs text-loss">Already in your portfolio.</p>
            )}

            <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-line/60">
              {searchStatus === "loading" && (
                <p className="py-3 text-sm text-ink-soft">Searching…</p>
              )}
              {searchStatus === "error" && (
                <p className="py-3 text-sm text-loss">
                  Couldn't reach the symbol search right now — try again in a moment.
                </p>
              )}
              {searchStatus === "idle" && query.trim().length > 0 && results.length === 0 && (
                <p className="py-3 text-sm text-ink-soft">No matches.</p>
              )}
              {results.map((r) => (
                <button
                  key={r.ticker}
                  onClick={() => selectSymbol(r)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-line/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{r.name}</span>
                    <span className="block text-xs text-ink-soft">
                      {r.exchange} · {r.quoteType === "ETF" ? "ETF" : "Stock"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm text-brass">{r.ticker}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-line pt-3">
              <button
                onClick={startManualEntry}
                className="text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink underline underline-offset-2"
              >
                Can't find it? Add it manually →
              </button>
              <p className="mt-1.5 text-xs text-ink-soft">
                This search covers Yahoo Finance's listings, which is most stocks and ETFs — but
                not everything. Notably it doesn't cover Tradegate (TDG on DEGIRO), so if your
                ETF only trades there, look up an alternate listing of the same fund (e.g. on
                Xetra or Euronext — same ISIN, different exchange) via this search, or add it
                manually below.
              </p>
              <p className="mt-1.5 text-xs text-ink-soft">
                Not sure of the ticker for a European ETF?{" "}
                <a
                  href="https://www.justetf.com/en/find-etf.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Look it up on justETF ↗
                </a>{" "}
                and copy its ISIN — pasting an ISIN into the search box above often finds it
                here too, since Yahoo indexes by ISIN as well as ticker.
              </p>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="p-5 space-y-3">
            {manualEntry ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ticker">
                  <input
                    autoFocus
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                    placeholder="e.g. IWDA.AS"
                    className={inputClass}
                  />
                </Field>
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Fund or company name"
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : (
              <p className="font-mono text-sm text-ink-soft">{form.ticker}</p>
            )}

            {duplicateWarning && (
              <p className="text-xs text-loss">Already in your portfolio.</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Asset type">
                <select
                  value={form.assetType}
                  onChange={(e) => setForm({ ...form, assetType: e.target.value as AssetType })}
                  className={selectClass}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value as Holding["currency"] })
                  }
                  className={selectClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Region">
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value as Region })}
                  className={selectClass}
                >
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sector">
                <select
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value as Sector })}
                  className={selectClass}
                >
                  {SECTORS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Shares">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.shares}
                  onChange={(e) => setForm({ ...form, shares: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Avg. cost / share">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.avgCost}
                  onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Current price">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.currentPrice}
                  onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Broker (optional)">
                <input
                  value={form.broker}
                  onChange={(e) => setForm({ ...form, broker: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Reference code (optional)">
                <input
                  value={form.referenceCode}
                  onChange={(e) => setForm({ ...form, referenceCode: e.target.value })}
                  placeholder="DEGIRO symbol, ISIN, etc."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep("search")}
                className="text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink"
              >
                ← Back to search
              </button>
              <button
                onClick={submit}
                disabled={!form.shares || !form.avgCost}
                className="rounded-sm bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/90 disabled:opacity-40"
              >
                Add to portfolio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const selectClass =
  "w-full rounded-sm border border-line bg-white/60 px-2 py-1.5 text-sm outline-none focus:border-brass";
const inputClass = selectClass;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
