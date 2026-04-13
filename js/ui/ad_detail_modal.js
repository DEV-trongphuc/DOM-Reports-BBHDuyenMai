async function handleViewClick(e, type = "ad") {
  e.stopPropagation();
  const el = e.target.closest(".ad_item"); // Sử dụng closest để tìm phần tử cha .ad_item
  if (!el) {
    console.error("Không tìm thấy phần tử .ad_item");
    return;
  }

  // Lấy phần tử .ad_view từ trong el (ad_item)
  const adViewEl = el.querySelector(".ad_view"); // Tìm .ad_view bên trong .ad_item

  if (!adViewEl) {
    console.error("Không tìm thấy phần tử .ad_view bên trong .ad_item");
    return;
  }

  // Lấy ID từ dataset của .ad_view
  const id = type === "adset" ? adViewEl.dataset.adsetId : adViewEl.dataset.adId;
  if (!id) return;

  // ⭐ Lấy data từ bộ nhớ để hiển thị tức thì
  let itemObj = null;
  if (window._ALL_CAMPAIGNS) {
    for (const c of window._ALL_CAMPAIGNS) {
      if (type === "adset") {
        itemObj = (c.adsets || []).find(as => as.id === id);
      } else {
        for (const as of (c.adsets || [])) {
          itemObj = (as.ads || []).find(ad => ad.id === id);
          if (itemObj) break;
        }
      }
      if (itemObj) break;
    }
  }

  const spend = itemObj ? itemObj.spend : parseFloat(adViewEl.dataset.spend || 0);
  const reach = itemObj ? itemObj.reach : parseFloat(adViewEl.dataset.reach || 0);
  const impressions = itemObj ? itemObj.impressions : parseFloat(adViewEl.dataset.impressions || 0);
  const goal = itemObj ? itemObj.optimization_goal : (adViewEl.dataset.goal || "");
  const name = itemObj ? (itemObj.name || itemObj.ad_name) : (adViewEl.dataset.name || "");
  const result = itemObj ? itemObj.result : parseFloat(adViewEl.dataset.result || 0);
  const cpr = itemObj ? getMetricValue(itemObj, "cpr") : parseFloat(adViewEl.dataset.cpr || 0);

  // ✅ Luôn reset funnel khi mở ad mới (kể cả khi không có cache)
  window._videoFunnelLoaded = false;
  window._videoFunnelHasData = false;
  const _fBtn = document.getElementById("video_funnel_toggle_btn");
  if (_fBtn) _fBtn.style.display = "none";
  const _fPanel = document.getElementById("video_funnel_panel");
  if (_fPanel) _fPanel.classList.remove("active");

  // ✅ Reset lastFullActionsData để tránh hiển thị data cũ của ad trước
  // khi mở ad mới — detail_full_actions_list sẽ bị clear ngay lập tức
  lastFullActionsData = null;
  const _actionsListEl = document.getElementById("detail_full_actions_list");
  if (_actionsListEl) _actionsListEl.innerHTML = "";

  // Hiển thị ngay Actions Detail từ bộ nhớ + init Video Funnel
  // Chỉ render nếu itemObj có actions đầy đủ (không phải skeleton data)
  if (itemObj) {
    renderFullActionsDetail(itemObj);
    renderVideoFunnel(itemObj);
  }

  const thumb = adViewEl.dataset.thumb || "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
  const postUrl = adViewEl.dataset.post || "#";

  // --- Cập nhật quick stats ---
  const goalEl = document.querySelector("#detail_goal span");
  const resultEl = document.querySelector("#detail_result span");
  const spendEl = document.querySelector("#detail_spent span");
  const cprEl = document.querySelector("#detail_cpr span");

  if (goalEl) goalEl.textContent = goal;
  if (spendEl) spendEl.textContent = formatMoney(spend);
  if (resultEl) resultEl.textContent = formatNumber(result);

  // CẬP NHẬT NHÃN CPR LINH HOẠT (Phải bao gồm icon để không bị mất)
  const cprLi = document.querySelector("#detail_cpr").closest("li");
  const cprLabelWrapper = cprLi ? cprLi.querySelector("span") : null;

  if (cprLabelWrapper) {
    let rawLabel = "Cost per Result";
    if (goal === "REACH") rawLabel = "Cosper 1,000 Reach";
    else if (goal === "IMPRESSIONS") rawLabel = "Cosper 1,000 Impress";
    cprLabelWrapper.innerHTML = `<i class="fa-solid fa-bullseye"></i> ${rawLabel}`;
  }

  // Tính CPR nếu dataset trả về 0 nhưng có result
  let finalCpr = cpr;
  if (result > 0 && (finalCpr === 0 || isNaN(finalCpr))) {
    finalCpr = (goal === "REACH" || goal === "IMPRESSIONS") ? (spend / result) * 1000 : spend / result;
  }
  if (cprEl) cprEl.textContent = result > 0 ? formatMoney(finalCpr) : "-";

  // --- Gán VIEW_GOAL toàn cục ---
  VIEW_GOAL = goal;
  const freqWrap = document.querySelector(".dom_frequency");
  if (freqWrap && reach > 0) {
    const frequency = impressions / reach;
    const percent = Math.min((frequency / 4) * 100, 100);
    const donut = freqWrap.querySelector(".semi-donut");
    if (donut) donut.style.setProperty("--percentage", percent.toFixed(1));
    const freqNum = freqWrap.querySelector(".frequency_number");
    if (freqNum)
      freqNum.querySelector("span:nth-child(1)").textContent = frequency.toFixed(1);
    const impLabel = freqWrap.querySelector(".dom_frequency_label_impression");
    const reachLabel = freqWrap.querySelector(".dom_frequency_label_reach");
    if (impLabel) impLabel.textContent = impressions.toLocaleString("vi-VN");
    if (reachLabel) reachLabel.textContent = reach.toLocaleString("vi-VN");
  }

  // --- Hiển thị panel chi tiết ---
  const domDetail = document.querySelector("#dom_detail");
  if (domDetail) {
    domDetail.classList.add("active");
    // Đảm bảo preview_box và preview_button hiện lại khi xem Ad (không phải Adset)
    const previewBox = domDetail.querySelector("#preview_box");
    const previewBtn = domDetail.querySelector("#preview_button");
    if (previewBox) previewBox.style.display = "";
    if (previewBtn) previewBtn.style.display = "";

    const idEl = domDetail.querySelector(".dom_detail_id");
    const headerThumbWrap = domDetail.querySelector(".dom_detail_header_first > div");

    // Đảm bảo không hiện fan cards của Adset cũ
    if (headerThumbWrap) {
      const existFan = headerThumbWrap.querySelector(".detail_fan_wrap");
      if (existFan) {
        existFan.innerHTML = "";
        existFan.style.display = "none";
      }
      const imgEl = headerThumbWrap.querySelector("img:not(.cmp_fan_img)");
      if (imgEl) {
        imgEl.style.display = "";
        imgEl.src = thumb;
      }
    }
    if (idEl) idEl.innerHTML = `<span>${name}</span> <span> ID: ${id}</span>`;
  }

  // --- Loading overlay ---
  const loadingEl = document.querySelector(".loading");
  if (loadingEl) loadingEl.classList.add("active");

  try {
    if (type === "ad") {
      await showAdDetail(id);
    } else {
    }
  } catch (err) {
    console.error("❌ Lỗi khi load chi tiết:", err);
  } finally {
    if (loadingEl) loadingEl.classList.remove("active");
  }
}

