/**
 * @file dashboard_charts.js
 * @description Điều phối fetch batch và phân phối kết quả cho các hàm render.
 *
 * loadAllDashboardCharts(campaignIds)  — fetch batch → gọi tất cả render:
 *   • updatePlatformSummaryUI   → #spent, #[metric_id]..., .dom_interaction_*
 *   • renderPlatformSpendUI     → #platform_chart, #facebook_spent, #instagram_spent, #other_spent
 *   • renderPlatformPosition    → .dom_platform_abs .dom_toplist
 *   • renderAgeGenderChart      → xem charts/render_age_gender.js
 *   • renderRegionChart         → #region_chart
 *   • renderDetailDailyChart2   → xem charts/detail_daily.js
 *
 * loadSpendPlatform(campaignIds)  — chỉ refresh platform+position
 * summarizeSpendByPlatform(data)  — pure data transform, không render
 * formatNamePst(publisher,pos)    — format tên vị trí hiển thị
 *
 * @depends   fetchDashboardInsightsBatch, updatePlatformSummaryUI,
 *            renderPlatformSpendUI, renderPlatformPosition, renderAgeGenderChart,
 *            renderRegionChart, renderDetailDailyChart2, toggleSkeletons
 */
async function loadAllDashboardCharts(campaignIds = []) {
  const loading = document.querySelector(".loading");
  if (loading) loading.classList.add("active");

  try {
    window._LAST_CAMPAIGN_IDS = campaignIds;
    const results = await fetchDashboardInsightsBatch(campaignIds);

    const insights   = Array.isArray(results.platformStats) ? results.platformStats[0] || {} : results.platformStats || {};
    const totalSpend = +insights.spend || 0;

    if (totalSpend === 0) {
      document.querySelector(".dom_container")?.classList.add("is-empty");
      return;
    }
    document.querySelector(".dom_container")?.classList.remove("is-empty");

    // Wait for settings so updateSummaryCardHTML doesn't overwrite data
    if (window._SETTINGS_PROMISE) await window._SETTINGS_PROMISE;

    updatePlatformSummaryUI(results.platformStats, results.platformStats_previous);
    DAILY_DATA = results.dailySpend;

    const summary = summarizeSpendByPlatform(results.spendByPlatform);
    renderPlatformSpendUI(summary);
    renderPlatformPosition(results.spendByPlatform);
    renderAgeGenderChart(results.spendByAgeGender);
    renderRegionChart(results.spendByRegion);
    renderDetailDailyChart2(results.dailySpend, "spend");

    window._DASHBOARD_BATCH_RESULTS = results;
  } catch (err) {
    console.error("Error loading dashboard charts:", err);
  } finally {
    if (loading) loading.classList.remove("active");
  }
}

async function loadSpendPlatform(campaignIds = []) {
  const data    = await fetchSpendByPlatform(campaignIds);
  const summary = summarizeSpendByPlatform(data);
  renderPlatformSpendUI(summary);
  renderPlatformPosition(data);
}

function summarizeSpendByPlatform(data) {
  const result = { facebook: 0, instagram: 0, other: 0 };
  data.forEach((item) => {
    const platform = (item.publisher_platform || "other").toLowerCase();
    const spend    = +item.spend || 0;
    if (platform.includes("facebook"))      result.facebook  += spend;
    else if (platform.includes("instagram")) result.instagram += spend;
    else                                     result.other     += spend;
  });
  return result;
}

function formatNamePst(publisher, position) {
  const pub = (publisher || "").toLowerCase();
  const pos = (position  || "").toLowerCase();
  const name = pos.includes(pub) ? position : `${publisher}_${position}`;
  return name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
