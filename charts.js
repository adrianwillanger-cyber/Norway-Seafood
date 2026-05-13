/* ============================================================
   Chart configuration — Chart.js v4
   ============================================================ */

const D = window.SeafoodData;

// Read computed CSS variables so chart colors stay in sync with the theme
const css = getComputedStyle(document.documentElement);
const COLORS = {
  fjord:   css.getPropertyValue("--color-fjord").trim()   || "#1a3d5c",
  fjord2:  css.getPropertyValue("--color-fjord-2").trim() || "#2b6790",
  glacier: css.getPropertyValue("--color-glacier").trim() || "#6fa8c9",
  mist:    css.getPropertyValue("--color-mist").trim()    || "#b9d4e3",
  salmon:  css.getPropertyValue("--color-salmon").trim()  || "#e87a5d",
  coral:   css.getPropertyValue("--color-coral").trim()   || "#d94a3b",
  amber:   css.getPropertyValue("--color-amber").trim()   || "#d4a13b",
  pine:    css.getPropertyValue("--color-pine").trim()    || "#2f5b4e",
  text:    css.getPropertyValue("--color-text").trim()    || "#14242f",
  muted:   css.getPropertyValue("--color-text-muted").trim() || "#5b6a76",
  faint:   css.getPropertyValue("--color-text-faint").trim() || "#8c98a3",
  border:  css.getPropertyValue("--color-border").trim()  || "#e6e2d8"
};

const FONT_BODY = '"Satoshi", system-ui, -apple-system, sans-serif';
const FONT_DISPLAY = '"General Sans", "Satoshi", system-ui, sans-serif';

Chart.defaults.font.family = FONT_BODY;
Chart.defaults.font.size = 12;
Chart.defaults.color = COLORS.muted;
Chart.defaults.borderColor = COLORS.border;
// chartjs-plugin-annotation auto-registers when loaded via UMD; no manual register needed.

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const fmtMoney = (n, ccy) => {
  const v = Math.round(n);
  return ccy === "USD" ? `$${fmt(v)}M` : `${fmt(v)}M kr`;
};

// Convert a NOK-million series to USD-million series using monthly FX
const toUSD = (seriesNOK) =>
  seriesNOK.map((v, i) => Math.round(v / D.NOK_PER_USD[i]));

// Tariff annotations applied to most charts
const tariffAnnotations = {
  preTariffBand: {
    type: "box",
    xMin: -0.5,
    xMax: D.TARIFF_1_IDX - 0.5,
    backgroundColor: "rgba(47, 91, 78, 0.05)",
    borderColor: "rgba(47, 91, 78, 0.0)",
    drawTime: "beforeDatasetsDraw",
    label: {
      display: true,
      content: "PRE-TARIFF",
      position: { x: "start", y: "start" },
      color: COLORS.pine,
      font: { family: FONT_DISPLAY, size: 10, weight: "600" },
      backgroundColor: "transparent",
      padding: { top: 6, left: 6 }
    }
  },
  postTariffBand: {
    type: "box",
    xMin: D.TARIFF_1_IDX - 0.5,
    xMax: D.MONTHS.length - 0.5,
    backgroundColor: "rgba(217, 74, 59, 0.04)",
    borderColor: "rgba(217, 74, 59, 0.0)",
    drawTime: "beforeDatasetsDraw",
    label: {
      display: true,
      content: "POST-TARIFF",
      position: { x: "start", y: "start" },
      color: COLORS.coral,
      font: { family: FONT_DISPLAY, size: 10, weight: "600" },
      backgroundColor: "transparent",
      padding: { top: 6, left: 8 }
    }
  },
  tariff1Line: {
    type: "line",
    xMin: D.TARIFF_1_IDX - 0.5,
    xMax: D.TARIFF_1_IDX - 0.5,
    borderColor: COLORS.coral,
    borderWidth: 1.5,
    borderDash: [6, 4],
    label: {
      display: true,
      content: ["Apr '25", "+15% tariff"],
      position: "start",
      color: "white",
      backgroundColor: COLORS.coral,
      font: { family: FONT_DISPLAY, size: 10, weight: "700" },
      padding: 6,
      borderRadius: 4,
      yAdjust: 8
    }
  },
  tariff2Line: {
    type: "line",
    xMin: D.TARIFF_2_IDX - 0.5,
    xMax: D.TARIFF_2_IDX - 0.5,
    borderColor: "#a93225",
    borderWidth: 1.5,
    borderDash: [6, 4],
    label: {
      display: true,
      content: ["Aug '25", "escalation"],
      position: "end",
      color: "white",
      backgroundColor: "#a93225",
      font: { family: FONT_DISPLAY, size: 10, weight: "700" },
      padding: 6,
      borderRadius: 4,
      yAdjust: -8
    }
  }
};

