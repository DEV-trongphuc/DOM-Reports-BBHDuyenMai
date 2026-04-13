function renderDetailDailyChart(dataByDate, type = currentDetailDailyType) {
  if (!dataByDate) return;
  currentDetailDailyType = type; // Đảm bảo biến toàn cục được cập nhật

  const ctx = document.getElementById("detail_spent_chart");
  if (!ctx) return;

  const dates = Object.keys(dataByDate).sort();
  if (!dates.length) return;

  const chartData = dates.map((d) => {
    const item = dataByDate[d] || {};
    if (type === "spend") return item.spend || 0;
    if (type === "lead") return getResults(item);
    if (type === "reach") return item.reach || 0;
    if (type === "impression") return item.impressions || 0;
    if (type === "message")
      return item.actions["onsite_conversion.messaging_conversation_started_7d"] || 0;
    return 0;
  });

  const displayIndices = calculateIndicesToShow(chartData, 5);
  const maxValue = chartData.length ? Math.max(...chartData) : 0;
  const c2d = ctx.getContext("2d");

  // 🎨 Gradient
  const gLine = c2d.createLinearGradient(0, 0, 0, 400);
  if (type === "spend") {
    gLine.addColorStop(0, CHART_GOLD_SOFT);
    gLine.addColorStop(1, CHART_GOLD_FILL);
  } else if (type === "impression") {
    gLine.addColorStop(0, CHART_GOLD_SOFT);
    gLine.addColorStop(1, CHART_GOLD_FILL);
  } else {
    gLine.addColorStop(0, CHART_NAVY_SOFT);
    gLine.addColorStop(1, CHART_NAVY_FILL);
  }

  // 🌀 Nếu đã có chart → update
  if (window.detail_spent_chart_instance) {
    const chart = window.detail_spent_chart_instance;
    chart.data.labels = dates;
    chart.data.datasets[0].data = chartData;
    chart.data.datasets[0].label = type.charAt(0).toUpperCase() + type.slice(1);
    chart.data.datasets[0].borderColor =
      type === "spend" ? CHART_GOLD_DARK : CHART_NAVY_HEX;
    chart.data.datasets[0].backgroundColor = gLine;
    chart.options.scales.y.suggestedMax = maxValue * 1.1;

    chart.options.plugins.datalabels.displayIndices = displayIndices;
    chart.options.plugins.tooltip.callbacks.label = (c) =>
      `${c.dataset.label}: ${type === "spend" ? formatMoneyShort(c.raw) : c.raw
      }`;

    chart.update("active");
    return;
  }

  // 🆕 Nếu chưa có chart → tạo mới
  window.detail_spent_chart_instance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          data: chartData,
          backgroundColor: gLine,
          borderColor: type === "spend" ? CHART_GOLD_DARK : CHART_NAVY_HEX,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor:
            type === "spend" ? CHART_GOLD_DARK : CHART_NAVY_MID,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.dataset.label}: ${type === "spend" ? formatMoneyShort(c.raw) : c.raw
              }`,
          },
        },
        datalabels: {
          displayIndices: displayIndices,
          anchor: "end",
          align: "end",
          offset: 4,
          font: { size: 10 },
          color: CHART_TICK_LIGHT,
          formatter: (v, ctx) => {
            const indices = ctx.chart.options.plugins.datalabels.displayIndices;
            const index = ctx.dataIndex;

            if (v > 0 && indices.has(index)) {
              return currentDetailDailyType === "spend"
                ? formatMoneyShort(v)
                : v;
            }
            return ""; // Ẩn tất cả các nhãn khác
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_GRID_COLOR,
            drawBorder: true,
            borderColor: CHART_GRID_BORDER,
          },
          ticks: {
            color: CHART_TICK_MID,
            font: { size: 10 },
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          grid: {
            color: CHART_GRID_COLOR,
            drawBorder: true,
          },
          border: { color: CHART_GRID_DARK },
          beginAtZero: true,
          suggestedMax: maxValue * 1.1,
          ticks: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
// ----------------- xử lý filter -----------------
function setupDetailDailyFilter2() {
  const qualitySelect = document.querySelector(".dom_select.daily_total");
  if (!qualitySelect) return;

  const list = qualitySelect.querySelector("ul.dom_select_show");
  const selectedEl = qualitySelect.querySelector(".dom_selected");
  const allItems = list.querySelectorAll("li");

  // 🧩 Toggle dropdown
  qualitySelect.onclick = (e) => {
    e.stopPropagation();
    const isActive = list.classList.contains("active");
    document
      .querySelectorAll(".dom_select_show.active")
      .forEach((ul) => ul.classList.remove("active"));
    list.classList.toggle("active", !isActive);
  };

  // 🧠 Chọn loại hiển thị
  allItems.forEach((li) => {
    li.onclick = (e) => {
      e.stopPropagation();
      const type = li.dataset.view?.trim(); // <-- lấy data-view chuẩn

      if (!type) return;

      // Nếu đã active thì chỉ đóng dropdown
      if (li.classList.contains("active")) {
        list.classList.remove("active");
        return;
      }

      // reset trạng thái
      allItems.forEach((el) => el.classList.remove("active"));
      list
        .querySelectorAll(".radio_box")
        .forEach((r) => r.classList.remove("active"));

      // set active cho item mới
      li.classList.add("active");
      const radio = li.querySelector(".radio_box");
      if (radio) radio.classList.add("active");

      // đổi text hiển thị
      const textEl = li.querySelector("span:nth-child(2)");
      if (textEl) selectedEl.textContent = textEl.textContent.trim();

      // 🎯 render chart với type mới (nếu có data)
      if (typeof renderDetailDailyChart2 === "function" && DAILY_DATA) {
        renderDetailDailyChart2(DAILY_DATA, type);
      }

      // đóng dropdown
      list.classList.remove("active");
    };
  });

  // 🔒 Click ra ngoài → đóng dropdown
  document.addEventListener("click", (e) => {
    if (!qualitySelect.contains(e.target)) {
      list.classList.remove("active");
    }
  });
}

// ----------------- Generic Bar Chart with 2 Y axes -----------------
function renderBarChart(id, data) {
  if (!data) return;
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  const labels = Object.keys(data);
  const spentData = labels.map((l) => data[l].spend || 0);
  const resultData = labels.map((l) => getResults(data[l]));

  if (window[`${id}_chart`]) window[`${id}_chart`].destroy(); // Hủy chart cũ
  window[`${id}_chart`] = null; // Gán null

  window[`${id}_chart`] = new Chart(c2d, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Spent",
          data: spentData,
          backgroundColor: CHART_GOLD_LINE,
          borderColor: CHART_GOLD_LINE,
          borderWidth: 1,
          yAxisID: "ySpent",
        },
        {
          label: "Result",
          data: resultData,
          backgroundColor: CHART_NAVY_MID,
          borderColor: CHART_NAVY,
          borderWidth: 1,
          yAxisID: "yResult",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const val = c.raw || 0;
              return `${c.dataset.label}: ${c.dataset.label === "Spent" ? formatMoneyShort(val) : val
                }`;
            },
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          font: { weight: "bold", size: 12 },
          color: CHART_TICK_LIGHT,
          formatter: (v) => (v > 0 ? formatMoneyShort(v) : ""), // Dùng format short
        },
      },
      scales: {
        x: { grid: { color: CHART_GRID_BORDER }, ticks: { color: CHART_TICK_DARK } },
        ySpent: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          ticks: { callback: (v) => formatMoneyShort(v), color: CHART_GOLD_HEX }, // Dùng format short
          grid: { drawOnChartArea: true, color: CHART_GRID_BORDER },
        },
        yResult: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          ticks: { callback: (v) => v, color: CHART_NAVY_HEX },
          grid: { drawOnChartArea: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function renderChartByHour(dataByHour) {
  if (!dataByHour) return;

  const ctx = document.getElementById("chart_by_hour");
  if (!ctx) return;

  const hourKeys = Object.keys(dataByHour).sort(
    (a, b) => parseInt(a.slice(0, 2)) - parseInt(b.slice(0, 2))
  );
  const labels = hourKeys.map((h) => parseInt(h.slice(0, 2), 10) + "h");

  const spentData = hourKeys.map((h) => dataByHour[h].spend || 0);
  const resultData = hourKeys.map((h) => getResults(dataByHour[h]));

  const spentDisplayIndices = calculateIndicesToShow(spentData, 5);
  const resultDisplayIndices = calculateIndicesToShow(resultData, 5);

  const maxSpent = Math.max(...spentData) || 1;
  const maxResult = Math.max(...resultData) || 1;

  const c2d = ctx.getContext("2d");

  // 🎨 Gradient
  const gSpent = c2d.createLinearGradient(0, 0, 0, 300);
  gSpent.addColorStop(0, CHART_GOLD_SOFT);
  gSpent.addColorStop(1, CHART_GOLD_BG);

  const gResult = c2d.createLinearGradient(0, 0, 0, 300);
  gResult.addColorStop(0, CHART_NAVY_SOFT);
  gResult.addColorStop(1, CHART_NAVY_BG);

  if (window.chartByHourInstance) window.chartByHourInstance.destroy();
  window.chartByHourInstance = null; // Gán null

  window.chartByHourInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Spent",
          data: spentData,
          backgroundColor: gSpent,
          borderColor: CHART_GOLD_DARK,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: CHART_GOLD_DARK,
          borderWidth: 2,
          yAxisID: "ySpent",
        },
        {
          label: "Result",
          data: resultData,
          backgroundColor: gResult,
          borderColor: CHART_NAVY_HEX,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: CHART_NAVY_HEX,
          borderWidth: 2,
          yAxisID: "yResult",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.dataset.label}: ${c.dataset.label === "Spent" ? formatMoneyShort(c.raw) : c.raw
              }`,
          },
        },
        datalabels: {
          displayIndicesSpent: spentDisplayIndices,
          displayIndicesResult: resultDisplayIndices,
          anchor: "end",
          align: "end",
          offset: 4,
          font: { size: 11 },
          color: CHART_TICK_LIGHT,
          formatter: (v, ctx) => {
            if (v <= 0) return ""; // Ẩn số 0

            const index = ctx.dataIndex;
            const datalabelOptions = ctx.chart.options.plugins.datalabels;

            if (ctx.dataset.label === "Spent") {
              if (datalabelOptions.displayIndicesSpent.has(index)) {
                return formatMoneyShort(v);
              }
            } else if (ctx.dataset.label === "Result") {
              if (datalabelOptions.displayIndicesResult.has(index)) {
                return v;
              }
            }

            return ""; // Ẩn tất cả các điểm khác
          },
        },
      },
      scales: {
        x: {
          grid: { color: CHART_GRID_COLOR, drawBorder: true },
          border: { color: CHART_GRID_DARK },
          ticks: {
            color: CHART_TICK_DARK,
            font: { size: 11 },
          },
        },
        ySpent: {
          type: "linear",
          position: "left",
          grid: { color: CHART_GRID_COLOR, drawBorder: true },
          border: { color: "rgba(0,0,0,0.15)" },
          beginAtZero: true,
          suggestedMax: maxSpent * 1.1,
          ticks: { display: false },
        },
        yResult: {
          type: "linear",
          position: "right",
          grid: { drawOnChartArea: false },
          border: { color: "rgba(0,0,0,0.15)" },
          beginAtZero: true,
          suggestedMax: maxResult * 1.2,
          ticks: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// ================== Schedule Intelligence ==================
function renderScheduleIntelligence(dataByHour) {
  const wrap = document.getElementById("schedule_intelligence");
  if (!wrap || !dataByHour) return;

  const hourKeys = Object.keys(dataByHour);
  if (!hourKeys.length) { wrap.innerHTML = ""; return; }

  const hourStats = hourKeys.map(hk => {
    const d = dataByHour[hk];
    const spend = d.spend || 0;
    const result = getResults(d) || 0;
    const hour = parseInt(hk.slice(0, 2), 10);
    const cpr = result > 0 ? spend / result : null;
    return { hour, spend, result, cpr };
  }).filter(s => s.spend > 0);

  if (!hourStats.length) { wrap.innerHTML = ""; return; }

  const hasResults = hourStats.some(s => s.result > 0);

  const sorted = [...hourStats].sort((a, b) => {
    if (hasResults) {
      if (a.cpr !== null && b.cpr === null) return -1;
      if (a.cpr === null && b.cpr !== null) return 1;
      if (a.cpr !== null && b.cpr !== null) return a.cpr - b.cpr;
    }
    return b.spend - a.spend;
  });

  // FA icons cho top 3 (thay emoji)
  const medalIcons = [
    `<i class="fa-solid fa-trophy" style="color:#f59e0b;font-size:1rem;"></i>`,
    `<i class="fa-solid fa-medal" style="color:#94a3b8;font-size:1rem;"></i>`,
    `<i class="fa-solid fa-award" style="color:#cd7c2f;font-size:1rem;"></i>`,
  ];

  const best = sorted.slice(0, 3).map((s, i) => {
    return `<span style="display:inline-flex;align-items:center;gap:0.4rem;background:#fff;
      border:1.5px solid ${i === 0 ? '#f59e0b' : '#fcd34d'};border-radius:6px;
      padding:0.2rem 0.8rem;font-weight:700;color:${i === 0 ? '#92400e' : '#b45309'};white-space:nowrap;">
      ${medalIcons[i]} ${s.hour}h–${s.hour + 1}h${s.cpr ? `<span style="font-weight:400;opacity:0.6;font-size:0.9em;">(${(s.cpr / 1000).toFixed(1)}k CPR)</span>` : ''}
    </span>`;
  }).join("");

  const withResult = hourStats.filter(s => s.cpr !== null);
  let worstHtml = "";
  if (withResult.length > 3) {
    const worst = [...withResult].sort((a, b) => b.cpr - a.cpr)[0];
    worstHtml = `<span style="display:inline-flex;align-items:center;gap:0.3rem;color:#ef4444;font-size:1rem;margin-left:0.2rem;">
      <i class="fa-solid fa-triangle-exclamation"></i> Tránh ${worst.hour}h</span>`;
  }

  const metricLabel = hasResults ? "CPR thấp nhất" : "Spend cao nhất";

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;padding:0.8rem 1.2rem;margin-top:0.8rem;
      background:linear-gradient(135deg,#fffbeb,#fef9ec);border:1px solid #fde68a;
      border-radius:10px;font-size:1.25rem;">
      <span style="display:flex;align-items:center;gap:0.4rem;font-weight:700;color:#92400e;white-space:nowrap;">
        <i class="fa-solid fa-clock" style="color:#f59e0b;"></i> Best hours
        <span style="font-weight:400;opacity:0.6;font-size:0.9em;">(${metricLabel})</span>
      </span>
      ${best}
      ${worstHtml}
    </div>
  `;
}

function renderChartByDevice(dataByDevice) {
  if (!dataByDevice) return;

  const ctx = document.getElementById("chart_by_device");
  if (!ctx) { console.warn('[Device] #chart_by_device not found'); return; }

  // Destroy chart cũ
  if (window.chart_by_device_instance) {
    window.chart_by_device_instance.destroy();
    window.chart_by_device_instance = null;
  }

  const prettyName = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const validEntries = Object.entries(dataByDevice)
    .map(([k, v]) => {
      const spend = typeof v === 'object' ? (v.spend || 0) : 0;
      const result = typeof v === 'object' ? (getResults(v) || 0) : 0;
      return { key: k, label: prettyName(k), spend, result };
    })
    .filter(e => e.spend > 0 || e.result > 0)
    .sort((a, b) => (b.spend || b.result) - (a.spend || a.result));

  if (!validEntries.length) return;

  const useSpend = validEntries.some(e => e.spend > 0);
  const values = validEntries.map(e => useSpend ? e.spend : e.result);
  const labels = validEntries.map(e => e.label);
  const total = values.reduce((a, b) => a + b, 0);
  const topLabel = labels[0];
  const topPercent = total > 0 ? ((values[0] / total) * 100).toFixed(1) : '0';

  const getIcon = (key) => {
    const k = key.toLowerCase();
    if (k.includes('desktop')) return 'fa-desktop';
    if (k.includes('tablet') || k.includes('ipad')) return 'fa-tablet-screen-button';
    return 'fa-mobile-screen';
  };
  const iconColors = ['#4267B2', '#E1306C', '#f59e0b', '#10b981', '#6366f1'];

  // ⭐ TẠO LAYOUT SIDE-BY-SIDE
  const domInner = ctx.closest(".dom_inner");
  const chartWrapper = ctx.parentElement; // div.chart-wrapper.circular
  if (!domInner || !chartWrapper) return;

  // 1. Tạo hoặc lấy Flex Wrapper (để chia trái/phải)
  let flexWrap = domInner.querySelector('.dev-flex-layout');
  if (!flexWrap) {
    flexWrap = document.createElement('div');
    flexWrap.className = 'dev-flex-layout';
    flexWrap.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:1.5rem;padding:0.5rem 0;flex-wrap:wrap;';
    
    // Chèn flexWrap vào sau h2
    const h2 = domInner.querySelector('h2');
    if (h2) h2.after(flexWrap);
    else domInner.prepend(flexWrap);
  }

  // 2. Tạo hoặc lấy List Bên Trái
  let listSide = flexWrap.querySelector('#_dev_list_side');
  if (!listSide) {
    listSide = document.createElement('div');
    listSide.id = '_dev_list_side';
    listSide.style.cssText = 'flex:1.2;min-width:180px;display:flex;flex-direction:column;gap:0.8rem;';
    flexWrap.appendChild(listSide);
  }
  listSide.innerHTML = ''; // Clear items cũ

  // 3. Đưa Chart Wrapper sang bên Phải (nếu nó chưa nằm trong flex)
  if (chartWrapper.parentElement !== flexWrap) {
    chartWrapper.style.flex = '1';
    chartWrapper.style.minWidth = '140px';
    chartWrapper.style.maxWidth = '220px';
    chartWrapper.style.margin = '0';
    flexWrap.appendChild(chartWrapper);
  }

  // 4. Render list items vào List Side (trái)
  validEntries.slice(0, 5).forEach((entry, i) => {
    const val = values[i];
    const displayVal = useSpend
      ? parseInt(val).toLocaleString('vi-VN') + '₫'
      : formatNumber(val) + ' results';
    const item = document.createElement('div');
    item.style.cssText = `
      display:flex;flex-direction:column;gap:0.2rem;
      padding:0.7rem 1rem;border-radius:10px;
      border:1px solid #f3f4f6;background:#fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.02);
    `;
    item.innerHTML = `
      <p style="display:flex;align-items:center;gap:0.6rem;font-weight:600;color:#64748b;font-size:0.85rem;margin:0;">
        <i class="fa-solid ${getIcon(entry.key)}" style="color:${iconColors[i] || '#94a3b8'};font-size:1rem;"></i>
        <span>${entry.label}</span>
      </p>
      <p style="font-weight:700;font-size:1.15rem;color:#1e293b;margin:0;padding-left:1.6rem;">${displayVal}</p>
    `;
    listSide.appendChild(item);
  });

  // Center Label (nội dung giữa donut)
  let centerLabel = chartWrapper.querySelector('#_dev_center_label');
  if (!centerLabel) {
    centerLabel = document.createElement('div');
    centerLabel.id = '_dev_center_label';
    chartWrapper.style.position = 'relative';
    chartWrapper.appendChild(centerLabel);
  }
  centerLabel.style.cssText = 'position:absolute;text-align:center;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;';
  centerLabel.innerHTML = `
    <p style="font-size:1.6rem;font-weight:800;color:#1e293b;margin:0;line-height:1.2;">${topPercent}%</p>
    <p style="font-size:0.9rem;color:#64748b;margin:0.2rem 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${topLabel}</p>
  `;

  // Vẽ Chart lên canvas GỐC
  try {
    window.chart_by_device_instance = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map((_, i) => i === 0 ? CHART_GOLD_HEX : CHART_GRAY_HEX),
          borderWidth: 2,
          borderColor: '#fff',
          hoverBackgroundColor: values.map((_, i) => i === 0 ? CHART_GOLD_LINE : CHART_GRAY_HOVER),
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const pct = ((c.raw / total) * 100).toFixed(1);
                const val = useSpend ? parseInt(c.raw).toLocaleString('vi-VN') + '₫' : formatNumber(c.raw);
                return `${c.label}: ${val} (${pct}%)`;
              }
            }
          },
          datalabels: { display: false },
        },
        hoverOffset: 6,
      }
    });
  } catch(err) {
    console.error('[Device] Chart error:', err);
  }
}



function renderChartByRegion(dataByRegion) {
  if (!dataByRegion) return;

  const ctx = document.getElementById("chart_by_region");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  const prettyName = (key) =>
    key
      .replace(/province/gi, "")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

  // ✅ Helper mạnh hơn getResults() cho breakdown data (object format)
  // Meta API breakdown đôi khi trả về "messaging_conversation_started_7d"
  // thay vì "onsite_conversion.messaging_conversation_started_7d"
  const getBreakdownResult = (v) => {
    const acts = v.actions || {};
    if (!Object.keys(acts).length) return 0;

    // ✅ Mess campaign region dùng key này
    if (acts["onsite_conversion.total_messaging_connection"] > 0)
      return +acts["onsite_conversion.total_messaging_connection"];

    // 1. Thử getResults() bình thường trước
    const normal = getResults(v);
    if (normal > 0) return normal;

    // 2. Thử tất cả values trong resultMapping (kể cả phiên bản ngắn không có tiền tố)
    const goal = VIEW_GOAL || "";
    const goalKey = GOAL_GROUP_LOOKUP[goal] || "";
    const triedTypes = new Set();

    const main = resultMapping[goal];
    if (main) triedTypes.add(main);

    if (goalKey && goalMapping[goalKey]) {
      for (const g of goalMapping[goalKey]) {
        const t = resultMapping[g];
        if (t) triedTypes.add(t);
      }
    }

    for (const fullType of triedTypes) {
      if (acts[fullType] > 0) return +acts[fullType];
      const shortType = fullType.replace(/^onsite_conversion\./, "");
      if (shortType !== fullType && acts[shortType] > 0) return +acts[shortType];
    }

    // 3. Fallback: lấy action value lớn nhất trong object
    const vals = Object.values(acts).map(Number).filter(n => n > 0);
    return vals.length ? Math.max(...vals) : 0;
  };

  const entries = Object.entries(dataByRegion).map(([k, v]) => ({
    name: prettyName(k),
    spend: v.spend || 0,
    result: getBreakdownResult(v),
  }));

  const totalSpend = entries.reduce((acc, e) => acc + e.spend, 0);
  const minSpend = totalSpend * 0.02;

  const filtered = entries.filter((r) => r.spend >= minSpend);

  if (window.chart_by_region_instance) {
    window.chart_by_region_instance.destroy();
    window.chart_by_region_instance = null;
  }

  if (!filtered.length) return;

  // ✅ Top 5 cao nhất
  filtered.sort((a, b) => b.spend - a.spend);
  const top5 = filtered.slice(0, 5);

  // ✅ Helper rút gọn tên vùng
  const shortenName = (name) => {
    let s = name
      .replace(/\b(tỉnh|thành phố|tp\.|tp|province|city|region|state|district|area|zone)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
    return s.length > 12 ? s.slice(0, 11) + "…" : s;
  };

  const labels = top5.map((e) => shortenName(e.name));
  const fullNamesDetail = top5.map((e) => e.name);
  const spentData = top5.map((e) => e.spend);
  const resultData = top5.map((e) => e.result);

  // ✅ Kiểm tra có result thực không
  const hasResult = resultData.some((v) => v > 0);

  // ✅ Bar hẹp khi ít region (giống goal_chart)
  const isFew = top5.length < 3;

  // 🎨 Màu theo style goal_chart
  const maxSpendIndex = spentData.indexOf(Math.max(...spentData));

  // 🎯 Highlight bar spend cao nhất = vàng, còn lại = xám (style goal_chart)
  const gradientGold = makeGoldGradient(c2d, 300);

  const gradientGray = makeGrayGradient(c2d, 300);

  const gradientNavy = c2d.createLinearGradient(0, 0, 0, 300);
  gradientNavy.addColorStop(0, CHART_NAVY);
  gradientNavy.addColorStop(1, CHART_NAVY_MID);

  // Spend: bar cao nhất = gold, còn lại = gray (giống goal_chart)
  const spentColors = spentData.map((_, i) =>
    i === maxSpendIndex ? gradientGold : gradientGray
  );

  // Datasets
  const datasets = [
    {
      label: "Spend",
      data: spentData,
      backgroundColor: spentColors,
      borderWidth: 0,
      borderRadius: 8,
      yAxisID: "ySpend",
      ...(isFew && { barPercentage: 0.35, categoryPercentage: 0.65 }),
    },
  ];

  if (hasResult) {
    const maxResultIndex = resultData.indexOf(Math.max(...resultData));
    datasets.push({
      label: "Result",
      data: resultData,
      backgroundColor: resultData.map((_, i) =>
        i === maxResultIndex ? gradientGray : "rgba(200,200,200,0.5)"
      ),
      borderWidth: 0,
      borderRadius: 6,
      yAxisID: "yResult",
      // ✅ Bar nhỏ hơn Spend — giống cột xám trong AgeGender chart
      barPercentage: 0.45,
      categoryPercentage: 0.6,
    });
  }

  window.chart_by_region_instance = new Chart(c2d, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { left: 10, right: 10, bottom: 20 } },
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) => fullNamesDetail[ctx[0].dataIndex] || ctx[0].label,
            label: (ctx) =>
              `${ctx.dataset.label}: ${ctx.dataset.label === "Spend"
                ? formatMoneyShort(ctx.raw)
                : ctx.raw
              }`,
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          offset: 2,
          font: { size: 11, weight: "600" },
          color: "#555",
          formatter: (value, ctx) =>
            value > 0 ? formatMoneyShort(value) : "",
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(0,0,0,0.03)",
            drawBorder: true,
            borderColor: "rgba(0,0,0,0.05)",
          },
          ticks: {
            color: CHART_TICK_LIGHT,
            font: { weight: "600", size: 8.5 },
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
          },
        },
        ySpend: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
          ticks: { display: false },
          suggestedMax: Math.max(...spentData) * 1.2,
        },
        yResult: {
          type: "linear",
          position: "right",
          display: hasResult,
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { display: false },
          suggestedMax: hasResult ? Math.max(...resultData) * 1.5 : 1,
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function renderChartByAgeGender(dataByAgeGender) {
  if (!dataByAgeGender) return;

  const ctx = document.getElementById("chart_by_age_gender");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  const ageGroups = {};

  // ✅ Chỉ gom Male + Female
  for (const [key, val] of Object.entries(dataByAgeGender)) {
    const lowerKey = key.toLowerCase();

    let gender = null;
    if (lowerKey.includes("female")) gender = "female";
    else if (lowerKey.includes("male")) gender = "male";
    else continue;

    const age = key
      .replace(/_|male|female/gi, "")
      .trim()
      .toUpperCase();

    if (!ageGroups[age]) ageGroups[age] = { male: 0, female: 0 };
    ageGroups[age][gender] = getResults(val) || 0;
  }

  const ages = Object.keys(ageGroups);
  const maleData = ages.map((a) => ageGroups[a].male);
  const femaleData = ages.map((a) => ageGroups[a].female);

  // ✅ Highlight theo tổng result
  const totals = ages.map((a) => ageGroups[a].male + ageGroups[a].female);
  const maxTotalIndex = totals.indexOf(Math.max(...totals));

  // ✨ Gradient vàng quyền lực + xám thanh lịch
  const gradientGold = makeGoldGradient(c2d, 300);
  const gradientGray = makeGrayGradient(c2d, 300);

  const maleColors = ages.map((_, i) =>
    i === maxTotalIndex ? gradientGold : gradientGray
  );
  const femaleColors = ages.map((_, i) =>
    i === maxTotalIndex ? gradientGold : gradientGray
  );

  if (window.chart_by_age_gender_instance) {
    window.chart_by_age_gender_instance.destroy();
    window.chart_by_age_gender_instance = null;
  }

  window.chart_by_age_gender_instance = new Chart(c2d, {
    type: "bar",
    data: {
      labels: ages,
      datasets: [
        {
          label: "Male",
          data: maleData,
          backgroundColor: maleColors,
          borderRadius: 6,
          borderWidth: 0,
        },
        {
          label: "Female",
          data: femaleData,
          backgroundColor: femaleColors,
          borderRadius: 6,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { left: 10, right: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatMoneyShort(ctx.raw)}`,
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          offset: 2,
          font: { weight: "600", size: 11 },
          color: CHART_TICK_MID,
          formatter: (v) => (v > 0 ? formatMoneyShort(v) : ""),
        },
      },
      scales: {
        x: {
          grid: { color: CHART_GRID_COLOR, drawBorder: true },
          ticks: {
            color: CHART_TICK_DARK,
            font: { weight: "600", size: 11 },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: CHART_GRID_COLOR, drawBorder: true },
          ticks: { display: false },
          suggestedMax: Math.max(...totals) * 1.1,
        },
      },
      animation: { duration: 600, easing: "easeOutQuart" },
    },
    plugins: [ChartDataLabels],
  });
}