// (Tất cả các hàm fetchAdset... (ByHour, ByAgeGender,...) giữ nguyên)
async function fetchAdsetTargeting(ad_id) {
  try {
    if (!ad_id) throw new Error("adset_id is required");
    const url = `${BASE_URL}/${ad_id}?fields=targeting&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    return data.targeting || {};
  } catch (err) {
    console.error(`Error fetching targeting for ad ${ad_id}:`, err);
    return {};
  }
}

async function fetchAdsetActionsByHour(ad_id) {
  try {
    if (!ad_id) throw new Error("ad_id is required");
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byHour = {};

    results.forEach((item) => {
      const hour =
        item.hourly_stats_aggregated_by_advertiser_time_zone || "unknown";
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byHour[hour]) {
        byHour[hour] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      }
      byHour[hour].spend += spend;
      byHour[hour].impressions += impressions;
      byHour[hour].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byHour[hour].actions[type] =
            (byHour[hour].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byHour;
  } catch (err) {
    console.error("❌ Error fetching hourly breakdown for ad_id", ad_id, err);
    return null;
  }
}

async function fetchAdsetActionsByAgeGender(ad_id) {
  try {
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=age,gender&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byAgeGender = {};

    results.forEach((item) => {
      const key = `${item.age || "?"}_${item.gender || "?"}`;
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byAgeGender[key])
        byAgeGender[key] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      byAgeGender[key].spend += spend;
      byAgeGender[key].impressions += impressions;
      byAgeGender[key].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byAgeGender[key].actions[type] =
            (byAgeGender[key].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byAgeGender;
  } catch (err) {
    console.error("❌ Error fetching breakdown age+gender:", err);
    return null;
  }
}
async function fetchAdsetActionsByRegion(ad_id) {
  try {
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=region&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byRegion = {};

    results.forEach((item) => {
      const region = item.region || "unknown";
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byRegion[region])
        byRegion[region] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      byRegion[region].spend += spend;
      byRegion[region].impressions += impressions;
      byRegion[region].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byRegion[region].actions[type] =
            (byRegion[region].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byRegion;
  } catch (err) {
    console.error("❌ Error fetching breakdown region:", err);
    return null;
  }
}
async function fetchAdsetActionsByPlatformPosition(ad_id) {
  try {
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=publisher_platform,platform_position&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byPlatform = {};

    results.forEach((item) => {
      const key = `${item.publisher_platform}_${item.platform_position}`;
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byPlatform[key])
        byPlatform[key] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      byPlatform[key].spend += spend;
      byPlatform[key].impressions += impressions;
      byPlatform[key].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byPlatform[key].actions[type] =
            (byPlatform[key].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byPlatform;
  } catch (err) {
    console.error("❌ Error fetching breakdown platform_position:", err);
    return null;
  }
}
async function fetchAdsetActionsByDevice(ad_id) {
  try {
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=impression_device&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byDevice = {};
    results.forEach((item) => {
      const device = item.impression_device || "unknown";
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byDevice[device])
        byDevice[device] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      byDevice[device].spend += spend;
      byDevice[device].impressions += impressions;
      byDevice[device].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byDevice[device].actions[type] =
            (byDevice[device].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byDevice;
  } catch (err) {
    console.error("❌ Error fetching breakdown device:", err);
    return null;
  }
}

async function fetchAdDailyInsights(ad_id) {
  try {
    if (!ad_id) throw new Error("ad_id is required");
    const url = `${BASE_URL}/${ad_id}/insights?fields=spend,impressions,reach,actions&time_increment=1&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const results = data.data || [];
    const byDate = {};

    results.forEach((item) => {
      const date = item.date_start;
      const spend = parseFloat(item.spend || 0);
      const impressions = parseInt(item.impressions || 0);
      const reach = parseInt(item.reach || 0);
      if (!byDate[date]) {
        byDate[date] = { spend: 0, impressions: 0, reach: 0, actions: {} };
      }
      byDate[date].spend += spend;
      byDate[date].impressions += impressions;
      byDate[date].reach += reach;
      if (item.actions) {
        item.actions.forEach((a) => {
          const type = a.action_type;
          byDate[date].actions[type] =
            (byDate[date].actions[type] || 0) + parseInt(a.value);
        });
      }
    });
    return byDate;
  } catch (err) {
    console.error("❌ Error fetching daily breakdown for ad", ad_id, err);
    return null;
  }
}