const baseScales = (yLabel) => ({
  x: {
    grid: { display: false, drawTicks: false },
    border: { color: COLORS.border },
    ticks: {
      color: COLORS.muted,
      maxRotation: 0,
      autoSkip: true,
      autoSkipPadding: 14,
      font: { family: FONT_BODY, size: 11 }
    },
    stacked: false
  },
  y: {
    grid: { color: COLORS.border, drawTicks: false },
    border: { display: false },
    ticks: {
      color: COLORS.muted,
      font: { family: FONT_BODY, size: 11 },
      callback: (v) => fmt(v)
    },
    title: yLabel
      ? {
          display: true,
          text: yLabel,
          color: COLORS.faint,
          font: { family: FONT_BODY, size: 11, weight: "500" },
          padding: { bottom: 8 }
        }
      : undefined
  }
});

const baseTooltip = {
  enabled: true,
  backgroundColor: COLORS.fjord,
  titleColor: "white",
  titleFont: { family: FONT_DISPLAY, size: 12, weight: "600" },
  bodyColor: "rgba(255,255,255,0.85)",
  bodyFont: { family: FONT_BODY, size: 12 },
  padding: 12,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 6
};

// ============================================================
// CHART 1 — Stacked monthly value to US, with counterfactual line
// ============================================================

let valueChart;
function buildValueChart(currency) {
  const ctx = document.getElementById("valueChart");
  const conv = currency === "USD" ? toUSD : (s) => s;

  const data = {
    labels: D.MONTHS,
    datasets: [
      {
        type: "bar",
        label: "Salmon",
        data: conv(D.salmon_NOK),
        backgroundColor: COLORS.salmon,
        borderRadius: 0,
        stack: "actual",
        order: 4
      },
      {
        type: "bar",
        label: "Cod & whitefish",
        data: conv(D.cod_NOK),
        backgroundColor: COLORS.pine,
        stack: "actual",
        order: 3
      },
      {
        type: "bar",
        label: "King & snow crab",
        data: conv(D.crab_NOK),
        backgroundColor: COLORS.amber,
        stack: "actual",
        order: 2
      },
      {
        type: "bar",
        label: "Other species",
        data: conv(D.other_NOK),
        backgroundColor: COLORS.glacier,
        stack: "actual",
        order: 1
      },
      {
        type: "line",
        label: "Pre-tariff counterfactual",
        data: conv(D.counterfactual_NOK),
        borderColor: COLORS.fjord,
        backgroundColor: "transparent",
        borderDash: [6, 4],
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: COLORS.fjord,
        pointHoverBorderColor: "white",
        pointHoverBorderWidth: 2,
        tension: 0.35,
        order: 0
      }
    ]
  };

  const config = {
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        ...baseScales(currency === "USD" ? "Million USD" : "Million NOK"),
        x: { ...baseScales().x, stacked: true },
        y: { ...baseScales(currency === "USD" ? "Million USD" : "Million NOK").y, stacked: true }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => {
              const v = ctx.parsed.y;
              return `  ${ctx.dataset.label}: ${fmtMoney(v, currency)}`;
            },
            footer: (items) => {
              const stacked = items
                .filter(i => i.dataset.stack === "actual")
                .reduce((s, i) => s + i.parsed.y, 0);
              const cf = items.find(i => i.dataset.label === "Pre-tariff counterfactual");
              const lines = [`Total: ${fmtMoney(stacked, currency)}`];
              if (cf && items[0].dataIndex >= D.TARIFF_1_IDX) {
                const gap = cf.parsed.y - stacked;
                lines.push(`Gap vs. counterfactual: ${gap >= 0 ? "−" : "+"}${fmtMoney(Math.abs(gap), currency)}`);
              }
              return lines;
            }
          }
        },
        annotation: {
          annotations: tariffAnnotations
        }
      },
      animation: { duration: 700, easing: "easeOutQuart" }
    }
  };

  config.type = "bar";
  if (valueChart) valueChart.destroy();
  valueChart = new Chart(ctx, config);
}

