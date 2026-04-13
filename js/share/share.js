function shareCurrentView() {
  const url = new URL(window.location.href);
  url.searchParams.set("since", startDate || "");
  url.searchParams.set("until", endDate || "");

  if (CURRENT_CAMPAIGN_FILTER && CURRENT_CAMPAIGN_FILTER.toUpperCase() !== "RESET") {
    url.searchParams.set("brand", CURRENT_CAMPAIGN_FILTER);
  } else {
    url.searchParams.delete("brand");
  }

  const shareUrl = url.toString();
  navigator.clipboard.writeText(shareUrl)
    .then(() => showToast("🔗 Link copied! Date range & brand filter included.", 3000))
    .catch(() => prompt("Copy this link:", shareUrl));

  window.history.replaceState({}, "", shareUrl);
}

// Auto-restore state from URL params on load
(function restoreStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const since  = params.get("since");
  const until  = params.get("until");
  const brand  = params.get("brand");
  if (since && until) {
    window._URL_RESTORE = { since, until, brand: brand || "" };
  }
})();

// Hook into initDashboard to restore URL params after init
const _origInitDashboard = typeof initDashboard === "function" ? initDashboard : null;
if (_origInitDashboard) {
  window.initDashboard = function () {
    _origInitDashboard.call(this);
    if (window._URL_RESTORE) {
      const { since, until, brand: brandFilter } = window._URL_RESTORE;
      startDate = since;
      endDate   = until;
      window._URL_RESTORE_BRAND = brandFilter;
      showToast(`🔗 Restored view: ${since} → ${until}${brandFilter ? " | Brand: " + brandFilter : ""}`, 4000);
    }
  };
}

// Patch loadDashboardData to apply brand after data loads
const _origLoadDashboardData = typeof loadDashboardData === "function" ? loadDashboardData : null;
if (_origLoadDashboardData) {
  window.loadDashboardData = async function (...args) {
    await _origLoadDashboardData.apply(this, args);
    if (window._URL_RESTORE_BRAND !== undefined) {
      const b = window._URL_RESTORE_BRAND;
      window._URL_RESTORE_BRAND = undefined;
      if (b && typeof applyCampaignFilter === "function") await applyCampaignFilter(b);
    }
  };
}

document.getElementById("share_url_btn")?.addEventListener("click", shareCurrentView);