const getLogo = (key, groupKey = "") => {
  const k = key.toLowerCase();
  if (groupKey === "byDevice") {
    if (
      k.includes("iphone") ||
      k.includes("ipod") ||
      k.includes("ipad") ||
      k.includes("macbook")
    )
      return "https://raw.githubusercontent.com/DEV-trongphuc/META-REPORT/refs/heads/main/logo_ip%20(1).png";
    if (k.includes("android") || k.includes("mobile"))
      return "https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg";
    if (k.includes("desktop") || k.includes("pc"))
      return "https://ms.codes/cdn/shop/articles/this-pc-computer-display-windows-11-icon.png?v=1709255180";
  }
  if (groupKey === "byAgeGender" || groupKey === "byRegion")
    return "https://raw.githubusercontent.com/DEV-trongphuc/DOM_MISA_IDEAS_CRM/refs/heads/main/DOM_MKT%20(2).png";

  if (k.includes("facebook"))
    return "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png";
  if (k.includes("messenger"))
    return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRemnhxz7XnQ1BiDuwUlmdQoYO9Wyko5-uOGQ&s";
  if (k.includes("instagram"))
    return "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg";
  if (k.includes("threads"))
    return "https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/social-medias/thread-block-logo-1-i73pfbwpt6bmcgvlcae3sc.png/thread-block-logo-1-14s5twxzakpdzka2bufeir.png";

  return "https://raw.githubusercontent.com/DEV-trongphuc/DOM_MISA_IDEAS_CRM/refs/heads/main/DOM_MKT%20(2).png";
};
const formatName = (key) =>
  key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