// ===================== HIỂN THỊ CHI TIẾT AD =====================
// ===================== HIỂN THỊ CHI TIẾT AD (ĐÃ SỬA ĐỔI) =====================
async function showAdDetail(ad_id) {
  if (!ad_id) return;

  const detailBox = document.querySelector(".dom_detail");
  if (!detailBox) return;

  // Show skeleton immediately — prevents stale data from previous ad showing during load
  toggleSkeletons("#dom_detail", true);

  // 1️⃣  Destroy ALL chart instances TRƯỚC khi clear container innerHTML
  //     Clear trước → canvas detach khỏi DOM → Chart.js leak → lần 2 donut/chart không render
  [
    window.detail_spent_chart_instance,
    window.chartByHourInstance,
    window.chart_by_age_gender_instance,
    window.chart_by_region_instance,
    window.chart_by_device_instance,
  ].forEach((chart) => {
    if (chart && typeof chart.destroy === "function") {
      try { chart.destroy(); } catch (e) { }
    }
  });
  window.detail_spent_chart_instance  = null;
  window.chartByHourInstance          = null;
  window.chart_by_age_gender_instance = null;
  window.chart_by_region_instance     = null;
  window.chart_by_device_instance     = null;

  // 2️⃣  Clear stale container HTML (SAU KHI chart đã destroy)
  //     Lưu ý: #chart_by_device KHOONG có trong list này
  //     vì renderChartByDevice vẽ trực tiếp lên canvas gốc + tự cleanup list cũ
  const staleContainers = [
    "#detail_interaction_chart",
    "#chart_by_hour",
    "#chart_by_age_gender",
    "#chart_by_region",
    "#chart_by_platform .dom_toplist",  // Chỉ clear list, giữ nguyên wrapper
    "#detail_actions_wrap",
  ];
  staleContainers.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = "";
    else console.warn('[stale] not found:', sel);
  });

  try {
    // Show spinner trong preview box trong khi chờ
    const previewBox = document.getElementById("preview_box");
    if (previewBox) previewBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.4;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;"></i></div>`;

    // Preview load ngầm hoàn toàn — KHÔNG await, không block batch chính
    fetchAdPreviewAsync(ad_id, previewBox);

    // Batch 7 requests data chính
    const results = await fetchAdDetailBatch(ad_id);

    // Bóc tách kết quả từ object 'results'
    const {
      targeting,
      byHour,
      byAgeGender,
      byRegion,
      byPlatform,
      byDevice,
      byDate,
    } = results;

    // ================== Render Targeting ==================
    renderTargetingToDOM(targeting);

    const processedByDate = {};
    (byDate || []).forEach((item) => {
      const date = item.date_start;
      if (date) {
        processedByDate[date] = {
          spend: parseFloat(item.spend || 0),
          impressions: parseInt(item.impressions || 0),
          reach: parseInt(item.reach || 0),
          actions: item.actions
            ? Object.fromEntries(
              item.actions.map((a) => [a.action_type, parseInt(a.value || 0)])
            )
            : {},
        };
      }
    });

    // Chuyển đổi các breakdown khác về dạng object {key: {spend, actions...}}
    const processBreakdown = (dataArray, keyField1, keyField2 = null) => {
      const result = {};
      (dataArray || []).forEach((item) => {
        let key = item[keyField1] || "unknown";
        if (keyField2) {
          key = `${key}_${item[keyField2] || "unknown"}`;
        }
        if (!result[key]) {
          result[key] = { spend: 0, impressions: 0, reach: 0, actions: {} };
        }
        result[key].spend += parseFloat(item.spend || 0);
        result[key].impressions += parseInt(item.impressions || 0);
        result[key].reach += parseInt(item.reach || 0);

        // Core Video metrics check
        const videoFields = [
          "video_thruplay_watched_actions",
          "video_play_actions", "video_p25_watched_actions",
          "video_p50_watched_actions", "video_p75_watched_actions",
          "video_p95_watched_actions", "video_p100_watched_actions"
        ];
        videoFields.forEach(vf => {
          if (item[vf]) {
            const val = Array.isArray(item[vf]) ? (item[vf][0]?.value || 0) : (item[vf]?.value || item[vf]);
            result[key].actions[vf] = (result[key].actions[vf] || 0) + parseInt(val || 0);
          }
        });

        if (item.actions) {
          item.actions.forEach((a) => {
            result[key].actions[a.action_type] =
              (result[key].actions[a.action_type] || 0) +
              parseInt(a.value || 0);
          });
        }
      });
      return result;
    };

    const processedByHour = processBreakdown(
      byHour,
      "hourly_stats_aggregated_by_advertiser_time_zone"
    );

    const processedByAgeGender = processBreakdown(byAgeGender, "age", "gender");
    const processedByRegion = processBreakdown(byRegion, "region");
    const processedByPlatform = processBreakdown(
      byPlatform,
      "publisher_platform",
      "platform_position"
    );

    const processedByDevice = processBreakdown(byDevice, "impression_device");

    renderInteraction(processedByDate); // Truyền dữ liệu đã xử lý
    window.dataByDate = processedByDate; // Lưu data đã xử lý

    // ✅ Refresh Video Funnel với data của ad (sau API)
    window._videoFunnelLoaded = true;
    renderVideoFunnel(lastFullActionsData);

    // ================== Render Chart ==================
    console.log('[showAdDetail] processedByDevice keys:', Object.keys(processedByDevice || {}));
    console.log('[showAdDetail] processedByPlatform keys:', Object.keys(processedByPlatform || {}));
    console.log('[showAdDetail] byDevice raw length:', byDevice?.length, '| byPlatform raw length:', byPlatform?.length);
    // Truyền dữ liệu đã xử lý vào hàm render
    renderCharts({
      byHour: processedByHour,
      byAgeGender: processedByAgeGender,
      byRegion: processedByRegion,
      byPlatform: processedByPlatform, // Dữ liệu này có thể chưa được xử lý đúng dạng object mong đợi bởi renderChartByPlatform
      byDevice: processedByDevice,
      byDate: processedByDate,
    });

    // Hàm này cần dữ liệu đã được xử lý thành object, KHÔNG phải array raw
    renderChartByPlatform({
      // Hàm này render list, không phải chart
      byAgeGender: processedByAgeGender,
      byRegion: processedByRegion,
      byPlatform: processedByPlatform,
      byDevice: processedByDevice,
    });
    // Single pass over processedByDate — accumulate all 4 totals at once
    let _spend = 0, _impressions = 0, _reach = 0, _results = 0;
    for (const d of Object.values(processedByDate)) {
      _spend       += d.spend       || 0;
      _impressions += d.impressions || 0;
      _reach       += d.reach       || 0;
      _results     += d.actions?.["onsite_conversion.lead_grouped"]
                   || d.actions?.["onsite_conversion.messaging_conversation_started_7d"]
                   || 0;
    }
    window.campaignSummaryData = {
      spend:       _spend,
      impressions: _impressions,
      reach:       _reach,
      results:     _results,
    };

    window.targetingData = targeting;
    window.processedByDate = processedByDate;
    window.processedByHour = processedByHour;

    window.processedByAgeGender = processedByAgeGender;
    window.processedByRegion = processedByRegion;
    window.processedByPlatform = processedByPlatform;
  } catch (err) {
    console.error("Lỗi khi load/render chi tiết ad (batch):", err);
  } finally {
    toggleSkeletons("#dom_detail", false);
  }
}
/**
 * ⭐ TỐI ƯU: Hàm Batch Request mới.
 * Thay thế 8 hàm fetch...() riêng lẻ khi xem chi tiết ad.
 */
