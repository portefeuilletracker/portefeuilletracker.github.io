# Portfolio Ledger

A personal investment tracker: total value, gain/loss, dividend income,
and allocation by region, sector, and asset type. Inspired by
[Portfolio Dividend Tracker](https://portfoliodividendtracker.com), built
as a static site you fully own and can extend yourself.

## Stack

- **React + TypeScript + Vite** — the app
- **Tailwind CSS** — styling
- **GitHub Actions → GitHub Pages** — free hosting, deploys on every push

No backend, no database, no API keys required for this first version.
All data lives in one file you edit directly.

## Running it locally

```bash
npm install
npm run dev
```

Open the printed local URL. Edits to any file hot-reload instantly.

## Editing your portfolio

Everything is driven from **`src/data/holdings.ts`**. Each entry is one
position you hold:

```ts
{
  ticker: "VWRL.AS",
  name: "Vanguard FTSE All-World UCITS ETF",
  assetType: "ETF",
  countries: [
    { country: "United States", pct: 62 },
    { country: "Japan", pct: 6 },
    { country: "Other / Unclassified", pct: 32 },
  ],
  sectors: [
    { sector: "Technology", pct: 24 },
    { sector: "Financials", pct: 16 },
    { sector: "Diversified / Multi-Sector", pct: 60 },
  ],
  shares: 40,
  avgCost: 98.5,
  currentPrice: 112.3,
  currency: "EUR",
  annualDividendPerShare: 1.85,
  broker: "DEGIRO",
}
```

Add, remove, or edit entries — the summary numbers, the three allocation
strips, and the holdings table all recompute automatically from this list.
You never need to touch chart code by hand.

The allowed values for `assetType`, `countries`, and `sectors` are
controlled vocabularies defined in `src/data/types.ts`. `countries` and
`sectors` are breakdowns, not single values — a list of
`{ country, pct }` / `{ sector, pct }` entries whose `pct`s should sum
to roughly 100. A single stock is one entry at 100%; an ETF is however
many countries/sectors its holdings span. Extend the `Country` or
`Sector` unions if you need a category that isn't there yet.

`ticker` must match the symbol exactly as Yahoo Finance shows it,
including any exchange suffix -- this is what live price fetching looks
up. US tickers are bare (`AAPL`). Others need a suffix, e.g. `.AS` for
Euronext Amsterdam. Search the name on finance.yahoo.com if you're
unsure of yours; the page URL shows the exact symbol. `currentPrice` is
your fallback -- it's shown as-is for any ticker live fetching can't
resolve.

## Adding and removing holdings from the app

You don't have to edit `holdings.ts` for day-to-day changes anymore.
Click **+ Add holding** in the app:

1. Search by ticker or company/fund name. This searches Yahoo
   Finance's symbol database directly (same unofficial, keyless
   approach as live prices below), so effectively any listed stock or
   ETF is searchable — not just the five starter positions.
   - **Known gap: Tradegate.** Yahoo Finance doesn't cover the
     Tradegate exchange (`TDG` on DEGIRO) for arbitrary instruments —
     it's not in Yahoo's public data at all, so no ticker suffix will
     make it searchable here. If your ETF only trades there, search
     for an alternate listing of the same fund on an exchange Yahoo
     does cover (e.g. Xetra `.DE` or Euronext `.AS` — same ISIN,
     different venue), or use "Add it manually" below.
2. Pick a result. The app automatically classifies its country and
   sector breakdown from Yahoo's data — asset type, currency, and
   current price get pre-filled too. There's no country/sector dropdown
   to fill in for this flow; you'll see a **"Countries & sectors —
   auto-detected"** panel populate a moment after you pick a symbol.
   - **For a stock/REIT**, this is straightforward: one country (its
     HQ), one sector, both at 100%, from Yahoo's profile data.
   - **For an ETF**, this is harder, because Yahoo's public API gives a
     fund's *sector* weightings directly (reliable, generally sums to
     ~100%) but no *country* weightings at all. The closest available
     substitute is to look up the country of each of the fund's
     disclosed top ~10 holdings and weight by their share of the fund.
     For a concentrated fund this covers most of its value; for a
     broad global index tracker (e.g. VWRL) the top 10 might only be
     15-20% of assets — the rest is honestly labelled **"Other /
     Unclassified"** with its real weight, rather than guessed at.
     This is the real cost of not paying for a holdings-look-through
     data provider (Morningstar etc. sell this; there's no free public
     API for it). If a fund fails to classify at all (no sector or
     holdings data on Yahoo — common for some bond funds), it's saved
     as 100% "Other / Unclassified" / "Diversified / Multi-Sector"
     rather than blocking the add.
