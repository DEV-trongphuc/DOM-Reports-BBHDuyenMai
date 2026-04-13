function resetAllFilters() {
  if (typeof applyCampaignFilter === "function") {
    applyCampaignFilter("RESET");
  } else {
    const campaignSearch = document.getElementById("campaign_filter");
    if (campaignSearch) campaignSearch.value = "";
    resetUIFilter();
    loadAllDashboardCharts();
  }
  document.querySelector(".dom_container")?.classList.remove("is-empty");
}

// ── Smart Badges Toggle ──────────────────────────────────────────
window._smartBadgesEnabled = true;

window.toggleSmartBadges = function (btn) {
  window._smartBadgesEnabled = !window._smartBadgesEnabled;
  const on = window._smartBadgesEnabled;
  btn.style.borderColor = on ? "#f59e0b" : "#e2e8f0";
  btn.style.color       = on ? "#f59e0b" : "#64748b";
  btn.style.background  = on ? "#fffbeb" : "#fff";
  btn.title = on ? "Ẩn Smart Badges" : "Hiển thị Smart Badges";
  if (window.lastRenderData) renderCampaignTable(window.lastRenderData);
};

// Đợi cả hai: token Meta đã resolve VÀ user đã đăng nhập Google
const _startPromises = [
  window._tokenReady instanceof Promise ? window._tokenReady : Promise.resolve(),
  window._authReady  instanceof Promise ? window._authReady  : Promise.resolve(),
];
Promise.all(_startPromises).then(() => main());

// Callback khi user nhập token mới từ modal → reload toàn bộ dữ liệu
window._afterTokenResolved = function () {
  if (typeof CACHE !== "undefined" && CACHE && typeof CACHE.clear === "function") {
    CACHE.clear();
  }
  main();
};

// ── Format helpers ───────────────────────────────────────────────
const formatMoney  = (v) => v && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") + "đ" : "0đ";
const formatNumber = (v) => v && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") : "0";
const calcCpm      = (spend, reach) => reach ? (spend / reach) * 1000 : 0;
const calcFrequency = (impr, reach) => reach ? (impr / reach).toFixed(1) : "0.0";

const getReaction = (insights) => getAction(insights?.actions, "post_reaction");

const calcCpr = (insights) => {
  const spend = +insights?.spend || 0;
  const result = getResults(insights);
  if (!result) return 0;
  const goal = insights.optimization_goal || VIEW_GOAL || "";
  const factor = (goal === "REACH" || goal === "IMPRESSIONS") ? 1000 : 1;
  return (spend / result) * factor;
};

function loadLazyImages(container) {
  if (!container) return;
  container.querySelectorAll("img[data-src]").forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  });
}