function renderChartByPlatform(allData) {
  const wrap = document.querySelector("#chart_by_platform .dom_toplist");
  if (!wrap || !allData) return;
  wrap.innerHTML = "";

  const sources = {
    byPlatform: "By Platform",
    byDevice: "By Device",
    byAgeGender: "By Age & Gender",
    byRegion: "By Region",
  };

  let hasData = false;
  const fragment = document.createDocumentFragment(); // ⭐ TỐI ƯU: Dùng Fragment

  for (const [groupKey, groupLabel] of Object.entries(sources)) {
    const group = allData[groupKey];
    if (!group) continue;

    const items = [];
    for (const [key, val] of Object.entries(group)) {
      const spend = +val.spend || 0;
      const result = getResults(val); // có thể = 0 hoặc undefined
      const goal = VIEW_GOAL;

      let cpr = 0;
      if (result && spend) {
        const isThousandMetric = (goal === "REACH" || goal === "IMPRESSIONS");
        cpr = isThousandMetric ? (spend / result) * 1000 : spend / result;
      }

      if (spend > 0) items.push({ key, spend, result: result || 0, cpr, goal });
    }

    if (!items.length) continue;
    hasData = true;

    items.sort((a, b) => b.spend - a.spend);

    const cprValues = items.map((x) => x.cpr).filter((x) => x > 0);
    const minCPR = cprValues.length ? Math.min(...cprValues) : 0;
    const maxCPR = cprValues.length ? Math.max(...cprValues) : 0;

    // Divider group
    const divider = document.createElement("li");
    divider.className = "blank";
    divider.innerHTML = `<p><b>${groupLabel}</b></p>`;
    fragment.appendChild(divider);

    items.forEach((p) => {
      let color = "rgb(213,141,0)"; // mặc định vàng
      if (p.cpr > 0 && p.cpr === minCPR)
        color = "rgb(2,116,27)"; // ✅ xanh cho CPR tốt nhất
      else if (p.cpr > 0 && p.cpr === maxCPR) color = "rgb(215,0,0)"; // 🔴 đỏ cho CPR cao nhất
      const bg = color.replace("rgb", "rgba").replace(")", ",0.05)");

      const li = document.createElement("li");
      li.dataset.platform = p.key;
      li.className = p.cpr > 0 && p.cpr === minCPR ? "best-performer" : "";
      li.innerHTML = `
        <p>
          <img src="${getLogo(p.key, groupKey)}" alt="${p.key}" />
          <span>${formatName(p.key)}</span>
        </p>
        <p><span class="total_spent"><i class="fa-solid fa-money-bill"></i> ${p.spend.toLocaleString(
        "vi-VN"
      )}đ</span></p>
        <p><span class="total_result"><i class="fa-solid fa-bullseye"></i> ${p.result > 0 ? formatNumber(p.result) : "—"
        }</span></p>
        <p class="toplist_percent" style="color:${color};background:${bg}">
          ${p.result > 0 ? formatMoney(p.cpr) : "—"}
        </p>
      `;
      fragment.appendChild(li);
    });
  }

  if (!hasData) {
    wrap.innerHTML = `<li><p>Không có dữ liệu hợp lệ để hiển thị.</p></li>`;
  } else {
    wrap.appendChild(fragment); // ⭐ TỐI ƯU: Thêm vào DOM 1 lần
  }
}

