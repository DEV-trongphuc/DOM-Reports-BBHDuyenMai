/**
 * @file goal_chart.js
 * @description Vẽ biểu đồ phân bổ chi tiêu theo mục tiêu chiến dịch (bar chart).
 * @renders   #goal_chart (canvas) → window.goal_chart_instance
 * @depends   GOAL_KEYWORDS, GOAL_CHART_MODE, makeGoldGradient, makeGrayGradient,
 *            formatMoneyShort, ChartDataLabels, CHART_TICK_MID, CHART_GRID_COLOR,
 *            CHART_GRID_BORDER, CHART_TICK_LIGHT, loadBrandSettings
 */
function renderGoalChart(data) {
  if (!data || !Array.isArray(data)) return;

  const ctx = document.getElementById("goal_chart");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  if (window.goal_chart_instance) {
    window.goal_chart_instance.destroy();
    window.goal_chart_instance = null;
  }

  const mode = GOAL_CHART_MODE || "keyword";
  const goalSpend = {};

  if (mode === "brand") {
    const brands = loadBrandSettings();
    brands.forEach((b) => { goalSpend[b.name] = 0; });
    data.forEach((item) => {
      const campaignName = (item.campaign_name || "").toLowerCase();
      const spend        = parseFloat(item.insights?.spend || 0);
      for (const b of brands) {
        if (b.filter && campaignName.includes(b.filter.toLowerCase())) {
          goalSpend[b.name] += spend;
          break;
        }
      }
    });
  } else {
    GOAL_KEYWORDS.forEach((kw) => { goalSpend[kw] = 0; });
    data.forEach((item) => {
      const campaignName = (item.campaign_name || "").toLowerCase();
      const spend        = parseFloat(item.insights?.spend || 0);
      for (const kw of GOAL_KEYWORDS) {
        if (campaignName.includes(kw.toLowerCase())) {
          goalSpend[kw] += spend;
          break;
        }
      }
    });
  }

  const goals  = Object.keys(goalSpend).filter((g) => goalSpend[g] > 0 || GOAL_KEYWORDS.includes(g));
  const values = goals.map((g) => Math.round(goalSpend[g]));
  if (!goals.length) return;

  let maxGoal = "", maxVal = -1;
  Object.entries(goalSpend).forEach(([g, v]) => {
    if (v > maxVal) { maxVal = v; maxGoal = g; }
  });

  const gradientGold = makeGoldGradient(c2d, 300);
  const gradientGray = makeGrayGradient(c2d, 300);
  const bgColors = goals.map((g) => g === maxGoal && maxVal > 0 ? gradientGold : gradientGray);

  const isFew = goals.length < 3;

  window.goal_chart_instance = new Chart(c2d, {
    type: "bar",
    data: {
      labels: goals.map((g) => g.replace(/_/g, " ").toUpperCase()),
      datasets: [{
        label: "Spend",
        data: values,
        backgroundColor: bgColors,
        borderRadius: 8,
        borderWidth: 0,
        ...(isFew && { barPercentage: 0.35, categoryPercentage: 0.65 }),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 20 } },
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `Spend: ${formatMoneyShort(c.raw)}` } },
        datalabels: {
          anchor: "end", align: "end", offset: 2,
          font: { size: 11, weight: "600" },
          color: CHART_TICK_MID,
          formatter: (v) => v > 0 ? formatMoneyShort(v) : "",
        },
      },
      scales: {
        x: {
          grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { color: CHART_TICK_LIGHT, font: { weight: "600", size: 8.5 }, autoSkip: false, maxRotation: 45, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { display: false },
          suggestedMax: Math.max(...values) * 1.2,
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
