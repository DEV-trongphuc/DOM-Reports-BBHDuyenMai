function setupYearDropdown() {
  const yearFilter = document.querySelector(".dom_select.year");
  if (!yearFilter) return;

  const yearList = yearFilter.querySelector("ul.dom_select_show");
  const selectedYearEl = yearFilter.querySelector(".dom_selected");
  const yearItems = yearList.querySelectorAll("li");

  // Xử lý đóng/mở
  yearFilter.addEventListener("click", (e) => {
    e.stopPropagation();
    const isActive = yearList.classList.contains("active");
    document.querySelectorAll(".dom_select_show.active").forEach((ul) => {
      if (ul !== yearList) ul.classList.remove("active");
    });
    yearList.classList.toggle("active", !isActive);
  });

  // Xử lý chọn năm
  yearItems.forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      const selectedYearValue = parseInt(li.dataset.type, 10);

      if (li.classList.contains("active")) {
        yearList.classList.remove("active");
        return;
      }

      // Cập nhật UI
      yearItems.forEach((el) => el.classList.remove("active"));
      yearList
        .querySelectorAll(".radio_box")
        .forEach((r) => r.classList.remove("active"));
      li.classList.add("active");
      li.querySelector(".radio_box").classList.add("active");
      selectedYearEl.textContent = li.textContent.trim();

      // Reset filter về "spend"
      const filter = "spend";
      resetFilterDropdownTo(filter);
      const loading = document.querySelector(".loading");
      if (loading) loading.classList.add("active");

      // Gọi API (sẽ dùng cache nếu có)
      fetchAdAccountData(selectedYearValue)
        .then((data) => {
          // data đã được gán vào DATA_YEAR bên trong fetchAdAccountData
          const processedData = processMonthlyData(data);
          renderMonthlyChart(processedData, filter);
          loading.classList.remove("active");
        })
        .catch((error) => {
          loading.classList.remove("active");
          console.error("Lỗi khi fetch dữ liệu năm mới:", error);
          renderMonthlyChart(processMonthlyData([]), filter); // Vẽ biểu đồ rỗng
        });

      yearList.classList.remove("active");
    });
  });

  // Đóng khi click ra ngoài
  document.addEventListener("click", (e) => {
    if (!yearFilter.contains(e.target)) {
      yearList.classList.remove("active");
    }
  });
}

/**
 * Hàm helper: Reset dropdown filter về một giá trị cụ thể.
 */
function resetFilterDropdownTo(filterType) {
  const filterDropdown = document.querySelector(".dom_select.year_filter");
  if (!filterDropdown) return;

  const filterList = filterDropdown.querySelector("ul.dom_select_show");
  const filterItems = filterList.querySelectorAll("li");

  filterItems.forEach((el) => {
    const isTarget = el.dataset.type === filterType;
    el.classList.toggle("active", isTarget);
    el.querySelector(".radio_box").classList.toggle("active", isTarget);

    if (isTarget) {
      filterDropdown.querySelector(".dom_selected").textContent =
        el.textContent.trim();
    }
  });
}
/**
 * Reset dropdown năm về năm hiện tại.
 */
function resetYearDropdownToCurrentYear() {
  const yearFilter = document.querySelector(".dom_select.year");
  if (!yearFilter) return;

  const yearList = yearFilter.querySelector("ul.dom_select_show");
  const selectedYearEl = yearFilter.querySelector(".dom_selected");
  const yearItems = yearList.querySelectorAll("li");

  // Lấy năm hiện tại
  const currentYear = new Date().getFullYear();

  // Cập nhật UI cho năm hiện tại
  yearItems.forEach((li) => {
    const yearValue = parseInt(li.dataset.type, 10);

    if (yearValue === currentYear) {
      li.classList.add("active");
      li.querySelector(".radio_box").classList.add("active");
      selectedYearEl.textContent = li.textContent.trim();
    } else {
      li.classList.remove("active");
      li.querySelector(".radio_box").classList.remove("active");
    }
  });

  // Đóng dropdown năm
  yearList.classList.remove("active");
}
// async function reloadFullData() {
//   const ids = []; // rỗng => full data
//   loadPlatformSummary(ids);
//   loadSpendPlatform(ids);
//   loadAgeGenderSpendChart(ids);
//   loadRegionSpendChart(ids);
//   const dailyData = await fetchDailySpendByCampaignIDs(ids);
//   renderDetailDailyChart2(dailyData, "spend");

//   // render lại chart mục tiêu
//   const allAds = window._ALL_CAMPAIGNS.flatMap((c) =>
//     c.adsets.flatMap((as) =>
//       (as.ads || []).map((ad) => ({
//         optimization_goal: as.optimization_goal,
//         insights: { spend: ad.spend || 0 },
//       }))
//     )
//   );
//   renderGoalChart(allAds);
// }
function resetUIFilter() {
  // ✅ 1. Reset quick filter dropdown về Ampersand
  const quickFilter = document.querySelector(".quick_filter_detail");
  if (quickFilter) {
    const selectedEl = quickFilter.querySelector(".dom_selected");
    const imgEl = quickFilter.querySelector("img");
    const ul = quickFilter.querySelector(".dom_select_show");

    // Đổi ảnh & text về Ampersand
    if (imgEl) imgEl.src = "./assets/brand_logo/ampersand_img.jpg";
    if (selectedEl) selectedEl.textContent = "Ampersand";

    // Xóa trạng thái active trên list item
    if (ul) {
      ul.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    }
  }

  // ✅ 2. Reset ô search input
  const searchInput = document.getElementById("campaign_filter");
  if (searchInput) searchInput.value = "";
}

// === Reset button inside campaign empty state ===
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".view_campaign_empty .btn_reset_all");
  if (!btn) return;
  if (typeof applyCampaignFilter === "function") {
    applyCampaignFilter("RESET");
  }
});