3. Fill in shares and average cost (these aren't fetchable from
   anywhere and have to be typed in), then **Add to portfolio**.

Can't find something in search? Click **Add it manually** to type in
your own ticker, name, and asset type — useful for anything Yahoo
Finance doesn't index, or a Tradegate-only listing. In this flow the
app still tries an **Auto-detect** button first (Yahoo's data endpoint
sometimes resolves a ticker its search index missed); only if that
comes back empty do you get a manual single country/sector picker
(100% each) as a last resort. Live price refresh will still work
afterwards if the ticker you enter happens to be one Yahoo recognizes;
otherwise it just keeps showing whatever `currentPrice` you typed in.

**Neither DEGIRO nor justETF have a public API** (both require a
login, or aren't documented for third-party use at all), so this app
can't search either of them directly the way it does Yahoo Finance —
and it deliberately doesn't try to, since that would mean scraping an
undocumented page (fragile, breaks silently) or asking you to type
your broker password into client-side JS (unsafe). Two things help
instead:

- Every holding has an optional **Reference code** field — a free-text
  note (DEGIRO's own symbol, an ISIN, whatever helps you cross-check
  against your broker) shown under the ticker in the table. It's
  purely a label; only `ticker` is ever used for live pricing.
- If you're not sure of the right ticker for a European ETF, justETF
  is a good place to look one up by name — there's a shortcut link to
  it in the "Add manually" screen. Once you have the ISIN, try pasting
  *that* into the main search box first — Yahoo indexes by ISIN too,
  so it'll often find the listing and you keep live pricing.

Each row in the holdings table has a **✕** to remove it.

**Where this data lives:** once you add or remove anything through the
app, your portfolio moves out of `holdings.ts` and into this browser's
`localStorage` (see `src/lib/portfolioStore.ts`). `holdings.ts` becomes
the "starter" portfolio — what a fresh browser sees before you've made
any changes, and what **Reset to starter** restores. This also means
your live edits:

- only exist in the browser/device you made them in — there's no sync
  across devices, and clearing site data wipes them
- are no longer committed to git, which is good for privacy on a
  public repo (see below) but means there's currently no backup; if
  that matters to you, periodically copy the JSON out of
  `localStorage["portfolio-tracker:holdings"]` (devtools → Application
  → Local Storage) somewhere safe

## Live prices

On load, the app fetches each ticker's latest price from Yahoo
Finance's public chart endpoint and recomputes your totals and
allocation percentages from it. Click Refresh to fetch again without
reloading the page.

A few things worth knowing:

- **No API key or signup** -- this endpoint is free and public, but
  also unofficial and undocumented by Yahoo. It can change shape or
  start rate-limiting without notice. Fine for a personal tracker
  refreshed occasionally; not something to depend on for anything
  critical.
- **Per-ticker fallback** -- if a symbol fails to fetch (wrong suffix,
  rate limit, proxy hiccup), that holding just keeps showing its
  stored `currentPrice` rather than breaking the page. The status bar
  under the summary header shows which tickers, if any, didn't refresh.

## Currency conversion

Every holding keeps its own trading currency (`EUR`, `USD`, or `GBP`)
for its per-share price, shown as-is in the Holdings table. All
portfolio-level figures -- the big total, gain/loss, dividend income,
and the three allocation strips -- are converted to EUR first, using
real exchange rates from [Frankfurter](https://frankfurter.dev), a
free ECB-based rates API (`src/lib/fxRates.ts`).

- **Real rates, not 1:1** -- a $100 position and a €100 position are no
  longer just added together as if a dollar were a euro.
- **Daily rates** -- ECB rates update once per business day, not
  intraday. Fine for tracking a portfolio's value; not for anything
  time-sensitive.
- **No proxy needed here** -- unlike the Yahoo endpoints, Frankfurter
  sends proper CORS headers, so this is a direct browser request with
  nothing extra to break.
- **Cached for a few hours** in `localStorage`, and the last successful
  fetch is kept as a fallback if a later refresh fails, rather than
  silently reverting to treating currencies as equal.
- **Add Holding form** -- when you pick a symbol that trades in USD or
  GBP but set the Currency field to something else, a "Convert" helper
  appears to fill in the avg. cost and current price fields at today's
  rate. It's exact for current price; for avg. cost it's an
  approximation of what you'd pay today, not the rate on your actual
  purchase date (exchange rates move).

## Deploying to GitHub Pages

1. Push this repo to GitHub (see below if you're starting from empty).
2. In your repo: **Settings → Pages → Source → GitHub Actions**.
3. Push to `main` — the included workflow
   (`.github/workflows/deploy.yml`) builds and deploys automatically.

This repo is named `<org>.github.io`, which GitHub treats as a special
**user/org page** served from the domain root
(`https://portefeuilletracker.github.io/`), not a `/repo-name/`
subfolder. `vite.config.ts` sets `base: "/"` accordingly — if you ever
move the app into a normal project repo instead (served at
`https://<user>.github.io/<repo-name>/`), change `base` back to
`` `/${REPO_NAME}/` `` for production builds, or the deployed page will
load blank because assets 404 at the wrong path.

### Pushing this into your empty repo

```bash
cd investment-tracker
git init
git add .
git commit -m "Initial portfolio ledger scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## A note on privacy

If your GitHub repository is **public**, whatever is committed in
`holdings.ts` — i.e. your starter portfolio — will be publicly visible
in the git history and source, even if the deployed page doesn't show
a name. Anything you add or remove through the app's UI instead stays
in your browser's `localStorage` and is never committed, so it's not
publicly visible in the repo. It's still visible to anyone with access
to that browser/device, and to Yahoo Finance / the CORS proxies as
plain search and price-lookup traffic — this was never designed to
hide your holdings from your own machine or from the network requests
it makes.
Options:

- Make the repository **private** (GitHub Pages works on private repos
  with GitHub Pro, or you can deploy the `dist/` build elsewhere, e.g.
  Netlify/Vercel free tier, while keeping source private).
- Or use round, non-precise numbers if you want the repo public.
- Or (a later step) move `holdings.ts` into a gitignored file and load
  it at build time — ask me when you're ready to wire that up.

## What's built so far

**Brick 1 — scaffold**
- Project scaffold, styling system, and deploy pipeline
- Typed data model for holdings (`src/data/types.ts`)
- Calculation layer: market value, gain/loss, dividend income, and
  percentage allocation by any grouping (`src/lib/calculations.ts`)
- Summary header (total value, gain/loss, yield)
- Three allocation "strips" -- region, sector, asset type
- A sortable-by-value holdings table
- Sample data for 5 holdings so the app renders immediately

**Brick 2 -- live prices**
- Client-side fetch from Yahoo Finance's public chart endpoint on page
  load, with a manual Refresh button (`src/lib/priceApi.ts`)
- Per-ticker fallback to the stored `currentPrice` if a fetch fails
- A status bar showing when prices were last refreshed and which
  tickers, if any, didn't update

**Brick 3 -- personalization + real currency conversion**
- Search-and-add flow backed by Yahoo Finance's symbol search, with
  manual entry as a fallback (`AddHoldingModal.tsx`, `symbolSearch.ts`)
- Remove any holding from the table
- Portfolio saved in `localStorage`, with a Reset-to-starter option
  (`portfolioStore.ts`)
- Real EUR conversion for every portfolio-level total and allocation,
  via Frankfurter's ECB rates (`fxRates.ts`) -- no more treating a
  dollar as a euro
- A "Convert to EUR" helper in the Add Holding form for USD/GBP
  instruments

**Brick 4 -- automatic, detailed country and sector classification**
- `region`/`sector` (single value each) replaced by `countries`/
  `sectors` (weighted breakdowns) in the data model
  (`src/data/types.ts`)
- Automatic classification on add — no manual country/sector dropdown
  in the normal search-and-select flow (`src/lib/autoClassify.ts`,
  `src/lib/classify.ts`)
  - Stocks/REITs: single country + sector from Yahoo's profile data
  - ETFs: full sector-weighting breakdown from Yahoo, plus a
    top-holdings-based country breakdown with an honest "Other /
    Unclassified" remainder (see the Add Holding section above for
    the tradeoffs)
- Manual entry still has a last-resort single country/sector picker,
  but only after an auto-detect attempt against Yahoo fails
- Allocation math (`computeWeightedAllocation` in
  `src/lib/calculations.ts`) now splits a holding's value across every
  country/sector it's classified into, weighted by percentage, instead
  of assigning the whole holding to one bucket
- Holdings table shows a compact, hoverable breakdown per holding
  instead of a single region/sector tag

## Roadmap — next bricks, in a sensible order

1. **A public profile view** (like the Jong Beleggen page) — a
   read-only, shareable summary page separate from your private editing
   view, with your own privacy settings on what's shown.
2. **Dividend calendar** — upcoming payments by month, based on
   `annualDividendPerShare` and payout frequency.
3. **History over time** — snapshot your portfolio periodically (e.g. a
   small JSON log committed monthly, or a lightweight database) to chart
   growth, not just a current-state snapshot.
5. **Pie/donut chart view** as an alternative to the allocation strips,
   using `recharts` (already installed).

Tell me which of these you want to tackle next and we'll build it as
its own brick.
