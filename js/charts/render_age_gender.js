// ── state ────────────────────────────────────────────────
let _ageGenderRawData = [];
let _ageOnlyMode      = false;

// Nút bật/tắt Age Only
function toggleAgeOnlyView() {
  _ageOnlyMode = !_ageOnlyMode;
  const btn = document.getElementById("age_only_toggle_btn");
  if (btn) {
    btn.innerHTML = _ageOnlyMode
      ? `<i class="fa-solid fa-venus-mars"></i> Age &amp; Gender`
      : `<i class="fa-solid fa-venus-mars"></i> Age Only`;
    btn.style.background = _ageOnlyMode ? "var(--mainClr)" : "";
    btn.style.color      = _ageOnlyMode ? "#fff" : "";
  }
  renderAgeGenderChart(_ageGenderRawData);
}

function renderAgeGenderChart(rawData = []) {
  _ageGenderRawData = rawData;   // cache để toggle dùng lại
  if (!Array.isArray(rawData) || !rawData.length) return;

  const data = rawData.filter((d) => d.gender && d.gender.toLowerCase() !== "unknown");

  const ctx = document.getElementById("age_gender_total");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  if (window.chart_age_gender_total?.destroy) {
    window.chart_age_gender_total.destroy();
    window.chart_age_gender_total = null;
  }
  if (!data.length) return;

  const ages = [...new Set(data.map((d) => d.age))].sort((a, b) => parseInt(a) - parseInt(b));

  // ── Tổng spend theo age (dùng cho cả 2 mode) ──────────
  const totalByAge = {};
  ages.forEach((age) => {
    totalByAge[age] = data
      .filter((d) => d.age === age)
      .reduce((sum, d) => sum + (+d.spend || 0), 0);
  });
  const maxAge = Object.keys(totalByAge).reduce((a, b) => totalByAge[a] > totalByAge[b] ? a : b);

  // ── Gradients ──────────────────────────────────────────
  const gradientGray = c2d.createLinearGradient(0, 0, 0, 300);
  gradientGray.addColorStop(0, CHART_GRAY_SOLID);
  gradientGray.addColorStop(1, CHART_GRAY_BOT2);

  const gradientGold = c2d.createLinearGradient(0, 0, 0, 300);
  gradientGold.addColorStop(0, CHART_GOLD);
  gradientGold.addColorStop(1, CHART_GOLD_MID);

  const colorFor = (age) => age === maxAge ? gradientGold : gradientGray;

  // ── Datasets ───────────────────────────────────────────
  let datasets;
  if (_ageOnlyMode) {
    // Mode: 1 bar per age (gộp tất cả gender)
    datasets = [{
      label: "Total",
      data: ages.map((age) => totalByAge[age]),
      backgroundColor: ages.map(colorFor),
      borderRadius: 8,
      borderWidth: 0,
    }];
  } else {
    // Mode: male + female riêng
    const maleSpends   = ages.map((age) => +(data.find((d) => d.age === age && d.gender.toLowerCase() === "male")?.spend   || 0));
    const femaleSpends = ages.map((age) => +(data.find((d) => d.age === age && d.gender.toLowerCase() === "female")?.spend || 0));
    datasets = [
      { label: "Male",   data: maleSpends,   backgroundColor: ages.map(colorFor), borderRadius: 8, borderWidth: 0 },
      { label: "Female", data: femaleSpends, backgroundColor: ages.map(colorFor), borderRadius: 8, borderWidth: 0 },
    ];
  }

  window.chart_age_gender_total = new Chart(c2d, {
    type: "bar",
    data: { labels: ages, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10 } },
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) => `Age: ${ctx[0].label}`,
            label: (ctx) => _ageOnlyMode
              ? `Total: ${formatMoneyShort(ctx.raw)}`
              : `${ctx.dataset.label}: ${formatMoneyShort(ctx.raw)}`,
          },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          stacked: false,
          grid:  { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { color: CHART_TICK_MID, font: { weight: "600", size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid:  { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
