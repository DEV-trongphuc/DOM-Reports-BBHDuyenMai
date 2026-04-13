async function handleAdsetInsightClick(btn) {
  const adsetId = btn.dataset.adsetId;
  if (!adsetId) return;

  const name = btn.dataset.name || "Adset";
  const goal = btn.dataset.goal || "";

  // ⭐ Lấy data từ bộ nhớ để hiển thị tức thì
  let adsetObj = null;
  if (window._ALL_CAMPAIGNS) {
    for (const c of window._ALL_CAMPAIGNS) {
      adsetObj = (c.adsets || []).find(a => a.id === adsetId);
      if (adsetObj) break;
    }
  }

  const spend = adsetObj ? adsetObj.spend : parseFloat(btn.dataset.spend || 0);
  const reach = adsetObj ? adsetObj.reach : parseFloat(btn.dataset.reach || 0);
  const impressions = adsetObj ? adsetObj.impressions : parseFloat(btn.dataset.impressions || 0);
  const result = adsetObj ? adsetObj.result : parseFloat(btn.dataset.result || 0);
  const cpr = adsetObj ? getMetricValue(adsetObj, "cpr") : parseFloat(btn.dataset.cpr || 0);

  // Hiển thị ngay Actions Detail từ bộ nhớ (trước khi gọi API breakdown)
  if (adsetObj) {
    renderFullActionsDetail(adsetObj);
    // ✅ Reset flag + ẩn button + đóng panel khi mở adset mới
    window._videoFunnelLoaded = false;
    window._videoFunnelHasData = false;
    const fBtn = document.getElementById("video_funnel_toggle_btn");
    if (fBtn) fBtn.style.display = "none";
    const fPanel = document.getElementById("video_funnel_panel");
    if (fPanel) fPanel.classList.remove("active");
    window.__lastAdsetObj = adsetObj;
    renderVideoFunnel(adsetObj);
  }

  // Cập nhật quick stats
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

  VIEW_GOAL = goal;

  // Cập nhật frequency widget
  const freqWrap = document.querySelector(".dom_frequency");
  if (freqWrap && reach > 0) {
    const frequency = impressions / reach;
    const percent = Math.min((frequency / 4) * 100, 100);
    const donut = freqWrap.querySelector(".semi-donut");
    if (donut) donut.style.setProperty("--percentage", percent.toFixed(1));
    const freqNum = freqWrap.querySelector(".frequency_number");
    if (freqNum) freqNum.querySelector("span:nth-child(1)").textContent = frequency.toFixed(1);
    const impLabel = freqWrap.querySelector(".dom_frequency_label_impression");
    const reachLabel = freqWrap.querySelector(".dom_frequency_label_reach");
    if (impLabel) impLabel.textContent = impressions.toLocaleString("vi-VN");
    if (reachLabel) reachLabel.textContent = reach.toLocaleString("vi-VN");
  }

  // Mở panel
  const domDetail = document.querySelector("#dom_detail");
  if (domDetail) {
    domDetail.classList.add("active");
    // Ẩn Quick Preview — adset không có thẻ quảng cáo
    const previewBox = domDetail.querySelector("#preview_box");
    const previewBtn = domDetail.querySelector("#preview_button");
    if (previewBox) { previewBox.innerHTML = ""; previewBox.style.display = "none"; }
    if (previewBtn) previewBtn.style.display = "none";

    // Cập nhật header thumbnail → fan cards nếu có nhiều ảnh
    const headerThumbWrap = domDetail.querySelector(".dom_detail_header_first > div");
    if (headerThumbWrap) {
      let thumbs = [];
      try { thumbs = JSON.parse(decodeURIComponent(btn.dataset.thumbs || "[]")) || []; } catch (e) { thumbs = []; }
      if (thumbs.length > 1) {
        // Render fan cards
        const mainImg = headerThumbWrap.querySelector("img:not(.cmp_fan_img)");
        if (mainImg) mainImg.style.display = "none";
        let fanEl = headerThumbWrap.querySelector(".detail_fan_wrap");
        if (!fanEl) {
          fanEl = document.createElement("div");
          fanEl.className = "detail_fan_wrap";
          headerThumbWrap.insertBefore(fanEl, headerThumbWrap.firstChild);
        }
        fanEl.setAttribute("data-count", thumbs.length);
        fanEl.innerHTML = thumbs.map((url, idx) =>
          `<img class="cmp_fan_img" style="--fi:${idx}" src="${url}" />`
        ).join("");
        fanEl.style.display = "";
      } else {
        // Single image or none
        const existFan = headerThumbWrap.querySelector(".detail_fan_wrap");
        if (existFan) existFan.style.display = "none";
        const imgEl = headerThumbWrap.querySelector("img:not(.cmp_fan_img)");
        if (imgEl) {
          imgEl.style.display = "";
          imgEl.src = thumbs[0] || "https://dev-trongphuc.github.io/DOM_MISA_IDEAS_CRM/logotarget.png";
        }
      }
    }
    // Update name + ID label
    const idEl = domDetail.querySelector(".dom_detail_id");
    if (idEl) idEl.innerHTML = `<span>${name}</span> <span>ID: ${adsetId}</span>`;
  }

  const loadingEl = document.querySelector(".loading");
  if (loadingEl) loadingEl.classList.add("active");

  try {
    await showAdsetDetail(adsetId);
  } catch (err) {
    console.error("❌ Lỗi khi load chi tiết adset:", err);
  } finally {
    if (loadingEl) loadingEl.classList.remove("active");
  }
}

