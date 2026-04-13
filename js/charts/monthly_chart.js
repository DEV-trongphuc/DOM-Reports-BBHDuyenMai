/**
 * @file monthly_chart.js
 * @description Vẽ biểu đồ chi tiêu theo tháng trong năm (bar chart).
 * @renders   #detail_account_year (canvas) → monthlyChartInstance
 * @depends   makeGoldGradient, makeGrayGradient, formatMoneyShort, formatNumber,
 *            MONTH_LABELS, ChartDataLabels, CHART_TICK_MID, CHART_GRID_COLOR,
 *            CHART_GRID_BORDER, CHART_TICK_LIGHT
 */
function renderMonthlyChart(data, filter) {
  const ctx = document.getElementById("detail_account_year")?.getContext("2d");
  if (!ctx) {
    console.error("Không tìm thấy canvas #detail_account_year");
    return;
  }

  const values   = data.map((monthData) => monthData[filter] || 0);
  const maxValue = Math.max(0, ...values);

  const gradientBlue = makeGoldGradient(ctx, 300);
  const gradientGray = makeGrayGradient(ctx, 300);
  const backgroundColors = values.map((v) => v === maxValue && v > 0 ? gradientBlue : gradientGray);

  const chartLabel = filter.charAt(0).toUpperCase() + filter.slice(1);
  const fmt = (v) => filter === "spend" ? formatMoneyShort(v) : formatNumber(v);

  if (monthlyChartInstance) {
    const chart = monthlyChartInstance;
    chart.data.labels                         = MONTH_LABELS;
    chart.data.datasets[0].data              = values;
    chart.data.datasets[0].backgroundColor   = backgroundColors;
    chart.data.datasets[0].label             = `${chartLabel} by Month`;
    chart.options.scales.y.suggestedMax       = maxValue * 1.1;
    chart.options.plugins.tooltip.callbacks.label    = (c) => `${chartLabel}: ${fmt(c.raw)}`;
    chart.options.plugins.datalabels.formatter       = (v) => v > 0 ? fmt(v) : "";
    chart.update({ duration: 600, easing: "easeOutQuart" });
    return;
  }

  monthlyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MONTH_LABELS,
      datasets: [{
        label: `${chartLabel} by Month`,
        data: values,
        backgroundColor: backgroundColors,
        borderRadius: 8,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10 } },
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${chartLabel}: ${fmt(c.raw)}` } },
        datalabels: {
          anchor: "end", align: "end", offset: 2,
          font: { size: 11, weight: "600" },
          color: CHART_TICK_MID,
          formatter: (v) => v > 0 ? fmt(v) : "",
        },
      },
      scales: {
        x: {
          grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { color: CHART_TICK_LIGHT, font: { weight: "600", size: 9 }, maxRotation: 0, minRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { display: false },
          suggestedMax: maxValue * 1.1,
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