function renderDeepCPR(allData) {
  const wrap = document.querySelector("#deep_cpr .dom_toplist");
  if (!wrap) return;
  wrap.innerHTML = "";

  const sources = {
    byAgeGender: "By Age & Gender",
    byRegion: "By Region",
    byPlatform: "By Platform",
    byDevice: "By Device",
  };

  const fragment = document.createDocumentFragment(); // ⭐ TỐI ƯU: Dùng Fragment
  let hasData = false; // Cờ kiểm tra

  for (const [groupKey, groupName] of Object.entries(sources)) {
    const group = allData[groupKey];
    if (!group) continue;

    const groupItems = [];
    for (const [key, val] of Object.entries(group)) {
      const spend = +val.spend || 0;
      const result = getResults(val);
      if (!spend || !result) continue;
      const goal = (val.optimization_goal || VIEW_GOAL || "").toUpperCase();
      const isThousandMetric = (goal === "REACH" || goal === "IMPRESSIONS");
      const cpr = isThousandMetric ? (spend / result) * 1000 : spend / result;
      groupItems.push({ key, spend, result, cpr, goal });
    }

    if (!groupItems.length) continue;
    hasData = true; // Đánh dấu là có dữ liệu

    groupItems.sort((a, b) => a.cpr - b.cpr);

    const divider = document.createElement("li");
    divider.className = "blank";
    divider.innerHTML = `<p><b>${groupName}</b></p>`;
    fragment.appendChild(divider);

    const minCPR = groupItems[0].cpr;
    const maxCPR = groupItems[groupItems.length - 1].cpr;

    groupItems.forEach((p) => {
      let color = "rgb(255,169,0)";
      if (p.cpr === minCPR) color = "rgb(2,116,27)";
      else if (p.cpr === maxCPR) color = "rgb(240,57,57)";
      const bg = color.replace("rgb", "rgba").replace(")", ",0.08)");

      const li = document.createElement("li");
      li.innerHTML = `
        <p><b>${formatDeepName(p.key)}</b></p>
        <p class="toplist_percent" style="color:${color};background:${bg}">
          ${formatMoney(p.cpr)} ${(p.goal === "REACH" || p.goal === "IMPRESSIONS") ? " / 1000" : ""}
        </p>
      `;
      fragment.appendChild(li);
    });
  }

  if (!hasData) {
    wrap.innerHTML = `<li><p>Không có dữ liệu đủ để phân tích.</p></li>`;
  } else {
    wrap.appendChild(fragment); // ⭐ TỐI ƯU: Thêm vào DOM 1 lần
  }
}

