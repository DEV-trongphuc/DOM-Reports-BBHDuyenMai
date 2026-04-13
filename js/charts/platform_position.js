/**
 * @file platform_position.js
 * @description Render danh sách vị trí quảng cáo và biểu đồ phân bổ platform.
 *
 * renderPlatformPosition(data)
 *   @renders  .dom_platform_abs .dom_toplist (ul → list các li vị trí)
 *
 * renderPlatformSpendUI(summary)
 *   @renders  #platform_chart (canvas doughnut) → window.platformChartInstance
 *             #facebook_spent, #instagram_spent, #other_spent (text)
 *
 * loadRegionSpendChart()  — loader wrapper, gọi fetchSpendByRegion + renderRegionChart
 *
 * @depends   getLogo, formatNamePst, formatMoney, formatMoneyShort,
 *            CHART_FACEBOOK, CHART_INSTAGRAM, CHART_OTHER_PLAT,
 *            CHART_TICK_TEXT, fetchSpendByRegion, renderRegionChart
 */
function renderPlatformPosition(data) {
  const wrap = document.querySelector(".dom_platform_abs .dom_toplist");
  if (!wrap || !Array.isArray(data)) return;
  wrap.innerHTML = "";

  const positionMap = {};
  let totalSpend = 0;

  data.forEach((item) => {
    const publisher = item.publisher_platform || "other";
    const position = item.platform_position || "unknown";
    const key = `${publisher}_${position}`;
    const spend = +item.spend || 0;

    totalSpend += spend;
    if (!positionMap[key]) positionMap[key] = { spend: 0, publisher, position };
    positionMap[key].spend += spend;
  });

  const positions = Object.entries(positionMap).sort(
    (a, b) => b[1].spend - a[1].spend
  );
  const fragment = document.createDocumentFragment();

  positions.forEach(([key, val]) => {
    const { publisher, position, spend } = val;
    const percent = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
    const li = document.createElement("li");

    li.innerHTML = `
      <p>
        <img src="${getLogo(publisher)}" alt="${publisher}" />
        <span>${formatNamePst(publisher, position)}</span>
      </p>
      <p><span class="total_spent"><i class="fa-solid fa-money-bill"></i> ${spend.toLocaleString(
      "vi-VN"
    )}đ</span></p>
      <p class="toplist_percent" style="color:rgb(226,151,0);background:rgba(255,169,0,0.05)">
        <!-- color: CHART_WARN | background: CHART_GOLD_BG -->
        ${percent.toFixed(1)}%
      </p>
    `;
    fragment.appendChild(li);
  });

  if (!positions.length) {
    wrap.innerHTML = `<li><p>Không có dữ liệu để hiển thị.</p></li>`;
  } else {
    wrap.appendChild(fragment);
  }
}

function renderPlatformSpendUI(summary) {
  if (!summary) return;

  // --- Cập nhật text ---
  document.querySelector("#facebook_spent").textContent = formatMoney(
    summary.facebook
  );
  document.querySelector("#instagram_spent").textContent = formatMoney(
    summary.instagram
  );
  document.querySelector("#other_spent").textContent = formatMoney(
    summary.other
  );

  const total = summary.facebook + summary.instagram + summary.other;

  const ctx = document.getElementById("platform_chart");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  if (window.platformChartInstance) {
    window.platformChartInstance.destroy();
    window.platformChartInstance = null; // Gán null
  }

  if (total <= 0) return; // Nếu total = 0, chỉ destroy chart cũ và return

  const values = [summary.facebook, summary.instagram, summary.other];
  const labels = ["Facebook", "Instagram", "Other"];
  const maxIndex = values.indexOf(Math.max(...values));
  const maxLabel = labels[maxIndex];
  const maxPercent = ((values[maxIndex] / total) * 100).toFixed(1);

  // 🧠 Plugin custom để hiện % giữa lỗ
  const centerPercentPlugin = {
    id: "centerPercent",
    afterDraw(chart) {
      const { width, ctx } = chart;
      const { top, bottom } = chart.chartArea;
      const centerX = width / 2;
      const centerY = (top + bottom) / 2;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = CHART_TICK_TEXT;
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`${maxPercent}%`, centerX, centerY - 11);
      ctx.font = "12px sans-serif";
      ctx.fillText(maxLabel, centerX, centerY + 11);
      ctx.restore();
    },
  };

  window.platformChartInstance = new Chart(c2d, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
            backgroundColor: [
            CHART_FACEBOOK, // Facebook
            CHART_OTHER_PLAT, // Other
            CHART_INSTAGRAM, // Instagram
          ],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${formatMoneyShort(ctx.raw)} (${(
                (ctx.raw / total) *
                100
              ).toFixed(1)}%)`,
          },
        },
        datalabels: { display: false }, // ❌ ẩn % trong từng miếng
      },
    },
    plugins: [centerPercentPlugin],
  });
}

async function loadRegionSpendChart(campaignIds = []) {
  const data = await fetchSpendByRegion(campaignIds);
  renderRegionChart(data);
}