// ============================================================
// CHART 2 — Volume (tonnes) to US, monthly
// ============================================================

function buildVolumeChart() {
  const ctx = document.getElementById("volumeChart");

  const config = {
    data: {
      labels: D.MONTHS,
      datasets: [
        {
          type: "bar",
          label: "Volume to US (tonnes)",
          data: D.volume_t,
          backgroundColor: D.volume_t.map((_, i) =>
            i < D.TARIFF_1_IDX ? COLORS.fjord2 : COLORS.coral
          ),
          borderRadius: 2,
          barPercentage: 0.8,
          categoryPercentage: 0.85
        },
        {
          type: "line",
          label: "Counterfactual (no tariff)",
          data: D.volume_counterfactual_t,
          borderColor: COLORS.fjord,
          backgroundColor: "transparent",
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: baseScales("Tonnes"),
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)} t`
          }
        },
        annotation: { annotations: tariffAnnotations }
      },
      animation: { duration: 700, easing: "easeOutQuart" }
    }
  };

  config.type = "bar";
  new Chart(ctx, config);
}

// ============================================================
// CHART 3 — Price per kg, US vs. other markets
// ============================================================

function buildPriceChart() {
  const ctx = document.getElementById("priceChart");

  const config = {
    data: {
      labels: D.MONTHS,
      datasets: [
        {
          label: "US realised price (NOK/kg)",
          data: D.price_us,
          borderColor: COLORS.coral,
          backgroundColor: "rgba(217, 74, 59, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.coral,
          pointHoverBorderColor: "white",
          pointHoverBorderWidth: 2
        },
        {
          label: "Other markets, blended (NOK/kg)",
          data: D.price_other_markets,
          borderColor: COLORS.fjord2,
          backgroundColor: "transparent",
          tension: 0.35,
          borderWidth: 2.5,
          borderDash: [],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.fjord2,
          pointHoverBorderColor: "white",
          pointHoverBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        ...baseScales("NOK / kg"),
        y: {
          ...baseScales("NOK / kg").y,
          suggestedMin: 75,
          suggestedMax: 115
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          align: "start",
          labels: {
            color: COLORS.muted,
            font: { family: FONT_BODY, size: 12 },
            boxWidth: 12,
            boxHeight: 2,
            padding: 16,
            usePointStyle: false
          }
        },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(0)} NOK/kg`
          }
        },
        annotation: { annotations: tariffAnnotations }
      },
      animation: { duration: 700, easing: "easeOutQuart" }
    }
  };

  config.type = "line";
  new Chart(ctx, config);
}

// ============================================================
// CHART 4 — Margin compression: US premium vs. global
// ============================================================

function buildMarginChart() {
  const ctx = document.getElementById("marginChart");

  const premium = D.price_us.map((p, i) => p - D.price_other_markets[i]);

  const barColors = premium.map((v, i) => {
    if (i < D.TARIFF_1_IDX) return COLORS.pine;
    return v > 0 ? COLORS.amber : COLORS.coral;
  });

  const config = {
    data: {
      labels: D.MONTHS,
      datasets: [
        {
          type: "bar",
          label: "US premium vs. all-markets blended",
          data: premium,
          backgroundColor: barColors,
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: baseScales("Premium (NOK/kg)"),
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) => `  US premium: ${ctx.parsed.y >= 0 ? "+" : ""}${ctx.parsed.y.toFixed(1)} NOK/kg`
          }
        },
        annotation: { annotations: tariffAnnotations }
      },
      animation: { duration: 700, easing: "easeOutQuart" }
    }
  };

  config.type = "bar";
  new Chart(ctx, config);
}

// ============================================================
// Init
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  buildValueChart("NOK");
  buildVolumeChart();
  buildPriceChart();
  buildMarginChart();

  // Currency toggle
  document.querySelectorAll(".chip[data-currency]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".chip[data-currency]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      buildValueChart(btn.dataset.currency);
    });
  });
});