// === Safe setup for campaign filter UI ===
(function initCampaignFilterSafe() {
  // Guard: ensure DOM exists
  const filterInputC = document.getElementById("campaign_filter");
  const filterBox = document.querySelector(".dom_campaign_filter");
  const filterList = filterBox?.querySelector("ul");
  const filterBtn = document.getElementById("filter_button");

  // If core DOM parts missing, bail out gracefully
  if (!filterInputC || !filterBox || !filterList) {
    console.warn(
      "[campaign-filter] Required DOM elements not found — skipping setup."
    );
    return;
  }

  // Guard: ensure helpers exist (provide no-op fallbacks)
  const safeGetCampaignIcon =
    typeof getCampaignIcon === "function"
      ? getCampaignIcon
      : () => "fa-solid fa-bullseye"; // fallback icon class

  const safeApplyCampaignFilter =
    typeof applyCampaignFilter === "function"
      ? applyCampaignFilter
      : async (k) => {
        console.warn(
          "[campaign-filter] applyCampaignFilter missing. Keyword:",
          k
        );
      };

  const safeDebounce =
    typeof debounce === "function"
      ? debounce
      : (fn, d = 500) => {
        let t;
        return (...a) => {
          clearTimeout(t);
          t = setTimeout(() => fn(...a), d);
        };
      };

  // ✅ Render 1 campaign <li>
  function formatCampaignHTML(c) {
    const thumb = c?.adsets?.[0]?.ads?.[0]?.thumbnail || "";
    const optGoal = c?.adsets?.[0]?.ads?.[0]?.optimization_goal;
    const iconClass = safeGetCampaignIcon(optGoal);
    const isActiveClass = c._isActive ? "active" : "";

    // escape name/id to avoid injection (basic)
    const safeName = String(c?.name ?? "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeId = String(c?.id ?? "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `
      <li data-id="${safeId}">
        <p>
          <img src="${thumb}" alt="${safeName}" />
          <span>
            <span>${safeName}</span>
            <span>ID:${safeId}</span>
          </span>
        </p>
        <p>
          <i class="${iconClass} ${isActiveClass}"></i>
          ${optGoal || "Unknown"}
        </p>
      </li>
    `;
  }

  // ✅ Render danh sách hoặc trả "No results"
  function renderFilteredCampaigns(list = []) {
    try {
      if (!Array.isArray(list) || list.length === 0) {
        filterList.innerHTML = `<li style="color:#999;padding:10px;text-align:center;">No results found</li>`;
        filterBox.classList.add("active");
        return;
      }

      filterList.innerHTML = list.map(formatCampaignHTML).join("");
      filterBox.classList.add("active");
    } catch (err) {
      console.error("[campaign-filter] renderFilteredCampaigns error:", err);
    }
  }

  // ✅ Lọc theo _ALL_CAMPAIGNS (safe)
  function filterCampaigns() {
    try {
      const keyword = filterInputC.value.trim().toLowerCase();

      if (!keyword) {
        filterList.innerHTML = "";
        filterBox.classList.remove("active");
        // call RESET only if applyCampaignFilter exists (we use safeApply)
        safeApplyCampaignFilter("RESET");
        return;
      }

      const all = Array.isArray(window._ALL_CAMPAIGNS)
        ? window._ALL_CAMPAIGNS
        : [];
      const filtered = all.filter((c) =>
        String(c?.name || "")
          .toLowerCase()
          .includes(keyword)
      );

      renderFilteredCampaigns(filtered);
    } catch (err) {
      console.error("[campaign-filter] filterCampaigns error:", err);
    }
  }

  // ✅ Debounced search (safe)
  const debouncedSearch = safeDebounce(filterCampaigns, 500);

  // --- Listeners ---
  filterInputC.addEventListener("input", (e) => {
    const keyword = e.target.value.trim();
    if (keyword === "") {
      // Immediate: clear autocomplete list (no API cost)
      filterList.innerHTML = "";
      filterBox.classList.remove("active");
    }
    // Debounced: filterCampaigns handles both RESET and keyword paths
    debouncedSearch();
  });

  if (filterBtn) {
    filterBtn.addEventListener("click", filterCampaigns);
  }

  filterInputC.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // prevent accidental form submit if inside a form
      e.preventDefault();
      filterCampaigns();
    }
  });

  // Click on list item => apply filter by the campaign's name (safe)
  filterList.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;

    const id = li.getAttribute("data-id");
    if (!id) return;

    // find campaign safely
    const all = Array.isArray(window._ALL_CAMPAIGNS)
      ? window._ALL_CAMPAIGNS
      : [];
    const campaign = all.find((c) => String(c?.id) === String(id));
    if (!campaign) {
      console.warn(
        "[campaign-filter] clicked campaign not found in _ALL_CAMPAIGNS:",
        id
      );
      return;
    }

    // UX: close list, set input, and apply filter by campaign name
    try {
      filterBox.classList.remove("active");
      filterList.innerHTML = "";
      filterInputC.value = campaign.name || "";
      safeApplyCampaignFilter(campaign.name || "");
    } catch (err) {
      console.error("[campaign-filter] error on campaign click:", err);
    }
  });

  // Optional: click outside to close
  document.addEventListener("click", (e) => {
    if (!filterBox.contains(e.target)) {
      filterBox.classList.remove("active");
    }
  });

  // Done
  console.debug("[campaign-filter] initialized safely");
})();

