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
  ticker: "VWRL",
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

If your GitHub repository is **public**, your holdings, share counts,
and portfolio value in `holdings.ts` will be publicly visible in the
git history and source, even if the deployed page doesn't show a name.
Options:

- Make the repository **private** (GitHub Pages works on private repos
  with GitHub Pro, or you can deploy the `dist/` build elsewhere, e.g.
  Netlify/Vercel free tier, while keeping source private).
- Or use round, non-precise numbers if you want the repo public.
- Or (a later step) move `holdings.ts` into a gitignored file and load
  it at build time — ask me when you're ready to wire that up.

## What's built so far (brick 1)

- Project scaffold, styling system, and deploy pipeline
- Typed data model for holdings (`src/data/types.ts`)
- Calculation layer: market value, gain/loss, dividend income, and
  percentage allocation by any grouping (`src/lib/calculations.ts`)
- Summary header (total value, gain/loss, yield)
- Three allocation "strips" — region, sector, asset type
- A sortable-by-value holdings table
- Sample data for 5 holdings so the app renders immediately

## Roadmap — next bricks, in a sensible order

1. **Live prices** — pull current prices from a free API (e.g. a
   currency-aware Yahoo Finance proxy) instead of hand-editing
   `currentPrice`.
2. **Multi-currency support** — proper FX conversion for totals instead
   of the current "treat all currencies as equal" simplification.
3. **A public profile view** (like the Jong Beleggen page) — a
   read-only, shareable summary page separate from your private editing
   view, with your own privacy settings on what's shown.
4. **Dividend calendar** — upcoming payments by month, based on
   `annualDividendPerShare` and payout frequency.
5. **History over time** — snapshot your portfolio periodically (e.g. a
   small JSON log committed monthly, or a lightweight database) to chart
   growth, not just a current-state snapshot.
6. **Pie/donut chart view** as an alternative to the allocation strips,
   using `recharts` (already installed).

Tell me which of these you want to tackle next and we'll build it as
its own brick.
