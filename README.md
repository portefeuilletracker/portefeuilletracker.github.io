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
  region: "Global / Diversified",
  sector: "Diversified / Multi-Sector",
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

The allowed values for `assetType`, `region`, and `sector` are controlled
vocabularies defined in `src/data/types.ts`. Extend those unions if you
need a category that isn't there yet (e.g. add `"Japan"` to `Region`).

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
2. Pick a result. The app tries to pre-fill asset type, region, and
   sector from Yahoo's data, plus the current price. This guess is
   often right for large individual stocks, but region/sector for ETFs
   in particular are close to impossible to infer automatically (a
   fund can span every region and sector at once), so **always check
   the dropdowns** before confirming — that's what keeps the
   allocation charts meaningful.
3. Fill in shares and average cost (these aren't fetchable from
   anywhere and have to be typed in), then **Add to portfolio**.

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
- **CORS proxy in the middle** -- browsers block direct cross-origin
  requests to Yahoo, so requests are routed through a free public
  proxy (`corsproxy.io`, configured in `src/lib/priceApi.ts`). If that
  proxy ever goes down or gets slow, swap in an alternative there.
- **Per-ticker fallback** -- if a symbol fails to fetch (wrong suffix,
  rate limit, proxy hiccup), that holding just keeps showing its
  stored `currentPrice` rather than breaking the page. The status bar
  under the summary header shows which tickers, if any, didn't refresh.
- **Currency is still naive** -- a live USD price is summed into your
  totals at face value, same simplification as before (see below).

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

## Roadmap — next bricks, in a sensible order

1. **Multi-currency support** — proper FX conversion for totals instead
   of the current "treat all currencies as equal" simplification.
2. **A public profile view** (like the Jong Beleggen page) — a
   read-only, shareable summary page separate from your private editing
   view, with your own privacy settings on what's shown.
3. **Dividend calendar** — upcoming payments by month, based on
   `annualDividendPerShare` and payout frequency.
4. **History over time** — snapshot your portfolio periodically (e.g. a
   small JSON log committed monthly, or a lightweight database) to chart
   growth, not just a current-state snapshot.
5. **Pie/donut chart view** as an alternative to the allocation strips,
   using `recharts` (already installed).

Tell me which of these you want to tackle next and we'll build it as
its own brick.