async function fetchAdDetailBatch(ad_id) {
  if (!ad_id) throw new Error("ad_id is required for batch fetch");

  // 1. Chuẩn bị các tham số chung
  const timeRangeParam = `&time_range[since]=${startDate}&time_range[until]=${endDate}`;

  // 2. Định nghĩa 7 "yêu cầu con" (không có adPreview — load riêng)
  const batchRequests = [
    // targeting
    {
      method: "GET",
      name: "targeting",
      relative_url: `${ad_id}?fields=targeting`,
    },
    // By Hour
    {
      method: "GET",
      name: "byHour",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone${timeRangeParam}`,
    },
    // By Age/Gender
    {
      method: "GET",
      name: "byAgeGender",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=age,gender${timeRangeParam}`,
    },
    // By Region
    {
      method: "GET",
      name: "byRegion",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=region${timeRangeParam}`,
    },
    // By Platform/Position
    {
      method: "GET",
      name: "byPlatform",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=publisher_platform,platform_position${timeRangeParam}`,
    },
    // By Device
    {
      method: "GET",
      name: "byDevice",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&breakdowns=impression_device${timeRangeParam}`,
    },
    // By Date (Daily)
    {
      method: "GET",
      name: "byDate",
      relative_url: `${ad_id}/insights?fields=spend,impressions,reach,actions&time_increment=1${timeRangeParam}`,
    },
  ];

  // 3. Gửi Batch Request
  const headers = { "Content-Type": "application/json" };
  const fbBatchBody = {
    access_token: META_TOKEN,
    batch: batchRequests,
    include_headers: false,
  };

  try {
    const batchResponse = await fetchJSON(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(fbBatchBody),
    });

    // 4. Bóc tách kết quả
    const results = {};
    if (!Array.isArray(batchResponse)) {
      throw new Error("Batch response (ad detail) was not an array");
    }

    batchResponse.forEach((item, index) => {
      const name = batchRequests[index].name; // Lấy tên đã định danh

      // Mặc định giá trị rỗng
      const defaultEmpty =
        name === "targeting" || name === "adPreview" ? null : [];
      results[name] = defaultEmpty;

      if (item && item.code === 200) {
        try {
          const body = JSON.parse(item.body);
          if (name === "targeting") {
            results[name] = body.targeting || {};
          } else {
            results[name] = body.data || [];
          }
        } catch (e) {
          console.warn(`⚠️ Failed to parse batch response for ${name}`, e);
        }
      } else {
        console.warn(`⚠️ Batch request for ${name} failed.`, item);
      }
    });

    return results;
  } catch (err) {
    console.error("❌ Fatal error during ad detail batch fetch:", err);
    return {
      targeting: null,
      byHour: [],
      byAgeGender: [],
      byRegion: [],
      byPlatform: [],
      byDevice: [],
      byDate: [],
    };
  }
}

/**
 * Tải preview HTML riêng — không block main batch.
 * Khi xong thì gán thẳng vào previewBox.
 */
async function fetchAdPreviewAsync(ad_id, previewBox) {
  try {
    const url = `${BASE_URL}/${ad_id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    const html = data?.data?.[0]?.body || "";
    if (previewBox) previewBox.innerHTML = html;
  } catch (err) {
    console.warn("Preview load failed:", err);
    if (previewBox) previewBox.innerHTML = "";
  }
}
// ================== LỌC THEO TỪ KHÓA ==================
function debounce(fn, delay = 500) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const filterInput = document.getElementById("filter");
const filterButton = document.getElementById("filter_button");

if (filterInput) {
  // 🧠 Khi nhấn Enter mới filter
  filterInput.addEventListener(
    "keydown",
    debounce((e) => {
      if (e.key === "Enter") {
        const keyword = e.target.value.trim().toLowerCase();
        const filtered = keyword
          ? window._ALL_CAMPAIGNS.filter((c) =>
            (c.name || "").toLowerCase().includes(keyword)
          )
          : window._ALL_CAMPAIGNS;

        // 🔹 Render lại danh sách và tổng quan
        renderCampaignView(filtered);
      } else if (e.target.value.trim() === "") {
        // 🧹 Nếu clear input → reset về mặc định
        renderCampaignView(window._ALL_CAMPAIGNS);
      }
    }, 300)
  );

  // 👀 Khi clear input bằng tay (xóa hết text)
  filterInput.addEventListener(
    "input",
    debounce((e) => {
      if (e.target.value.trim() === "") {
        renderCampaignView(window._ALL_CAMPAIGNS);
      }
    }, 300)
  );
}

if (filterButton) {
  // 🖱 Khi click nút tìm
  filterButton.addEventListener(
    "click",
    debounce(() => {
      const keyword = filterInput?.value?.trim().toLowerCase() || "";
      const filtered = keyword
        ? window._ALL_CAMPAIGNS.filter((c) =>
          (c.name || "").toLowerCase().includes(keyword)
        )
        : window._ALL_CAMPAIGNS;

      // 🔹 Render lại danh sách và tổng quan
      renderCampaignView(filtered);
    }, 300)
  );
}
