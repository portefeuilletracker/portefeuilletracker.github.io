// Migration-safe loader for portfolio data in localStorage.
// Drop this into your store where you currently do JSON.parse(localStorage.getItem(...))
type RawHolding = any; // narrow this to your real type as you prefer

function migrateHolding(h: RawHolding): RawHolding {
  if (!h || typeof h !== 'object') return h;

  // Migrate single-string legacy fields -> arrays
  if (h.countries == null) {
    if (typeof h.region === 'string' && h.region.length) {
      h.countries = [h.region];
    } else if (Array.isArray(h.countries)) {
      // already correct
    } else {
      h.countries = [];
    }
  }

  if (h.sectors == null) {
    if (typeof h.sector === 'string' && h.sector.length) {
      h.sectors = [h.sector];
    } else if (Array.isArray(h.sectors)) {
      // already correct
    } else {
      h.sectors = [];
    }
  }

  // Other safe normalizations you might need:
  // - convert numeric strings to numbers
  // - ensure IDs exist
  // - ensure nested objects exist
  return h;
}

function migratePortfolio(parsed: any): any {
  if (!parsed) return parsed;

  // If your saved shape is an object with .holdings:
  if (parsed.holdings && Array.isArray(parsed.holdings)) {
    parsed.holdings = parsed.holdings.map(migrateHolding);
    return parsed;
  }

  // If your saved shape is an array of holdings directly:
  if (Array.isArray(parsed)) {
    return parsed.map(migrateHolding);
  }

  // Unknown shape: try best-effort, or fallback to default
  return parsed;
}

export function loadPortfolioFromStorage<T = any>(key = 'portfolio'): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const migrated = migratePortfolio(parsed);
    return migrated as T;
  } catch (err) {
    console.error('Error loading portfolio from localStorage — clearing corrupted entry', err);
    localStorage.removeItem(key);
    return null;
  }
}
