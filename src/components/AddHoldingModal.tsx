import { useEffect, useRef, useState } from "react";
import type {
  AssetType,
  Country,
  CountryWeight,
  Holding,
  Sector,
  SectorWeight,
} from "../data/types";
import { fetchSymbolProfile, searchSymbols, type SymbolMatch } from "../lib/symbolSearch";
import { fetchLivePrices } from "../lib/priceApi";
import { fetchFxRates, convertCurrency, type FxRates } from "../lib/fxRates";
import { mapAssetType } from "../lib/classify";
import { classifyHolding, type ClassificationResult } from "../lib/autoClassify";

const ASSET_TYPES: AssetType[] = ["Stock", "ETF", "Bond", "REIT", "Crypto", "Cash"];
const CURRENCIES: Holding["currency"][] = ["EUR", "USD", "GBP"];

const COUNTRIES: Country[] = [
  "United States",
  "Canada",
  "Mexico",
  "Brazil",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "Spain",
  "Italy",
  "Sweden",
  "Belgium",
  "Denmark",
  "Norway",
  "Finland",
  "Ireland",
  "Austria",
  "Portugal",
  "Poland",
  "Luxembourg",
  "Japan",
  "China",
  "Hong Kong",
  "South Korea",
  "Taiwan",
  "Singapore",
  "Australia",
  "New Zealand",
  "India",
  "Indonesia",
  "Thailand",
  "Malaysia",
  "Philippines",
  "Vietnam",
  "South Africa",
  "Saudi Arabia",
  "United Arab Emirates",
  "Israel",
  "Turkey",
  "Other / Unclassified",
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

interface Props {
  isOpen: boolean;
  existingTickers: string[];
  fxRates: FxRates;
  onClose: () => void;
  onAdd: (holding: Holding) => void;
}

type Step = "search" | "form";
type ClassifyStatus = "idle" | "loading" | "done" | "error";

const emptyForm = {
  ticker: "",
  name: "",
  assetType: "Stock" as AssetType,
  shares: "",
  avgCost: "",
  currentPrice: "",
  currency: "EUR" as Holding["currency"],
  broker: "",
  referenceCode: "",
};

export default function AddHoldingModal({
  isOpen,
  existingTickers,
  fxRates: fxRatesProp,
  onClose,
  onAdd,
}: Props) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolMatch[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [manualEntry, setManualEntry] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Country/sector breakdown is never hand-picked when we have real
  // Yahoo data — it's produced by classifyHolding (autoClassify.ts) and
  // shown read-only. `breakdown` is null until classification resolves;
  // `classifyStatus` drives the loading/fallback messaging. The
  // manualCountry/manualSector single pickers below are the last-resort
  // fallback, only ever shown in the manual-entry flow, and only after
  // an auto-detect attempt against Yahoo's data has failed.
  const [breakdown, setBreakdown] = useState<{
    countries: CountryWeight[];
    sectors: SectorWeight[];
  } | null>(null);
  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>("idle");
  const [manualCountry, setManualCountry] = useState<Country>("Other / Unclassified");
  const [manualSector, setManualSector] = useState<Sector>("Diversified / Multi-Sector");

  // Tracks which currency avgCost/currentPrice are CURRENTLY expressed
  // in. Starts as the instrument's real trading currency once fetched;
  // updates to match `form.currency` after a conversion, so the
  // "Convert" button always converts from wherever the numbers
  // currently stand rather than double-converting.
  const [valuesCurrency, setValuesCurrency] = useState<string | null>(null);
  const [rates, setRates] = useState<FxRates>(fxRatesProp);

  useEffect(() => {
    if (!isOpen) {
      setStep("search");
      setQuery("");
      setResults([]);
      setManualEntry(false);
      setForm(emptyForm);
      setDuplicateWarning(false);
      setValuesCurrency(null);
      setRates(fxRatesProp);
      setBreakdown(null);
      setClassifyStatus("idle");
      setManualCountry("Other / Unclassified");
      setManualSector("Diversified / Multi-Sector");
    }
  }, [isOpen, fxRatesProp]);

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

  // Make sure we have an EUR rate for whatever currency the values are
  // currently in, so the "Convert" button's rate display and math are
  // never stuck on a stale/missing rate.
  useEffect(() => {
    if (!valuesCurrency || valuesCurrency in rates) return;
    fetchFxRates([valuesCurrency]).then((r) => setRates((prev) => ({ ...prev, ...r })));
  }, [valuesCurrency, rates]);

  function applyClassification(result: ClassificationResult) {
    setBreakdown({ countries: result.countries, sectors: result.sectors });
    setClassifyStatus(result.isFallback ? "error" : "done");
  }

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
    setBreakdown(null);
    setClassifyStatus("loading");

    // Best-effort pre-fill: currency/price, plus automatic country and
    // sector classification. Every one of these can silently come back
    // empty/fallback — the form still works, you'll just see "Other /
    // Unclassified" and "Diversified / Multi-Sector" for that holding.
    const [profile, priceResult, classification] = await Promise.all([
      fetchSymbolProfile(match.ticker),
      fetchLivePrices([match.ticker]).catch(() => null),
      classifyHolding(match.ticker, assetType, match.name),
    ]);

    const live = priceResult?.prices.get(match.ticker);
    const nativeCurrency = (live?.currency ?? profile.currency) as Holding["currency"] | undefined;

    setForm((f) => ({
      ...f,
      currency: nativeCurrency ?? f.currency,
      currentPrice: live ? String(live.price) : f.currentPrice,
    }));
    setValuesCurrency(nativeCurrency ?? null);
    applyClassification(classification);
  }

  function startManualEntry() {
    setDuplicateWarning(false);
    setManualEntry(true);
    setForm({ ...emptyForm, ticker: query.trim() });
    setValuesCurrency(null);
    setBreakdown(null);
    setClassifyStatus("idle");
    setStep("form");
  }

  async function tryAutoDetectManual() {
    const ticker = form.ticker.trim();
    if (!ticker) return;
    setClassifyStatus("loading");
    const classification = await classifyHolding(ticker, form.assetType, form.name);
    applyClassification(classification);
  }

  function convertValuesToSelectedCurrency() {
    if (!valuesCurrency || valuesCurrency === form.currency) return;
    setForm((f) => {
      const avgCost = parseFloat(f.avgCost);
      const currentPrice = parseFloat(f.currentPrice);
      return {
        ...f,
        avgCost: Number.isFinite(avgCost)
          ? convertCurrency(avgCost, valuesCurrency, f.currency, rates).toFixed(4)
          : f.avgCost,
        currentPrice: Number.isFinite(currentPrice)
          ? convertCurrency(currentPrice, valuesCurrency, f.currency, rates).toFixed(4)
          : f.currentPrice,
      };
    });
    setValuesCurrency(form.currency);
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

    // Real (auto-detected) breakdown wins whenever we have one. Only a
    // holding that never resolved against Yahoo at all (pure manual
    // entry, auto-detect never tried or it failed) falls back to the
    // single manually-picked country/sector at 100%.
    const countries: CountryWeight[] = breakdown?.countries ?? [{ country: manualCountry, pct: 100 }];
    const sectors: SectorWeight[] = breakdown?.sectors ?? [{ sector: manualSector, pct: 100 }];

    onAdd({
      ticker,
      name,
      assetType: form.assetType,
      countries,
      sectors,
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

  const showConvert =
    valuesCurrency !== null && valuesCurrency !== form.currency && (form.avgCost || form.currentPrice);
  const conversionRate =
    showConvert && valuesCurrency
      ? convertCurrency(1, valuesCurrency, form.currency, rates)
      : null;
  const addDisabled = !form.shares || !form.avgCost || classifyStatus === "loading";

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

            {!manualEntry && (
              <BreakdownPanel status={classifyStatus} breakdown={breakdown} />
            )}

            {manualEntry && breakdown && (
              <BreakdownPanel status={classifyStatus} breakdown={breakdown} />
            )}

            {manualEntry && !breakdown && (
              <div className="rounded-sm border border-line bg-white/40 px-3 py-2.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-soft">
                    Yahoo's search didn't have this ticker, but its data endpoint sometimes still
                    resolves it — worth a try before picking a single country/sector by hand.
                  </p>
                  <button
                    type="button"
                    onClick={tryAutoDetectManual}
                    disabled={!form.ticker.trim() || classifyStatus === "loading"}
                    className="shrink-0 rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-ink/90 disabled:opacity-40"
                  >
                    {classifyStatus === "loading" ? "Trying…" : "Auto-detect"}
                  </button>
                </div>
                {classifyStatus === "error" && (
                  <p className="text-[11px] text-loss">
                    No usable data found for this ticker on Yahoo — pick a single primary country
                    and sector below (100% each). You can always remove and re-add this holding
                    later if it becomes searchable.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Country">
                    <select
                      value={manualCountry}
                      onChange={(e) => setManualCountry(e.target.value as Country)}
                      className={selectClass}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sector">
                    <select
                      value={manualSector}
                      onChange={(e) => setManualSector(e.target.value as Sector)}
                      className={selectClass}
                    >
                      {SECTORS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {showConvert && (
              <div className="rounded-sm border border-brass/40 bg-brass/10 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-soft">
                    Avg. cost and current price above are still in{" "}
                    <span className="font-mono text-ink">{valuesCurrency}</span>. Convert them to{" "}
                    <span className="font-mono text-ink">{form.currency}</span> using today's
                    rate
                    {conversionRate && (
                      <>
                        {" "}
                        (1 {valuesCurrency} ≈ {conversionRate.toFixed(4)} {form.currency})
                      </>
                    )}
                    ?
                  </p>
                  <button
                    type="button"
                    onClick={convertValuesToSelectedCurrency}
                    className="shrink-0 rounded-sm bg-ink px-3 py-1.5 text-xs text-paper hover:bg-ink/90"
                  >
                    Convert
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Uses today's exchange rate for both fields. Fine for current price; for avg.
                  cost this approximates what you'd have paid in {form.currency} today, not the
                  rate on your actual purchase date.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep("search")}
                className="text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink"
              >
                ← Back to search
              </button>
              <button
                onClick={submit}
                disabled={addDisabled}
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

/** Read-only display of an auto-detected country/sector breakdown. */
function BreakdownPanel({
  status,
  breakdown,
}: {
  status: ClassifyStatus;
  breakdown: { countries: CountryWeight[]; sectors: SectorWeight[] } | null;
}) {
  return (
    <div className="rounded-sm border border-line bg-white/40 px-3 py-2.5">
      <p className="text-xs uppercase tracking-wide text-ink-soft mb-1">
        Countries &amp; sectors — auto-detected
      </p>
      {status === "loading" && <p className="py-1 text-sm text-ink-soft">Classifying…</p>}
      {status !== "loading" && breakdown && (
        <div className="grid grid-cols-2 gap-x-4 text-sm">
          <ul className="space-y-0.5">
            {breakdown.countries.map((c) => (
              <li key={c.country} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink-soft">{c.country}</span>
                <span className="font-mono tabular shrink-0">{c.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-0.5">
            {breakdown.sectors.map((s) => (
              <li key={s.sector} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink-soft">{s.sector}</span>
                <span className="font-mono tabular shrink-0">{s.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {status === "error" && (
        <p className="mt-1.5 text-[11px] text-ink-soft">
          Yahoo didn't have enough data to classify this one automatically, so it's saved as
          "Other / Unclassified" / "Diversified / Multi-Sector" above.
        </p>
      )}
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
