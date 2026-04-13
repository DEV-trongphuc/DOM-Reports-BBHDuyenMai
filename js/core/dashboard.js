async function loadCampaignList() {
  try {
    const [campaignsInsights, adsets] = await Promise.all([
      fetchCampaignInsights(),
      fetchAdsets(),
    ]);
    if (!adsets || !adsets.length) throw new Error("No adsets found.");

    const adsetIds = adsets.map((as) => as.adset_id).filter(Boolean);
    const ads = await fetchAdsAndInsights(adsetIds);

    const adsetMap = new Map(
      adsets.map((as) => {
        as.ads = [];
        return [as.adset_id, as];
      })
    );
    ads.forEach((ad) => {
      const parentAdset = adsetMap.get(ad.adset_id);
      if (parentAdset) parentAdset.ads.push(ad);
    });

    const campaigns = groupByCampaign(adsets, campaignsInsights);

    window._ALL_CAMPAIGNS = campaigns;
    renderCampaignView(campaigns);

    const allAds = campaigns.flatMap((c) =>
      c.adsets.flatMap((as) =>
        (as.ads || []).map((ad) => ({
          campaign_name: c.name,
          optimization_goal: as.optimization_goal,
          insights: { spend: ad.spend || 0 },
        }))
      )
    );
    renderGoalChart(allAds);

    if (typeof loadExtraCharts === "function") loadExtraCharts();

    // Background preload Google Ads — delay để không tranh bandwidth với Meta render
    setTimeout(() => {
      if (typeof window.fetchGoogleAdsData === "function" && window.GOOGLE_ADS_SETUP !== false) {
        const currentRange = `${startDate}_${endDate}`;
        const alreadyLoaded =
          Array.isArray(window.googleAdsRawData) &&
          window.googleAdsRawData.length > 0 &&
          window._lastGAdsRange === currentRange;

        if (!alreadyLoaded) window.fetchGoogleAdsData(false);
      }
    }, 2000);

  } catch (err) {
    console.error("Error in loadCampaignList:", err);
  }
}

function initDashboard() {
  if (typeof startDate === "undefined" || !startDate) {
    const defaultRange = getDateRange("last_7days");
    startDate = defaultRange.start;
    endDate   = defaultRange.end;
  }
  initDateSelector();
  setupDetailDailyFilter();
  setupDetailDailyFilter2();
  setupFilterDropdown();
  setupYearDropdown();
  addListeners();
  setupAIReportModal();
}

async function loadDashboardData() {
  const domDate = document.querySelector(".dom_date");
  if (domDate) {
    const fmt = (d) => {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    };
    domDate.textContent = `${fmt(startDate)} - ${fmt(endDate)}`;
  }

  const loading = document.querySelector(".loading");
  if (loading) loading.classList.add("active");

  toggleSkeletons(".dom_dashboard", true);
  resetYearDropdownToCurrentYear();
  resetFilterDropdownTo("spend");

  await Promise.all([
    loadAllDashboardCharts(),
    initializeYearData(),
    loadCampaignList(),
  ]).finally(() => {
    if (loading) loading.classList.remove("active");
    toggleSkeletons(".dom_dashboard", false);
  });
}

async function main() {
  // Ẩn Google Ads nếu SETUP là false
  if (window.GOOGLE_ADS_SETUP === false) {
    const gadsTitle = document.getElementById("gads_menu_title");
    const gadsItem  = document.getElementById("gads_menu_item");
    if (gadsTitle) gadsTitle.style.display = "none";
    if (gadsItem)  gadsItem.style.display  = "none";

    const shareBtn     = document.getElementById("share_url_btn");
    const actionsGroup = document.querySelector(".toolbar_actions_group");
    if (shareBtn && actionsGroup) actionsGroup.appendChild(shareBtn);
  }

  // Ẩn Brand Filter nếu BRAND_FILTER_SETUP là false
  if (window.BRAND_FILTER_SETUP === false) {
    const brandFilter      = document.querySelector(".dom_filter");
    const brandSettingsBtn = document.getElementById("open_filter_settings");
    const brandDivider     = document.querySelector(".toolbar_divider");
    const perfBrandWrapper = document.querySelector(".perf_brand_filter_wrapper");
    if (brandFilter)      brandFilter.style.display      = "none";
    if (brandSettingsBtn) brandSettingsBtn.style.display  = "none";
    if (brandDivider)     brandDivider.style.display      = "none";
    if (perfBrandWrapper) perfBrandWrapper.style.display  = "none";
  }

  toggleSkeletons(".dom_dashboard", true);
  renderYears();
  initDashboard();

  window._SETTINGS_PROMISE = (async () => {
    if (typeof initSettingsSync === "function") {
      await initSettingsSync();
      if (typeof updateSummaryCardHTML === "function") updateSummaryCardHTML();
    }
  })();

  const googleAdsTask = (async () => {
    if (typeof fetchGoogleAdsData === "function") await fetchGoogleAdsData(false);
  })();

  await Promise.all([
    window._SETTINGS_PROMISE,
    googleAdsTask,
    initAccountSelector(),
    loadDashboardData(),
    syncAiHistoryFromSheet(),
  ]);

  // Lắng nghe sự kiện Reset All Filters từ Empty Card
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn_reset_all")) resetAllFilters();
  });

  // AI Summary buttons
  document.getElementById("ai_summary_btn")  ?.addEventListener("click", openAiSummaryModal);
  document.getElementById("ai_modal_close")  ?.addEventListener("click", closeAiSummaryModal);
  document.getElementById("ai_regenerate_btn")?.addEventListener("click", runAiSummary);

  const aiCopy = document.getElementById("ai_copy_btn");
  if (aiCopy) {
    aiCopy.addEventListener("click", () => {
      const content = document.getElementById("ai_summary_content");
      if (!content) return;
      navigator.clipboard.writeText(content.innerText || "");
      aiCopy.innerHTML = '<i class="fa-solid fa-check"></i> Đã sao chép';
      setTimeout(() => { aiCopy.innerHTML = '<i class="fa-solid fa-copy"></i> Sao chép'; }, 2000);
    });
  }

  // Close modal khi click overlay
  const overlay = document.getElementById("ai_summary_modal");
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeAiSummaryModal(); });

  // Brand Settings
  const settingsBtn   = document.getElementById("open_filter_settings");
  const settingsModal = document.getElementById("filter_settings_modal");
  if (settingsBtn)   settingsBtn.addEventListener("click", openFilterSettings);
  if (settingsModal) settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) closeFilterSettings(); });
}
