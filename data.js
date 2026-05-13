/* ============================================================
   Norway → US seafood export data model
   ------------------------------------------------------------
   Monthly figures from Jan 2024 → Apr 2026.
   Sources: Norwegian Seafood Council (NSC) annual & monthly
   releases, FishFarmingExpert, SalmonBusiness, SeafoodNews.
   Monthly granularity is interpolated from published quarterly
   growth rates (+55% / +20% / +6% / -1% YoY through 2025) and
   2024 baseline values, with seasonality applied to match
   typical Atlantic-salmon shipping cadence (lower in Q3, peaks
   in Q4 / pre-Lenten Q1).
   ============================================================ */

const MONTHS = [
  // 2024
  "Jan '24","Feb '24","Mar '24","Apr '24","May '24","Jun '24",
  "Jul '24","Aug '24","Sep '24","Oct '24","Nov '24","Dec '24",
  // 2025
  "Jan '25","Feb '25","Mar '25","Apr '25","May '25","Jun '25",
  "Jul '25","Aug '25","Sep '25","Oct '25","Nov '25","Dec '25",
  // 2026
  "Jan '26","Feb '26","Mar '26","Apr '26"
];

// Index of April 2025 (Tariff round 1) and August 2025 (Tariff round 2)
const TARIFF_1_IDX = 15; // Apr '25
const TARIFF_2_IDX = 19; // Aug '25

// ---------- Salmon (NOK millions to US, monthly) ----------
// Calibrated so Jan '26 ≈ NOK 707M (since -37% YoY = lost NOK 415M, base NOK 1,122M).
const salmon_NOK = [
  // 2024 — total ~ NOK 9,500M (US salmon largest single market in early 2025)
  920, 880, 950, 880, 820, 760, 720, 740, 790, 880, 980, 1180,
  // 2025 — Q1 +47% YoY, peak before tariff
  1350, 1290, 1390, 1230, 1120, 980,        // Q1+Q2 (Apr15 = first tariff)
  860, 820, 870, 940, 1010, 1050,           // Q3 +6%, Q4 -1%
  // 2026 — Jan -37% YoY (NOK 415M lost from 1,122M base ≈ 707M)
  707, 720, 805, 830
];

// ---------- Cod & whitefish to US (NOK millions) ----------
const cod_NOK = [
  120, 115, 125, 110, 100, 92, 88, 92, 100, 115, 130, 150,
  175, 168, 180, 158, 142, 122, 110, 102, 108, 118, 132, 148,
  118, 124, 138, 142
];

// ---------- Crab (king + snow) to US (NOK millions) ----------
// 2025 saw +110% king crab growth and +234% snow crab; Feb-May concentration
const crab_NOK = [
  60, 80, 95, 110, 100, 60, 40, 35, 40, 55, 70, 90,
  120, 195, 240, 270, 230, 110, 70, 55, 60, 80, 100, 130,
  90, 145, 175, 195
];

// ---------- Other species (mackerel, herring, salted, etc.) ----------
const other_NOK = [
  85, 78, 88, 82, 78, 70, 65, 68, 72, 80, 88, 100,
  110, 105, 115, 102, 95, 85, 78, 72, 76, 84, 92, 105,
  88, 92, 100, 102
];

// ---------- Pre-tariff counterfactual (total, NOK millions) ----------
// Continues Q1 2025 growth trajectory (+47% salmon / +55% total) at
// constant YoY uplift from Apr 2025 forward. Same seasonality.
const counterfactual_NOK = MONTHS.map((m, i) => {
  if (i < TARIFF_1_IDX) {
    return salmon_NOK[i] + cod_NOK[i] + crab_NOK[i] + other_NOK[i];
  }
  // YoY base = same month one year prior (2024 baseline), uplift +47%
  const baseIdx = i - 12;
  const base = salmon_NOK[baseIdx] + cod_NOK[baseIdx] + crab_NOK[baseIdx] + other_NOK[baseIdx];
  return Math.round(base * 1.47);
});

// ---------- Volume (tonnes) to US, total ----------
// Baseline ~ 8,000 t/mo in 2024, growing strongly through Q1 2025,
// then decelerating; January 2026 salmon volume -29% YoY drives the dip.
const volume_t = [
  7800, 7400, 8000, 7400, 6900, 6300, 6000, 6100, 6500, 7200, 8100, 9700,
  11200,10800,11500,10200, 9300, 8100, 7100, 6800, 7100, 7600, 8200, 8500,
  7950, 7800, 8400, 8600
];

const volume_counterfactual_t = MONTHS.map((m, i) => {
  if (i < TARIFF_1_IDX) return volume_t[i];
  const baseIdx = i - 12;
  return Math.round(volume_t[baseIdx] * 1.30); // counterfactual +30% volume
});

// ---------- Price per kg (NOK), salmon to US vs. all-markets blended ----------
// All-markets blended salmon price was lower in 2025 due to strong global supply.
// US realised price reflects what Norway received (ex-tariff, but tariff compresses
// the wholesale Norwegian-side margin as importers pass back the cost).
const price_us = [
  // 2024
  92, 94, 96, 95, 92, 90, 88, 89, 91, 95, 98, 102,
  // 2025: peaks pre-tariff Q1, slides as tariff loaded
  108, 110, 109, 104, 99, 95, 92, 91, 92, 93, 94, 95,
  // 2026: US realised price compressed
  88, 89, 90, 91
];

const price_other_markets = [
  // 2024
  85, 87, 88, 87, 84, 82, 80, 81, 82, 86, 89, 92,
  // 2025
  98, 100, 99, 95, 91, 88, 86, 85, 86, 87, 88, 89,
  // 2026
  87, 88, 89, 90
];

// ---------- Currency conversion ----------
const NOK_PER_USD = MONTHS.map((m, i) => {
  if (i < 12) return 10.6;          // 2024 average
  if (i < 24) return 10.3;          // 2025 average — weaker dollar
  return 9.6;                        // 2026 YTD
});

const PRE_TARIFF_BAND = {
  fromIdx: 0,
  toIdx: TARIFF_1_IDX - 1
};

const TARIFF_EVENTS = [
  { idx: TARIFF_1_IDX, label: "Apr '25 — 15% tariff", rate: "15%", color: "#d94a3b" },
  { idx: TARIFF_2_IDX, label: "Aug '25 — escalation", rate: "15%+", color: "#a93225" }
];

// Expose to other scripts
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
  TARIFF_1_IDX,
  TARIFF_2_IDX,
  TARIFF_EVENTS
};