// --- format tên key đẹp hơn ---
function formatDeepName(key) {
  if (!key) return "-";
  return key
    .replace(/_/g, " ")
    .replace(/\bprovince\b/gi, "")
    .replace(/\bmale\b/gi, "Male")
    .replace(/\bfemale\b/gi, "Female")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ----------------- Main function gọi các chart -----------------
function renderCharts({
  byHour,
  byAgeGender,
  byRegion,
  byPlatform,
  byDevice,
  byDate,
}) {
  renderDetailDailyChart(byDate, "spend");
  renderChartByHour(byHour);
  renderScheduleIntelligence(byHour);
  renderChartByAgeGender(byAgeGender);
  renderChartByRegion(byRegion);
  renderChartByDevice(byDevice);
  // renderChartByPlatform(byPlatform); // Hàm này đã được gọi riêng
}

// Khởi chạy
// let currentDetailDailyType = "spend";
// --- Hàm lấy giá trị cho chart từ item và type ---
function getChartValue(item, type) {
  const actions = item.actions || [];

  const typeMap = {
    lead: ["lead", "onsite_conversion.lead_grouped"],
    message: ["onsite_conversion.messaging_conversation_started_7d"],
    like: ["like"],
    spend: ["spend"],
    reach: ["reach"],
    impression: ["impressions"],
  };

  const keys = Array.isArray(typeMap[type]) ? typeMap[type] : [typeMap[type]];

  for (const k of keys) {
    if (k === "spend" && item.spend !== undefined) return +item.spend;
    if (k === "reach" && item.reach !== undefined) return +item.reach;
    if (k === "impressions" && item.impressions !== undefined) return +item.impressions;

    // Tối ưu: dùng for loop thay vì find()
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].action_type === k) {
        return +actions[i].value;
      }
    }
  }

  return 0;
}