async function fetchAdPreview(adId) {
  try {
    if (!adId || !META_TOKEN) throw new Error("Missing adId or token");

    const url = `${BASE_URL}/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${META_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.data?.length) {
      console.warn("⚠️ No preview data found for this ad.");
      return null;
    }

    // 📋 Preview HTML (iframe)
    const html = data.data[0].body;

    const previewBox = document.getElementById("preview_box");
    if (previewBox) {
      previewBox.innerHTML = html; // Meta trả về HTML iframe tự render
    }

    return html;
  } catch (err) {
    console.error("❌ Error fetching ad preview:", err);
    return null;
  }
}

/**
 * ===================================================================
 * HÀM PHÂN TÍCH CHUYÊN SÂU (PHIÊN BẢN NÂNG CẤP)
 * Tập trung vào Phễu, Mâu thuẫn & Cơ hội, thay vì liệt kê Top 3.
 * ===================================================================
 */

/**
 * ===================================================================
 * HÀM PHÂN TÍCH CHUYÊN SÂU (PHIÊN BẢN NÂNG CẤP V2)
 * ===================================================================
 * - Giữ lại Top 3 Spend, Top 3 Result, Top 3 Best CPR.
 * - Loại bỏ hoàn toàn "Worst CPR" (CPR Kém nhất).
 * - Format giờ thành "2h - 3h".
 * - Nâng cấp Insights (Phễu, Creative, Hook, Mâu thuẫn)
 */
async function generateDeepReportDetailed({
  byDate = {},
  byHour = {},
  byAgeGender = {},
  byRegion = {},
  byPlatform = {},
  targeting = {},
  goal = VIEW_GOAL,
} = {}) {
  // -------------------------
  // Helpers (Sử dụng các hàm format toàn cục nếu có)
  // -------------------------
  const safeNumber = (v) =>
    typeof v === "number" && !Number.isNaN(v) ? v : +v || 0;

  const formatMoney = (n) => {
    if (typeof window !== "undefined" && window.formatMoney)
      return window.formatMoney(n);
    try {
      return n === 0
        ? "0đ"
        : n.toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        });
    } catch {
      return `${Math.round(n)}đ`;
    }
  };

  const formatNumber = (n) => {
    if (typeof window !== "undefined" && window.formatNumber)
      return window.formatNumber(n);
    if (n === null || typeof n === "undefined" || Number.isNaN(+n)) return 0;
    return Math.round(n);
  };

  const formatPercent = (n) => `${(safeNumber(n) * 100).toFixed(2)}%`;

  // Hàm getResultsSafe — hỗ trợ cả array actions (raw) và object actions (processBreakdown)
  const getResultsSafe = (dataSegment) => {
    if (!dataSegment) return 0;
    const actions = dataSegment.actions || {};
    const g = (goal || VIEW_GOAL || "").toUpperCase();

    // 1. Thử window.getResults trước (đã handle resultMapping chi tiết)
    if (window.getResults) {
      const r = safeNumber(window.getResults(dataSegment, goal || VIEW_GOAL));
      if (r > 0) return r;
    }

    // 2. Nếu getResults trả 0 → Meta breakdown không có action chính
    //    → Fallback thứ tự ưu tiên phổ biến trong breakdown data
    //    Xử lý cả 2 format: actions là object {...} hoặc array [{action_type, value}]
    const getAction = (key) => {
      if (Array.isArray(actions)) {
        const found = actions.find(a => a.action_type === key);
        return found ? safeNumber(found.value) : 0;
      }
      return safeNumber(actions[key] || 0);
    };

    // Goal-specific overrides
    if (g === "REACH") return safeNumber(dataSegment.reach || 0);
    if (g === "IMPRESSIONS") return safeNumber(dataSegment.impressions || 0);

    // Ordered fallback chain — từ chuyển đổi cao đến thấp nhất
    const fallbackChain = [
      "onsite_conversion.total_messaging_connection", // ← key mess trong region breakdown
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.lead_grouped",
      "offsite_conversion.fb_pixel_lead",
      "offsite_conversion.purchase",
      "landing_page_view",
      "onsite_conversion.post_save",
      "post_reaction",
      "comment",
      "link_click",
      "post_engagement",
    ];

    for (const k of fallbackChain) {
      const v = getAction(k);
      if (v > 0) return v;
    }

    // Last resort: lấy tổng tất cả action values (nếu có)
    if (!Array.isArray(actions)) {
      const total = Object.values(actions).reduce((s, v) => s + safeNumber(v), 0);
      if (total > 0) return total;
    }

    return 0;
  };


  const calculateCPR = (spend, result, VIEW_GOAL = "") => {
    spend = safeNumber(spend);
    result = safeNumber(result);
    if (spend <= 0 || result <= 0) return 0;
    const currentGoal = (VIEW_GOAL || goal || "").toUpperCase();
    if (currentGoal === "REACH" || currentGoal === "IMPRESSIONS")
      return (spend / result) * 1000;
    return spend / result;
  };

  const formatCPR = (cprValue, VIEW_GOAL = "") => {
    if (!cprValue || cprValue === 0) return "N/A";
    const formatted = formatMoney(Math.round(cprValue));
    const currentGoal = (VIEW_GOAL || goal || "").toUpperCase();
    return (currentGoal === "REACH" || currentGoal === "IMPRESSIONS")
      ? `${formatted} / 1000 ${currentGoal.toLowerCase()}`
      : formatted;
  };

  const topN = (arr, keyFn, n = 3, asc = false) => {
    const copy = (arr || []).slice();
    copy.sort((x, y) => {
      const vx = keyFn(x),
        vy = keyFn(y);
      return asc ? vx - vy : vy - vx;
    });
    return copy.slice(0, n);
  };

  // <<< THAY ĐỔI: Hàm format tên/key
  const formatKeyName = (key, type) => {
    if (!key) return "N/A";
    try {
      if (type === "hour") {
        const hour = parseInt((key || "0").split(":")[0], 10);
        if (isNaN(hour)) return key;
        return `${hour}h - ${hour + 1}h`; // Format 2h - 3h
      }
      if (type === "platform" || type === "age_gender") {
        return (key || "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch (e) {
      console.warn("Lỗi format key:", key, e);
      return key; // Trả về key gốc nếu lỗi
    }
    return key; // Default cho Region
  };

  const toArray = (obj) =>
    Object.entries(obj || {}).map(([k, v]) => ({ key: k, ...v }));

  // -------------------------
  // Tính toán Metrics Phễu (Funnel Metrics)
  // -------------------------

  const computeBreakdownMetrics = (keyedObj) => {
    const arr = toArray(keyedObj);
    return arr.map((item) => {
      const spend = safeNumber(item.spend);
      const impressions = safeNumber(item.impressions);
      const reach = safeNumber(item.reach);
      const result = getResultsSafe(item);
      const linkClicks = safeNumber(
        item.actions?.link_click || item.actions?.link_clicks || 0
      );
      return {
        key: item.key,
        spend,
        impressions,
        reach,
        result,
        linkClicks,
        cpr: calculateCPR(spend, result, goal),
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        ctr: impressions > 0 ? linkClicks / impressions : 0, // Tỷ lệ Click
        cvr_proxy: linkClicks > 0 ? result / linkClicks : 0, // Tỷ lệ Chuyển đổi từ Click
      };
    });
  };

  const byDateArr = computeBreakdownMetrics(byDate);
  const byAgeGenderArr = computeBreakdownMetrics(byAgeGender);
  const byRegionArr = computeBreakdownMetrics(byRegion);
  const byPlatformArr = computeBreakdownMetrics(byPlatform);
  const byHourArr = computeBreakdownMetrics(byHour);

  let totalSpend = 0,
    totalImpressions = 0,
    totalReach = 0,
    totalResults = 0,
    totalLinkClicks = 0,
    totalPostEngagement = 0;
  byDateArr.forEach((d) => {
    totalSpend += d.spend;
    totalImpressions += d.impressions;
    totalReach += d.reach;
    totalResults += d.result;
    totalLinkClicks += d.linkClicks;
    // Post engagement từ actions object
    totalPostEngagement += safeNumber(d.postEngagement);
  });

  // Bổ sung postEngagement vào computeBreakdownMetrics nếu chưa có
  // Tính tổng post_engagement từ byDate raw nếu byDateArr không có
  if (totalPostEngagement === 0 && byDate) {
    Object.values(byDate).forEach(d => {
      totalPostEngagement += safeNumber((d.actions || {}).post_engagement || 0);
    });
  }

  const overallCPR = calculateCPR(totalSpend, totalResults, goal);
  const overallCPM =
    totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const overallFreq = totalReach > 0 ? totalImpressions / totalReach : 0;
  const overallCTR =
    totalImpressions > 0 ? totalLinkClicks / totalImpressions : 0;
  const overallCVRProxy =
    totalLinkClicks > 0 ? totalResults / totalLinkClicks : 0;

  const summary = {
    goal: goal || "Not specified",
    totalSpend,
    totalImpressions,
    totalReach,
    totalResults,
    totalLinkClicks,
    totalPostEngagement,
    overallCPR,
    overallCPM,
    overallFreq,
    overallCTR,
    overallCVRProxy,
    formatted: {
      totalSpend: formatMoney(totalSpend),
      totalResults: formatNumber(totalResults),
      overallCPR: formatCPR(overallCPR, goal),
      overallCPM: formatMoney(Math.round(overallCPM)),
      overallFreq: overallFreq.toFixed(2),
      overallCTR: formatPercent(overallCTR),
      overallCVRProxy: formatPercent(overallCVRProxy),
    },
  };

  // -------------------------
  // TẠO INSIGHTS (Trọng tâm của chuyên gia)
  // -------------------------
  const recommendations = [];

  // 1. Phân tích Phễu (Funnel Analysis) - Nâng cấp theo yêu cầu
  (function analyzeFunnel() {
    const LOW_CTR_THRESHOLD = 0.005; // 0.5%
    const LOW_CVR_THRESHOLD = 0.02; // 2%

    if (totalResults === 0 && totalLinkClicks === 0 && totalImpressions > 0) {
      recommendations.push({
        area: "Creative & Hook",
        reason: `Quảng cáo đã chạy (CPM: ${summary.formatted.overallCPM}) nhưng có **CTR (Tỷ lệ click) cực thấp (${summary.formatted.overallCTR})**.`,
        action: `Đây là dấu hiệu **Creative (Hình ảnh/Video/Copy) không hiệu quả** hoặc **Targeting sai** hoàn toàn. Nội dung "hook" (điểm thu hút) 3 giây đầu tiên đã thất bại. Cần A/B test khẩn cấp creative mới, đặc biệt là hook.`,
      });
    } else if (totalResults === 0 && totalLinkClicks > 0) {
      recommendations.push({
        area: "Landing Page & Offer",
        reason: `Quảng cáo thu hút được người click (CTR: ${summary.formatted.overallCTR}) nhưng **không tạo ra BẤT KỲ kết quả nào (CVR: 0.00%)**.`,
        action: `Vấn đề nghiêm trọng nằm ở *sau khi click*. Kiểm tra ngay: 1. **Alignment**: Lời hứa trên quảng cáo có khớp với nội dung landing page không? 2. **Form Friction**: Form đăng ký có quá dài, khó hiểu, hoặc yêu cầu thông tin nhạy cảm không? 3. **Tốc độ tải trang** (Page Speed).`,
      });
    } else if (overallCTR < LOW_CTR_THRESHOLD) {
      recommendations.push({
        area: "Creative (CTR)",
        reason: `Tỷ lệ Click (CTR) đang ở mức rất thấp (${summary.formatted.overallCTR}).`,
        action: `Creative chưa đủ thu hút. Tập trung cải thiện **Hook** (3 giây đầu video / ảnh chính) và **CTA (Call-to-Action)**. Đảm bảo quảng cáo nổi bật trên newsfeed.`,
      });
    } else if (
      overallCVRProxy < LOW_CVR_THRESHOLD &&
      overallCTR >= LOW_CTR_THRESHOLD
    ) {
      recommendations.push({
        area: "Landing Page (CVR)",
        reason: `CTR ở mức chấp nhận được (${summary.formatted.overallCTR}) nhưng **Tỷ lệ Chuyển đổi (CVR) sau click rất thấp (${summary.formatted.overallCVRProxy})**.`,
        action: `Người dùng quan tâm (click) nhưng không chuyển đổi. Tối ưu **Landing Page**: 1. Tăng tốc độ tải trang. 2. Đảm bảo thông điệp khớp 100% với quảng cáo. 3. Đơn giản hóa Form đăng ký.`,
      });
    } else if (
      overallCTR >= LOW_CTR_THRESHOLD &&
      overallCVRProxy >= LOW_CVR_THRESHOLD
    ) {
      // <<< THAY ĐỔI: Thêm insight "TỐT"
      recommendations.push({
        area: "Funnel Performance",
        reason: `Phễu hoạt động tốt: CTR (${summary.formatted.overallCTR}) và CVR (${summary.formatted.overallCVRProxy}) đều ở mức chấp nhận được.`,
        action: `Tiếp tục theo dõi. Có thể bắt đầu test A/B các creative/offer mới để tìm điểm tối ưu hơn nữa (scale-up).`,
      });
    }
  })();

  // 2. Phân tích Tần suất (Frequency)
  (function analyzeFrequency() {
    if (overallFreq > 2.5) {
      recommendations.push({
        area: "Frequency (Mỏi quảng cáo)",
        reason: `Tần suất trung bình cao (${summary.formatted.overallFreq}). Khách hàng có thể đã thấy quảng cáo này quá nhiều.`,
        action: `Chuẩn bị làm mới creative (nội dung/hình ảnh) để tránh "mỏi quảng cáo". Xem xét loại trừ tệp những người đã tương tác/click nhưng không chuyển đổi.`,
      });
    }
  })();

  // 3. Phân tích Mâu thuẫn Ngân sách (Budget Mismatch)
  (function analyzeBudgetMismatch() {
    if (totalResults === 0) return;
    const topSpendSegment = topN(byAgeGenderArr, (x) => x.spend, 1)[0];
    const bestCprSegment = topN(
      byAgeGenderArr.filter((x) => x.cpr > 0),
      (x) => x.cpr,
      1,
      true
    )[0];

    if (
      topSpendSegment &&
      bestCprSegment &&
      topSpendSegment.key !== bestCprSegment.key
    ) {
      recommendations.push({
        area: "Budget Mismatch (Age/Gender)",
        reason: `Ngân sách đang tập trung nhiều nhất vào nhóm <b>${formatKeyName(
          topSpendSegment.key,
          "age_gender"
        )}</b> (CPR: ${formatCPR(topSpendSegment.cpr, goal)}).`,
        action: `Tuy nhiên, nhóm hiệu quả nhất (CPR rẻ nhất) lại là <b>${formatKeyName(
          bestCprSegment.key,
          "age_gender"
        )}</b> (CPR: ${formatCPR(
          bestCprSegment.cpr,
          goal
        )}). Cân nhắc *chuyển dịch ngân sách* từ nhóm kém hiệu quả sang nhóm hiệu quả nhất.`,
      });
    }
  })();

  // 4. Phân tích Cơ hội Bỏ lỡ (Untapped Opportunity)
  (function analyzeOpportunity() {
    if (totalResults === 0) return;
    const bestCprPlatforms = topN(
      byPlatformArr.filter((x) => x.cpr > 0),
      (x) => x.cpr,
      3,
      true
    );
    const lowSpendOpportunities = bestCprPlatforms.filter(
      (p) => p.spend < totalSpend * 0.1
    );

    if (lowSpendOpportunities.length > 0) {
      const opportunity = lowSpendOpportunities[0];
      recommendations.push({
        area: "Untapped Opportunity (Placement)",
        reason: `Vị trí <b>${formatKeyName(
          opportunity.key,
          "platform"
        )}</b> đang có CPR cực kỳ tốt (${formatCPR(
          opportunity.cpr,
          goal
        )}) nhưng mới chỉ tiêu ${formatMoney(opportunity.spend)}.`,
        action: `Đây là một "mỏ vàng" chưa khai thác. <b>Tạo chiến dịch riêng (CBO) hoặc nhóm quảng cáo riêng</b> chỉ nhắm vào vị trí này và tăng ngân sách cho nó để scale.`,
      });
    }
  })();

  // -------------------------
  // Tạo Sections Data (Giữ lại Best CPR)
  // -------------------------
  const N_TOP = 3; // Đã định nghĩa ở trên
  const sections = [];

  // 1) Timing (Hours)
  (function () {
    const arr = byHourArr;

    if (!arr.length)
      return sections.push({ title: "Timing (Hourly)", note: "No data" });
    const formatList = (list) =>
      list.map((item) => ({ ...item, key: formatKeyName(item.key, "hour") }));
    sections.push({
      title: "Timing (Hourly)",
      topSpend: formatList(topN(arr, (x) => x.spend, N_TOP)),
      topResult: formatList(topN(arr, (x) => x.result, N_TOP)),
      bestCpr: formatList(
        topN(
          arr.filter((x) => x.cpr > 0),
          (x) => x.cpr,
          N_TOP,
          true
        )
      ),
    });
  })();

  // 2) Age & Gender
  (function () {
    const arr = byAgeGenderArr;
    if (!arr.length)
      return sections.push({ title: "Age & Gender", note: "No data" });
    const formatList = (list) =>
      list.map((item) => ({
        ...item,
        key: formatKeyName(item.key, "age_gender"),
      }));
    sections.push({
      title: "Age & Gender",
      topSpend: formatList(topN(arr, (x) => x.spend, N_TOP)),
      topResult: formatList(topN(arr, (x) => x.result, N_TOP)), // <<< THÊM Top Result
      bestCpr: formatList(
        topN(
          arr.filter((x) => x.cpr > 0),
          (x) => x.cpr,
          N_TOP,
          true
        )
      ),
    });
  })();

  // 3) Region
  (function () {
    const arr = byRegionArr;
    if (!arr.length) return sections.push({ title: "Region", note: "No data" });
    sections.push({
      title: "Region",
      topSpend: topN(arr, (x) => x.spend, N_TOP),
      topResult: topN(arr, (x) => x.result, N_TOP), // <<< THÊM Top Result
      bestCpr: topN(
        arr.filter((x) => x.cpr > 0),
        (x) => x.cpr,
        N_TOP,
        true
      ),
    });
  })();

  // 4) Platform & Placement
  (function () {
    const arr = byPlatformArr;
    if (!arr.length)
      return sections.push({ title: "Platform & Placement", note: "No data" });
    const formatList = (list) =>
      list.map((item) => ({
        ...item,
        key: formatKeyName(item.key, "platform"),
      }));
    sections.push({
      title: "Platform & Placement",
      topSpend: formatList(topN(arr, (x) => x.spend, N_TOP)),
      topResult: formatList(topN(arr, (x) => x.result, N_TOP)), // <<< THÊM Top Result
      bestCpr: formatList(
        topN(
          arr.filter((x) => x.cpr > 0),
          (x) => x.cpr,
          N_TOP,
          true
        )
      ),
    });
  })();

  // 5) Device
  // (function () {
  //   const arr = byDeviceArr;
  //   if (!arr.length) return sections.push({ title: "Device", note: "No data" });
  //   sections.push({
  //     title: "Device",
  //     topSpend: topN(arr, (x) => x.spend, N_TOP),
  //     topResult: topN(arr, (x) => x.result, N_TOP), // <<< THÊM Top Result
  //     bestCpr: topN(
  //       arr.filter((x) => x.cpr > 0),
  //       (x) => x.cpr,
  //       N_TOP,
  //       true
  //     ),
  //   });
  // })();

  // 6) Creative (Section rỗng, chỉ có insight)
  sections.push({
    title: "Creative & Frequency",
    note: "Phân tích đã được gộp trong phần Đề xuất.",
  });

  // -------------------------
  // Trả về Report Object (ĐÃ CẬP NHẬT)
  // -------------------------
  const reportObject = {
    generatedAt: new Date().toISOString(),
    summary,
    recommendations, // Chỉ trả về insight
    sections, // <<< THAY ĐỔI: Trả về sections (chứa Top 3)
  };

  // Log ra console (Đã cập nhật)
  console.table([
    {
      Spend: summary.formatted.totalSpend,
      Results: summary.formatted.totalResults,
      CPR: summary.formatted.overallCPR,
      CPM: summary.formatted.overallCPM,
      CTR: summary.formatted.overallCTR,
      CVR_Click: summary.formatted.overallCVRProxy,
      Freq: summary.formatted.overallFreq,
    },
  ]);

  sections.forEach((sec) => {
    console.groupCollapsed(`🔹 ${sec.title}`);
    if (sec.note) {
    } else {
      if (sec.topSpend) {
        console.table(
          sec.topSpend.map((s) => ({
            Key: s.key,
            Spend: formatMoney(s.spend),
            Results: s.result,
            CPR: formatCPR(s.cpr, goal),
          }))
        );
      }
      if (sec.topResult) {
        console.table(
          sec.topResult.map((s) => ({
            Key: s.key,
            Spend: formatMoney(s.spend),
            Results: s.result,
            CPR: formatCPR(s.cpr, goal),
          }))
        );
      }
      if (sec.bestCpr) {
        console.table(
          sec.bestCpr.map((s) => ({
            Key: s.key,
            Spend: formatMoney(s.spend),
            Results: s.result,
            CPR: formatCPR(s.cpr, goal),
          }))
        );
      }
      // Đã bỏ worstCpr
    }
    console.groupEnd();
  });

  console.group("✅ Recommendations");
  if (recommendations.length === 0) {
  } else {
    recommendations.forEach((r, idx) => {
    });
  }
  console.groupEnd();
  console.groupEnd();

  return reportObject;
}

async function runDeepReport() {
  const report = await generateDeepReportDetailed({
    meta: window.campaignSummaryData,
    byDate: window.dataByDate,
    byHour: window.processedByHour,
    byAgeGender: window.processedByAgeGender,
    byRegion: window.processedByRegion,
    byPlatform: window.processedByPlatform,
    byDevice: window.processedByDevice,
    targeting: window.targetingData,
    goal: VIEW_GOAL,
  });
  renderAdReportWithVibe(report);
}
/**
 * ===================================================================
 * HÀM RENDER CHÍNH
 * Render dữ liệu JSON báo cáo quảng cáo theo "vibe" của VTCI.
 * ===================================================================
 */

// Đảm bảo bạn đã có 2 hàm này ở đâu đó
// const formatMoney = (v) => v != null && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") + "đ" : "0đ";
// const formatNumber = (v) => v != null && !isNaN(v) ? Math.round(v).toLocaleString("vi-VN") : "0";

/**
 * Render báo cáo vào UI.
 * @param {object} rawReportData - Đối tượng JSON thô bạn đã cung cấp.
 */
/**
 * ===================================================================
 * HÀM RENDER UI (PHIÊN BẢN NÂNG CẤP V2)
 * ===================================================================
 */

/**
 * Render báo cáo vào UI.
 * @param {object} report - Đối tượng report đã được generate.
 */
function renderAdReportWithVibe(report) {
  const container = document.querySelector(".dom_ai_report_content");
  if (!container) {
    console.error("Không tìm thấy container .dom_ai_report_content");
    return;
  }

  const adNameEl = document.querySelector(".dom_detail_id > span:first-child");
  const adName = adNameEl ? adNameEl.textContent.trim() : "Quảng cáo";

  const { summary, recommendations, sections, generatedAt } = report;

  const html = [];
  let delay = 1;

  // --- Bắt đầu khối báo cáo ---
  html.push('<div class="ai_report_block ads">');
  html.push(
    `<h4><i class="fa-solid fa-magnifying-glass-chart"></i> Phân tích: ${adName}</h4>`
  );
  html.push('<div class="ai_report_inner"><section class="ai_section">');

  // --- 1. Phần Tóm tắt Phễu (Funnel KPI Grid) ---
  html.push(createKpiGrid(summary, delay));
  delay += 2;

  // --- 2. Phần Insights & Đề xuất ---
  html.push(createInsightList(recommendations, delay));
  delay += 2;

  // --- 3. Phần Breakdown (Sections) ---
  if (sections) {
    for (const section of sections) {
      // Bỏ qua section "Creative" vì nó chỉ có insight (đã hiển thị ở trên)
      if (section.title.includes("Creative")) {
        continue;
      }

      let type = "default";
      if (section.title.includes("Timing")) type = "hour";
      else if (section.title.includes("Age & Gender")) type = "age";
      else if (section.title.includes("Region")) type = "region";
      else if (section.title.includes("Platform")) type = "platform";
      else if (section.title.includes("Device")) type = "device";

      // <<< THAY ĐỔI: Gọi hàm render breakdown MỚI
      html.push(createBreakdownSection(section, type, delay));
      delay += 4; // Tăng delay cho mỗi section
    }
  }

  // --- Kết thúc khối báo cáo ---
  html.push("</section></div>");
  html.push(
    `<small class="timestamp">Generated: ${new Date(generatedAt).toLocaleString(
      "vi-VN"
    )}</small>`
  );
  html.push("</div>");

  container.innerHTML = html.join("");

  // Kích hoạt animation
  setTimeout(() => {
    container
      .querySelectorAll(".fade_in_item")
      .forEach((el, i) => setTimeout(() => el.classList.add("show"), i * 200));
  }, 3000);
}

/**
 * Tạo lưới KPI tóm tắt (Đã cập nhật)
 */

/**
 * Tạo danh sách Insights/Đề xuất.
 */
function createInsightList(recommendations, delayStart = 1) {
  let listItems =
    '<li><i class="fa-solid fa-check-circle" style="color:#28a745;"></i> <strong>[TỔNG QUAN]</strong> Hiệu suất ổn định, chưa phát hiện vấn đề nghiêm trọng.</li>';

  if (recommendations && recommendations.length > 0) {
    listItems = recommendations
      .map((rec) => {
        let icon = "fa-solid fa-lightbulb";
        let color = "#ffc107"; // Vàng
        if (
          rec.area.includes("Mismatch") ||
          rec.reason.includes("thấp") ||
          rec.reason.includes("cao") ||
          rec.area.includes("Creative")
        ) {
          icon = "fa-solid fa-triangle-exclamation";
          color = "#e17055"; // Đỏ cam
        } else if (
          rec.area.includes("Opportunity") ||
          rec.reason.includes("tốt nhất")
        ) {
          icon = "fa-solid fa-wand-magic-sparkles";
          color = "#007bff"; // Xanh dương
        } else if (rec.area.includes("Funnel Performance")) {
          icon = "fa-solid fa-check-circle";
          color = "#28a745"; // Xanh lá
        }

        return `<li><i class="${icon}" style="color:${color};"></i> <strong>[${rec.area
          }]</strong> ${rec.reason
          }<br><span class="recommendation-action">→ Đề xuất: ${rec.action || ""
          }</span></li>`;
      })
      .join("");
  }

  return `
        <h5 class="fade_in_item delay-${delayStart}"><i class="fa-solid fa-user-check"></i> Đề xuất từ Chuyên gia</h5>
        <ul class="insight_list fade_in_item delay-${delayStart + 1}">
            ${listItems}
        </ul>
    `;
}

/**
 * <<< THAY ĐỔI: Hàm tạo section breakdown MỚI
 * Tạo một section breakdown đầy đủ (Tiêu đề + 3 bảng).
 */
function createBreakdownSection(section, type, delayStart = 1) {
  if (!section || section.note === "No data") {
    return ""; // Bỏ qua nếu section không có data
  }

  const icon = getIconForType(type);
  const hasResults =
    (section.topResult && section.topResult.length > 0) ||
    (section.bestCpr && section.bestCpr.length > 0);

  return `
        <h5 class="fade_in_item delay-${delayStart}"><i class="${icon}"></i> Phân tích ${section.title
    }</h5>
        
        <div class="fade_in_item delay-${delayStart + 1}">
            <h6>Top 3 Chi tiêu (Spend)</h6>
            ${createBreakdownTable(section.topSpend, type)}
        </div>
        
        ${hasResults
      ? `
            <div class="fade_in_item delay-${delayStart + 2}">
                <h6>Top 3 Kết quả (Result)</h6>
                ${createBreakdownTable(section.topResult, type)}
            </div>
            
            <div class="fade_in_item delay-${delayStart + 3}">
                <h6>Top 3 CPR Tốt nhất (Best CPR)</h6>
                ${createBreakdownTable(section.bestCpr, type)}
            </div>
        `
      : `
            <div class="fade_in_item delay-${delayStart + 2}">
                <p class="no-result-note"><i class="fa-solid fa-info-circle"></i> Không có dữ liệu Kết quả (Result) để phân tích CPR cho mục này.</p>
            </div>
        `
    }
    `;
}

/**
 * Tạo HTML cho một bảng 'mini_table'.
 */
function createBreakdownTable(dataArray, type) {
  if (!dataArray || dataArray.length === 0)
    return '<p class="no-result-note" style="margin-left: 0;">Không có dữ liệu.</p>';

  // Dùng hàm formatMoney và formatNumber (đảm bảo chúng tồn tại)
  const formatMoneySafe = (n) =>
    window.formatMoney ? window.formatMoney(n) : `${Math.round(n || 0)}đ`;
  const formatNumberSafe = (n) =>
    window.formatNumber ? window.formatNumber(n) : Math.round(n || 0);
  const formatCPRSafe = (n, goal) =>
    window.formatCPR
      ? window.formatCPR(n, goal)
      : n > 0
        ? formatMoneySafe(n)
        : "N/A";

  const rows = dataArray
    .map(
      (item) => `
        <tr>
            <td>${item.key}</td> <td>${formatMoneySafe(item.spend)}</td>
            <td>${formatNumberSafe(item.result)}</td>
            <td>${formatCPRSafe(item.cpr, item.goal)}</td>
            <td>${formatMoneySafe(item.cpm)}</td>
        </tr>
    `
    )
    .join("");

  return `
        <table class="mini_table">
            <thead>
                <tr>
                    <th>Phân khúc</th>
                    <th>Chi phí</th>
                    <th>Kết quả</th>
                    <th>CPR</th>
                    <th>CPM</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Helper lấy icon Font Awesome dựa trên loại breakdown.
 */
function getIconForType(type) {
  switch (type) {
    case "hour":
      return "fa-solid fa-clock";
    case "age":
      return "fa-solid fa-users";
    case "region":
      return "fa-solid fa-map-location-dot";
    case "platform":
      return "fa-solid fa-laptop-device";
    case "device":
      return "fa-solid fa-mobile-screen-button";
    default:
      return "fa-solid fa-chart-bar";
  }
}

/**
 * Tạo lưới KPI tóm tắt (Đã cập nhật
 */
function createKpiGrid(summary, delayStart = 1) {
  if (!summary || !summary.formatted) return "";
  const { formatted, goal } = summary;

  return `
    <h5 class="fade_in_item delay-${delayStart}"><i class="fa-solid fa-chart-pie"></i> Tóm tắt Phễu Hiệu suất</h5>
    <div class="ai_kpi_grid fade_in_item delay-${delayStart + 1}">
        <div class="kpi_item">
            <span>Tổng chi phí</span>
            <b>${formatted.totalSpend || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>Tổng kết quả</span>
            <b>${formatted.totalResults || "N/A"} (${goal || "N/A"})</b>
        </div>
        <div class="kpi_item">
            <span>CPR (Chi phí/Kết quả)</span>
            <b>${formatted.overallCPR || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>CPM (Chi phí/1000 Lượt xem)</span>
            <b>${formatted.overallCPM || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>CTR (Tỷ lệ Click)</span>
            <b class="${summary.overallCTR < 0.005 ? "metric-bad" : "metric-good"
    }">${formatted.overallCTR || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>CVR (Click → Kết quả)</span>
             <b class="${summary.overallCVRProxy < 0.02 ? "metric-bad" : "metric-good"
    }">${formatted.overallCVRProxy || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>Tiếp cận (Reach)</span>
            <b>${summary.totalReach ? summary.totalReach.toLocaleString('vi-VN') : "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>Tần suất (Freq)</span>
            <b>${formatted.overallFreq || "N/A"}</b>
        </div>
        <div class="kpi_item">
            <span>Post Engagement</span>
            <b>${summary.totalPostEngagement ? summary.totalPostEngagement.toLocaleString('vi-VN') : "N/A"}</b>
        </div>
    </div>
  `;
}

/**
 * Tạo danh sách Insights/Đề xuất.
 */
function createInsightList(recommendations, delayStart = 1) {
  let listItems =
    '<li><i class="fa-solid fa-check-circle" style="color:#28a745;"></i> <strong>[TỔNG QUAN]</strong> Hiệu suất ổn định, chưa phát hiện vấn đề nghiêm trọng.</li>';

  if (recommendations && recommendations.length > 0) {
    listItems = recommendations
      .map((rec) => {
        // Xác định icon và màu
        let icon = "fa-solid fa-lightbulb"; // Insight (Vàng)
        let color = "#ffc107";
        if (
          rec.area.includes("Mismatch") ||
          rec.reason.includes("thấp") ||
          rec.reason.includes("cao")
        ) {
          icon = "fa-solid fa-triangle-exclamation"; // Vấn đề (Đỏ cam)
          color = "#e17055";
        } else if (
          rec.area.includes("Opportunity") ||
          rec.reason.includes("tốt nhất")
        ) {
          icon = "fa-solid fa-wand-magic-sparkles"; // Cơ hội (Xanh dương)
          color = "#007bff";
        }

        return `<li><i class="${icon}" style="color:${color};"></i> <strong>[${rec.area
          }]</strong> ${rec.reason
          }<br><span class="recommendation-action">→ Đề xuất: ${rec.action || ""
          }</span></li>`;
      })
      .join("");
  }

  return `
    <h5 class="fade_in_item delay-${delayStart}"><i class="fa-solid fa-user-check"></i> Đề xuất từ Chuyên gia</h5>
    <ul class="insight_list fade_in_item delay-${delayStart + 1}">
        ${listItems}
    </ul>
  `;
}
/**
 * ===================================================================
 * CÁC HÀM HELPER CHO VIỆC RENDER
 * ===================================================================
 */

/**
 * Tạo lưới KPI tóm tắt.
 * @param {object} summary - Object summary từ JSON.
 * @param {number} delayStart - Số delay bắt đầu cho animation.
 */

/**
 * Tạo danh sách Insights/Đề xuất.
 * @param {Array} recommendations - Mảng recommendations từ JSON.
 * @param {number} delayStart - Số delay bắt đầu cho animation.
 */
function createInsightList(recommendations, delayStart = 1) {
  let listItems = "<li>Không có đề xuất nổi bật.</li>"; // Mặc định

  if (recommendations && recommendations.length > 0) {
    listItems = recommendations
      .map((rec) => {
        // Xác định icon và màu dựa trên reason/area
        let icon = "fa-solid fa-lightbulb";
        let color = "#007bff"; // Màu xanh dương mặc định
        if (rec.reason.includes("thấp")) {
          icon = "fa-solid fa-triangle-exclamation";
          color = "#e17055"; // Màu đỏ cam
        }

        return `<li><i class="${icon}" style="color:${color}"></i> <b>[${rec.area
          }]</b> ${rec.reason} ${rec.action || ""}</li>`;
      })
      .join("");
  }

  return `
      <h5 class="fade_in_item delay-${delayStart}"><i class="fa-solid fa-lightbulb"></i> Insights & Đề xuất</h5>
      <ul class="insight_list fade_in_item delay-${delayStart + 1}">
          ${listItems}
      </ul>
  `;
}

function createBreakdownSection(section, type, delayStart = 1) {
  if (!section || section.note === "No data") {
    return ""; // Bỏ qua nếu section không có data
  }

  const icon = getIconForType(type); // Lấy icon dựa trên loại

  // Dữ liệu JSON có result=0 và cpr=0 ở mọi nơi.
  // Nếu không có kết quả, bảng 'Best CPR' và 'Worst CPR' sẽ giống hệt nhau
  // và không có ý nghĩa. Chúng ta sẽ chỉ hiển thị 'Top Spend' trong trường hợp này.
  const hasResults = parseFloat(section.topSpend[0]?.result || 0) > 0; // Kiểm tra xem có kết quả nào không

  return `
      <h5 class="fade_in_item delay-${delayStart}"><i class="${icon}"></i> Phân tích ${section.title
    }</h5>
      
      <div class="fade_in_item delay-${delayStart + 1}">
          <h6>Top chi tiêu (Spend)</h6>
          ${createBreakdownTable(section.topSpend, type)}
      </div>
      
      ${hasResults
      ? `
          <div class="fade_in_item delay-${delayStart + 2}">
              <h6>Top CPR Tốt nhất (Best CPR)</h6>
              ${createBreakdownTable(section.bestCpr, type)}
          </div>
         
      `
      : `
          <div class="fade_in_item delay-${delayStart + 2}">
              <p class="no-result-note"><i class="fa-solid fa-info-circle"></i> Không có dữ liệu Kết quả (Result) để phân tích CPR cho mục này.</p>
          </div>
      `
    }
  `;
}

/**
 * Tạo HTML cho một bảng 'mini_table'.
 * @param {Array} dataArray - Mảng dữ liệu (ví dụ: section.topSpend).
 * @param {string} type - 'hour', 'age', 'region', 'platform'.
 */
function createBreakdownTable(dataArray, type) {
  if (!dataArray || dataArray.length === 0) return "<p>Không có dữ liệu.</p>";

  const rows = dataArray
    .map(
      (item) => `
      <tr>
          <td>${formatKeyName(item.key, type)}</td>
          <td>${formatMoney(item.spend)}</td>
          <td>${formatNumber(item.result)}</td>
          <td>${item.cpr === 0 ? "N/A" : formatMoney(item.cpr)}</td>
          <td>${formatMoney(item.cpm)}</td>
      </tr>
  `
    )
    .join("");

  return `
      <table class="mini_table">
          <thead>
              <tr>
                  <th>Phân khúc</th>
                  <th>Chi phí</th>
                  <th>Kết quả</th>
                  <th>CPR</th>
                  <th>CPM</th>
              </tr>
          </thead>
          <tbody>
              ${rows}
          </tbody>
      </table>
  `;
}

/**
 * Helper lấy icon Font Awesome dựa trên loại breakdown.
 */
function getIconForType(type) {
  switch (type) {
    case "hour":
      return "fa-solid fa-clock";
    case "age":
      return "fa-solid fa-users";
    case "region":
      return "fa-solid fa-map-location-dot";
    case "platform":
      return "fa-solid fa-laptop-device";
    default:
      return "fa-solid fa-chart-bar";
  }
}

/**
 * Helper làm đẹp tên (key) của breakdown.
 */
function formatKeyName(key, type) {
  if (!key) return "N/A";
  return key
    .replace(/_/g, " ")
    .replace(
      /\b(facebook|instagram)\b/gi,
      (match) => match.charAt(0).toUpperCase() + match.slice(1)
    ) // Viết hoa Facebook, Instagram
    .replace("unknown", "Không xác định");
}