async function showAdsetDetail(adset_id) {
  if (!adset_id) return;

  // 🦴 Skeleton start
  toggleSkeletons("#dom_detail", true);

  // Destroy old chart instances
  [
    window.detail_spent_chart_instance,
    window.chartByHourInstance,
    window.chart_by_age_gender_instance,
    window.chart_by_region_instance,
    window.chart_by_device_instance,
  ].forEach((c) => { if (c && typeof c.destroy === "function") { try { c.destroy(); } catch (e) { } } });
  window.detail_spent_chart_instance = null;
  window.chartByHourInstance = null;
  window.chart_by_age_gender_instance = null;
  window.chart_by_region_instance = null;
  window.chart_by_device_instance = null;

  try {
    // ✅ Fix: bỏ khoảng trắng thừa — trước đây "&  time_range[since]= " gây lỗi API
    const timeRangeParam = `&time_range[since]=${startDate}&time_range[until]=${endDate}`;
    const videoFieldsParam = "video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions";

    const batchRequests = [
      { method: "GET", name: "targeting", relative_url: `${adset_id}?fields=targeting` },
      {
        method: "GET", name: "byHour", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone${timeRangeParam}`
      },
      { method: "GET", name: "byAgeGender", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&breakdowns=age,gender${timeRangeParam}` },
      { method: "GET", name: "byRegion", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&breakdowns=region${timeRangeParam}` },
      { method: "GET", name: "byPlatform", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&breakdowns=publisher_platform,platform_position${timeRangeParam}` },
      { method: "GET", name: "byDevice", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&breakdowns=impression_device${timeRangeParam}` },
      { method: "GET", name: "byDate", relative_url: `${adset_id}/insights?fields=spend,impressions,reach,actions,${videoFieldsParam}&time_increment=1${timeRangeParam}` },
      { method: "GET", name: "deliveryEstimate", relative_url: `${adset_id}/delivery_estimate?fields=estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_dau_lower_bound,estimate_dau_upper_bound` },
    ];

    const batchResponse = await fetchJSON(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: META_TOKEN, batch: batchRequests, include_headers: false }),
    });

    if (!Array.isArray(batchResponse)) throw new Error("Invalid batch response");

    // ✅ Parse cùng pattern với fetchAdDetailBatch
    const results = {};
    batchResponse.forEach((item, i) => {
      const name = batchRequests[i].name;
      const defaultEmpty = name === "targeting" ? {} : [];
      results[name] = defaultEmpty;

      if (item && item.code === 200) {
        try {
          const parsed = JSON.parse(item.body);
          if (name === "targeting") {
            results[name] = parsed.targeting || {};
          } else {
            results[name] = parsed.data || [];
          }
        } catch (e) {
          console.warn(`⚠️ Failed to parse batch response for ${name}`, e);
        }
      } else {
        console.warn(`⚠️ Batch request for ${name} failed.`, item);
      }
    });

    // Render targeting
    const targeting = results.targeting || {};
    renderTargetingToDOM(targeting);

    // Render delivery estimate (audience size bar)
    const deliveryData = (results.deliveryEstimate || [])[0] || {};
    renderDeliveryEstimate(deliveryData);

    const processBreakdown = (arr, k1, k2 = null) => {
      const out = {};
      (arr || []).forEach((item) => {
        let key = item[k1] || "unknown";
        if (k2) key = `${key}_${item[k2] || "unknown"}`;
        if (!out[key]) out[key] = { spend: 0, impressions: 0, reach: 0, actions: {} };
        out[key].spend += parseFloat(item.spend || 0);
        out[key].impressions += parseInt(item.impressions || 0);
        out[key].reach += parseInt(item.reach || 0);

        // Core Video metrics check
        const videoFields = [
          "video_thruplay_watched_actions", "video_play_actions",
          "video_p25_watched_actions", "video_p50_watched_actions",
          "video_p75_watched_actions", "video_p95_watched_actions",
          "video_p100_watched_actions"
        ];
        videoFields.forEach(vf => {
          if (item[vf]) {
            const val = Array.isArray(item[vf]) ? (item[vf][0]?.value || 0) : (item[vf]?.value || item[vf]);
            out[key].actions[vf] = (out[key].actions[vf] || 0) + parseInt(val || 0);
          }
        });

        (item.actions || []).forEach((a) => {
          out[key].actions[a.action_type] = (out[key].actions[a.action_type] || 0) + parseInt(a.value || 0);
        });
      });
      return out;
    };

    const processedByDate = {};
    (results.byDate || []).forEach((item) => {
      if (item.date_start) {
        processedByDate[item.date_start] = {
          spend: parseFloat(item.spend || 0),
          impressions: parseInt(item.impressions || 0),
          reach: parseInt(item.reach || 0),
          actions: item.actions ? Object.fromEntries(item.actions.map((a) => [a.action_type, parseInt(a.value || 0)])) : {},
        };
        // Also capture video metrics for daily chart compatibility
        const videoFields = ["video_thruplay_watched_actions", "video_play_actions", "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions", "video_p95_watched_actions", "video_p100_watched_actions"];
        videoFields.forEach(vf => {
          if (item[vf]) {
            const val = Array.isArray(item[vf]) ? (item[vf][0]?.value || 0) : (item[vf]?.value || item[vf]);
            processedByDate[item.date_start].actions[vf] = parseInt(val || 0);
          }
        });
      }
    });

    const processedByHour = processBreakdown(results.byHour, "hourly_stats_aggregated_by_advertiser_time_zone");
    const processedByAgeGender = processBreakdown(results.byAgeGender, "age", "gender");
    const processedByRegion = processBreakdown(results.byRegion, "region");
    const processedByPlatform = processBreakdown(results.byPlatform, "publisher_platform", "platform_position");
    const processedByDevice = processBreakdown(results.byDevice, "impression_device");

    const totalSpend = Object.values(processedByDate).reduce((t, d) => t + d.spend, 0);
    const totalActions = Object.values(processedByDate).reduce((t, d) =>
      t + Object.values(d.actions || {}).reduce((sum, v) => sum + v, 0), 0);

    const domDetail = document.querySelector("#dom_detail");
    if (totalSpend === 0 && totalActions === 0) {
      domDetail.classList.add("no-data");
      let emptyMsg = domDetail.querySelector(".detail_empty_msg");
      if (!emptyMsg) {
        emptyMsg = document.createElement("div");
        emptyMsg.className = "detail_empty_msg";
        emptyMsg.innerHTML = `
          <div class="empty_content">
             <i class="fa-solid fa-folder-open"></i>
             <h3>Không có dữ liệu chi tiết</h3>
             <p>Không tìm thấy chỉ số Spend hoặc Actions cho Adset này trong khoảng thời gian đã chọn.</p>
          </div>
        `;
        domDetail.appendChild(emptyMsg);
      }
    } else {
      domDetail.classList.remove("no-data");
    }

    renderInteraction(processedByDate);
    window.dataByDate = processedByDate;

    // ✅ Dùng cùng nguồn với Full Actions Detail (lastFullActionsData)
    window._videoFunnelLoaded = true;
    renderVideoFunnel(lastFullActionsData);

    renderCharts({
      byHour: processedByHour,
      byAgeGender: processedByAgeGender,
      byRegion: processedByRegion,
      byPlatform: processedByPlatform,
      byDevice: processedByDevice,
      byDate: processedByDate,
    });

    renderChartByPlatform({
      byAgeGender: processedByAgeGender,
      byRegion: processedByRegion,
      byPlatform: processedByPlatform,
      byDevice: processedByDevice,
    });

    // ✅ Lưu toàn bộ global data để AI Deep Report hoạt động (giống showAdDetail)
    window.campaignSummaryData = {
      spend: totalSpend,
      impressions: Object.values(processedByDate).reduce((t, d) => t + d.impressions, 0),
      reach: Object.values(processedByDate).reduce((t, d) => t + d.reach, 0),
      results: totalActions,
    };

    window.targetingData = targeting;
    window.processedByDate = processedByDate;
    window.processedByHour = processedByHour;
    window.processedByAgeGender = processedByAgeGender;
    window.processedByRegion = processedByRegion;
    window.processedByPlatform = processedByPlatform;
  } catch (err) {
    console.error("Lỗi khi fetch adset detail:", err);
  } finally {
    // 🦴 Skeleton end
    toggleSkeletons("#dom_detail", false);
  }
}
// ================================================================
// ===================== BREAKDOWN FUNCTIONS ======================
// ================================================================
