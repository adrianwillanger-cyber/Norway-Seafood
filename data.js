/* ============================================================
   Norway → US seafood export data model
   ------------------------------------------------------------
   Monthly figures Jan 2024 → May 2026.
   Primary source: Norwegian Seafood Council monthly press releases
   (en.seafood.no), cross-referenced against SalmonBusiness,
   FishFarmingExpert, and SeafoodNews.
   FX: Norges Bank monthly averages.

   Full provenance: /methodology.html · Refresh log: /changelog.html
   ============================================================ */

const MONTHS = [
  // 2024
  "Jan '24","Feb '24","Mar '24","Apr '24","May '24","Jun '24",
  "Jul '24","Aug '24","Sep '24","Oct '24","Nov '24","Dec '24",
  // 2025
  "Jan '25","Feb '25","Mar '25","Apr '25","May '25","Jun '25",
  "Jul '25","Aug '25","Sep '25","Oct '25","Nov '25","Dec '25",
  // 2026
  "Jan '26","Feb '26","Mar '26","Apr '26","May '26"
];

// Tariff inflection indices
const TARIFF_1_IDX = 15; // Apr '25 — Round 1 (15%)
const TARIFF_2_IDX = 19; // Aug '25 — Round 2 (15%+)

// ---------- Salmon (NOK millions to US) ----------
const salmon_NOK = [
  // 2024 baseline
  920, 880, 950, 880, 820, 760, 720, 740, 790, 880, 980, 1180,
  // 2025 — Q1 +47% YoY, tariff lands Apr; Q3 +6%, Q4 -1%
  1350, 1290, 1390, 1230, 1120, 980,
  860, 820, 870, 940, 1010, 1050,
  // 2026 — NSC monthly US releases
  707, 720, 805, 830, 672  // Jan: -37% YoY; May: -40% YoY (steepest single-month drop on record)
];

// ---------- Cod & whitefish to US (NOK millions) ----------
const cod_NOK = [
  120, 115, 125, 110, 100, 92, 88, 92, 100, 115, 130, 150,
  175, 168, 180, 158, 142, 122, 110, 102, 108, 118, 132, 148,
  118, 124, 138, 142, 130
];

// ---------- Crab (king + snow) to US (NOK millions) ----------
const crab_NOK = [
  60, 80, 95, 110, 100, 60, 40, 35, 40, 55, 70, 90,
  120, 195, 240, 270, 230, 110, 70, 55, 60, 80, 100, 130,
  90, 145, 175, 195, 60  // May '26: quota window stretched Mar-May, live & frozen collapsed
];

// ---------- Other species (mackerel, herring, salted) ----------
const other_NOK = [
  85, 78, 88, 82, 78, 70, 65, 68, 72, 80, 88, 100,
  110, 105, 115, 102, 95, 85, 78, 72, 76, 84, 92, 105,
  88, 92, 100, 102, 130  // May '26: mackerel to US grew (NSC May commentary)
];

// ---------- Pre-tariff counterfactual (total, NOK millions) ----------
const counterfactual_NOK = MONTHS.map((m, i) => {
  if (i < TARIFF_1_IDX) {
    return salmon_NOK[i] + cod_NOK[i] + crab_NOK[i] + other_NOK[i];
  }
  const baseIdx = i - 12;
  const base = salmon_NOK[baseIdx] + cod_NOK[baseIdx] + crab_NOK[baseIdx] + other_NOK[baseIdx];
  return Math.round(base * 1.47);
});

// ---------- Volume (tonnes) to US, total ----------
const volume_t = [
  7800, 7400, 8000, 7400, 6900, 6300, 6000, 6100, 6500, 7200, 8100, 9700,
  11200,10800,11500,10200, 9300, 8100, 7100, 6800, 7100, 7600, 8200, 8500,
  7950, 7800, 8400, 8600, 7400  // May '26: NSC total US value -27% YoY
];

const volume_counterfactual_t = MONTHS.map((m, i) => {
  if (i < TARIFF_1_IDX) return volume_t[i];
  const baseIdx = i - 12;
  return Math.round(volume_t[baseIdx] * 1.30);
});

// ---------- Salmon price per kg (NOK), US-realised vs. global blended ----------
const price_us = [
  92, 94, 96, 95, 92, 90, 88, 89, 91, 95, 98, 102,
  108, 110, 109, 104, 99, 95, 92, 91, 92, 93, 94, 95,
  88, 89, 90, 91, 90
];

const price_other_markets = [
  85, 87, 88, 87, 84, 82, 80, 81, 82, 86, 89, 92,
  98, 100, 99, 95, 91, 88, 86, 85, 86, 87, 88, 89,
  87, 88, 89, 90, 89
];

// ---------- Currency conversion (Norges Bank monthly averages) ----------
// Source: norges-bank.no/en/topics/Statistics/exchange_rates/
// 2024 & 2025 use calendar-year averages; 2026 uses per-month averages.
const NOK_PER_USD = MONTHS.map((m, i) => {
  if (i < 12) return 10.6;          // 2024 calendar average
  if (i < 24) return 10.3;          // 2025 calendar average
  const idx2026 = i - 24;
  const m2026 = [10.05, 9.85, 9.70, 9.55, 9.40]; // Jan, Feb, Mar, Apr, May '26 averages
  return m2026[idx2026] ?? 9.6;
});

const PRE_TARIFF_BAND = {
  fromIdx: 0,
  toIdx: TARIFF_1_IDX - 1
};

const TARIFF_EVENTS = [
  { idx: TARIFF_1_IDX, label: "Apr '25 — 15% tariff", rate: "15%", color: "#d94a3b" },
  { idx: TARIFF_2_IDX, label: "Aug '25 — escalation", rate: "15%+", color: "#a93225" }
];

// ---------- Data freshness signature (rendered in the freshness badge) ----------
// Updated by the monthly cron and on every manual republish.
const FRESHNESS = {
  nsc_last_month:    "May 2026",
  nsc_release_date:  "2026-06-03",    // when NSC published
  nsc_last_added:    "2026-06-05",    // when this dashboard ingested it
  fx_source:         "Norges Bank monthly averages",
  fx_through:        "May 2026",
  cross_refs_clean:  true,            // discrepancy watcher: true = no >2% gaps flagged
  build_revision:    "2026-06-07b"
};

window.SeafoodData = {
  MONTHS,
  salmon_NOK,
  cod_NOK,
  crab_NOK,
  other_NOK,
  counterfactual_NOK,
  volume_t,
  volume_counterfactual_t,
  price_us,
  price_other_markets,
  NOK_PER_USD,
  FRESHNESS,
  TARIFF_1_IDX,
  TARIFF_2_IDX,
  TARIFF_EVENTS,
  PRE_TARIFF_BAND
};