// --- Hàm vẽ chart chi tiết ---
function renderDetailDailyChart2(dataByDate, type = currentDetailDailyType) {
  if (!dataByDate) return;
  currentDetailDailyType = type;

  const ctx = document.getElementById("leadTrendChart");
  if (!ctx) return;

  const dates = Array.isArray(dataByDate)
    ? dataByDate.map((item) => item.date_start)
    : Object.keys(dataByDate);
  if (!dates.length) return;

  const dateMap = Array.isArray(dataByDate)
    ? Object.fromEntries(dataByDate.map((i) => [i.date_start, i]))
    : dataByDate;

  const chartData = dates.map((d) => {
    const item = dateMap[d] || {};
    return getChartValue(item, type); // Giả sử hàm này tồn tại
  });

  const displayIndices = calculateIndicesToShow(chartData, 5);
  const gLine = ctx.getContext("2d").createLinearGradient(0, 0, 0, 400);
  gLine.addColorStop(0, CHART_GOLD_SOFT);
  gLine.addColorStop(1, "rgba(255,171,0,0.01)");

  if (window.detail_spent_chart_instance2) {
    const chart = window.detail_spent_chart_instance2;
    if (chart.data.labels.join(",") !== dates.join(",")) {
      chart.data.labels = dates;
    }
    chart.data.datasets[0].data = chartData;
    chart.data.datasets[0].label = type.charAt(0).toUpperCase() + type.slice(1);

    chart.options.plugins.tooltip.callbacks.label = (c) =>
      `${c.dataset.label}: ${type === "spend" ? formatMoneyShort(c.raw) : c.raw
      }`;

    chart.options.plugins.datalabels.displayIndices = displayIndices;
    chart.update({ duration: 500, easing: "easeOutCubic" });
    return;
  }

  window.detail_spent_chart_instance2 = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          data: chartData,
          backgroundColor: gLine,
          borderColor: CHART_GOLD_DARK,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: CHART_GOLD_DARK,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeOutCubic" },
      layout: {
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.dataset.label}: ${type === "spend" ? formatMoneyShort(c.raw) : c.raw
              }`,
          },
        },
        datalabels: {
          displayIndices: displayIndices,
          anchor: "end",
          align: "end",
          font: { size: 11 },
          color: CHART_TICK_MID,
          formatter: (v, ctx) => {
            const indices = ctx.chart.options.plugins.datalabels.displayIndices;
            const index = ctx.dataIndex;

            if (v > 0 && indices.has(index)) {
              return currentDetailDailyType === "spend"
                ? formatMoneyShort(v)
                : v;
            }

            return "";
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_GRID_COLOR,
            drawBorder: true,
            borderColor: CHART_GRID_BORDER,
          },
          ticks: {
            color: CHART_TICK_MID,
            font: { size: 10 },
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0,0,0,0.03)",
            drawBorder: true,
            borderColor: "rgba(0,0,0,0.05)",
          },
          ticks: { display: false },
          afterDataLimits: (scale) => {
            if (scale.max != null) scale.max = scale.max * 1.1;
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
