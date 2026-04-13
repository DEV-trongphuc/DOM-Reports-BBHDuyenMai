
function renderCampaignView(data) {
  const wrap = document.querySelector(".view_campaign_box");
  if (!wrap || !Array.isArray(data)) return;

  // ✅ Auto-clear selections khi render lại (do filter/search thay đổi)
  const selBar = document.getElementById("selection_summary_bar");
  if (selBar) selBar.style.display = "none";
  const headerCb = document.getElementById("select_all_cb");
  if (headerCb) headerCb.checked = false;

  const now = Date.now();
  const activeLower = "active";

  let totalCampaignCount = window._ALL_CAMPAIGNS?.length || data.length;
  let filteredCampaignCount = data.length;
  let activeCampaignCount = 0;
  let totalAdsetCount = 0;
  let activeAdsetCount = 0;
  let totalAdsCount = 0;
  let activeAdsCount = 0;

  // ==== ⭐ TỐI ƯU 1: Vòng lặp tiền xử lý (Pre-processing) ====
  // Tính toán cờ `isActive` và số lượng active MỘT LẦN.
  // Thêm các thuộc tính tạm thời (transient) vào object `data`
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    const adsets = c.adsets || [];
    c._isActive = false; // Cờ tạm thời cho campaign
    c._activeAdsetCount = 0; // Cờ tạm thời cho số adset active
    totalAdsetCount += adsets.length;

    for (let j = 0; j < adsets.length; j++) {
      const as = adsets[j];
      // Tính toán trạng thái và số lượng ads active cho adset
      as._activeAdsCount = 0;
      as._isActive = false;

      // ==== ⭐ Sắp xếp ads (active lên trước, rồi theo spend) — dùng copy để không mutate as.ads gốc ====
      const ads = (as.ads || []).slice().sort((a, b) => {
        const aIsActive = a.status?.toLowerCase() === activeLower;
        const bIsActive = b.status?.toLowerCase() === activeLower;
        if (aIsActive !== bIsActive) return bIsActive - aIsActive;
        return b.spend - a.spend;
      });
      as._sortedAds = ads;
      // ==========================================================================================

      // Duyệt qua các ads và tính toán trạng thái active của adset
      for (let k = 0; k < ads.length; k++) {
        totalAdsCount++;
        if (ads[k].status?.toLowerCase() === activeLower) {
          as._activeAdsCount++;
          as._isActive = true;
          activeAdsCount++;
        }
      }

      // Nếu adset active, cập nhật trạng thái của campaign
      if (as._isActive) {
        c._isActive = true;
        c._activeAdsetCount++;
        activeAdsetCount++; // Đếm số adset active trong tổng
      }
    } // <-- Hết vòng lặp adset (j)

    // ==== ⭐ Sắp xếp adset trong campaign — dùng copy để không mutate c.adsets gốc ====
    c._sortedAdsets = adsets.slice().sort((a, b) => {
      if (a._isActive !== b._isActive) return b._isActive - a._isActive;
      return b.spend - a.spend;
    });
    // ====================================================================================

    // Nếu campaign có ít nhất 1 adset active, campaign được đánh dấu là active
    if (c._isActive) {
      activeCampaignCount++;
    }
  }

  // === Cập nhật UI tổng active (dùng cờ đã tính) ===
  const activeCpEls = document.querySelectorAll(".dom_active_cp");
  if (activeCpEls.length >= 2) {
    // Campaign
    const campEl = activeCpEls[0].querySelector("span:nth-child(2)");
    if (campEl) {
      const hasActiveCampaign = activeCampaignCount > 0;
      campEl.classList.toggle("inactive", !hasActiveCampaign);
      campEl.innerHTML = `<span class="live-dot"></span>${activeCampaignCount}/${filteredCampaignCount}`;
    }
    // Adset
    const adsetEl = activeCpEls[1].querySelector("span:nth-child(2)");
    if (adsetEl) {
      const hasActiveAdset = activeAdsetCount > 0;
      adsetEl.classList.toggle("inactive", !hasActiveAdset);
      adsetEl.innerHTML = `<span class="live-dot"></span>${activeAdsetCount}/${totalAdsetCount}`;
    }
    // Ads
    if (activeCpEls[2]) {
      const adsEl = activeCpEls[2].querySelector("span:nth-child(2)");
      if (adsEl) {
        const hasActiveAds = activeAdsCount > 0;
        adsEl.classList.toggle("inactive", !hasActiveAds);
        adsEl.innerHTML = `<span class="live-dot"></span>${activeAdsCount}/${totalAdsCount}`;
      }
    }
  }

  // === ⭐ Sắp xếp (Sort) — dùng copy để không mutate _ALL_CAMPAIGNS gốc ===
  const renderData = data.slice().sort((a, b) => {
    if (a._isActive !== b._isActive) return b._isActive - a._isActive;
    return b.spend - a.spend;
  });

  // === ⭐ TỐI ƯU 3: Render (dùng cờ đã tính) ===
  const htmlBuffer = [];

  // ⭐ TỐI ƯU: Tính activeMetas MỘT LẦN ngoài vòng lặp thay vì mỗi campaign
  const activeMetas = ACTIVE_COLUMNS.map(id => {
    const meta = METRIC_REGISTRY[id];
    if (meta) return meta;
    const custom = CUSTOM_METRICS.find(m => m.id === id);
    if (custom) return { ...custom, type: "custom" };
    return null;
  }).filter(Boolean);

  for (let i = 0; i < renderData.length; i++) {
    const c = renderData[i];
    const adsets = c._sortedAdsets || c.adsets;

    // ── Smart Badges: tính CPR trung bình campaign ──
    const _badgesOn = window._smartBadgesEnabled !== false;
    let _campAvgCpr = null;
    if (_badgesOn && adsets && adsets.length > 1) {
      const _validCpr = adsets
        .map(as => (as.result > 0 ? as.spend / as.result : null))
        .filter(v => v !== null);
      _campAvgCpr = _validCpr.length ? _validCpr.reduce((s, v) => s + v, 0) / _validCpr.length : null;
    }

    // Dùng cờ `_isActive` và `_activeAdsetCount` đã tính
    const hasActiveAdset = c._isActive;
    const activeAdsetCountForDisplay = c._activeAdsetCount;

    const campaignStatusClass = hasActiveAdset ? "active" : "inactive";
    const campaignStatusText = hasActiveAdset
      ? `${activeAdsetCountForDisplay} ACTIVE`
      : "INACTIVE";

    const firstGoal = adsets?.[0]?.optimization_goal || "";
    const iconClass = getCampaignIcon(firstGoal);

    // Collect up to 3 unique ad thumbnails from all adsets
    const thumbUrls = [];
    for (const adset of (adsets || [])) {
      for (const ad of (adset.ads || [])) {
        if (ad.thumbnail && thumbUrls.length < 3) thumbUrls.push(ad.thumbnail);
        if (thumbUrls.length >= 3) break;
      }
      if (thumbUrls.length >= 3) break;
    }
    const hasThumbs = thumbUrls.length > 0;
    // Fan/stacked card HTML
    const fanHtml = hasThumbs
      ? `<div class="cmp_fan_wrap" data-count="${thumbUrls.length}">${thumbUrls.map((url, idx) => `<img class="cmp_fan_img" style="--fi:${idx}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${url}" />`).join('')}</div>`
      : `<div class="campaign_icon_wrap ${hasActiveAdset ? '' : 'inactive'}"><i class="${iconClass}"></i></div>`;

    const isMixed = c.isMixedGoal;

    const renderCells = (item, isMixed = false) => {
      return activeMetas.map(meta => {
        if (isMixed && (meta.id === "result" || meta.id === "cpr")) return `<div class="ad_metric ad_${meta.id}">-</div>`;
        const val = getMetricValue(item, meta.id);
        const tooltipAttr = meta.type === "custom" ? `data-tooltip="Công thức: ${meta.formula}"` : "";
        return `<div class="ad_metric ad_${meta.id}" ${tooltipAttr}>${formatMetric(val, meta.format)}</div>`;
      }).join("");
    };

    const campaignHtml = [];
    campaignHtml.push(`
      <div class="campaign_item ${campaignStatusClass}">
        <div class="campaign_main">
          <div class="ads_name">
            <label class="row_checkbox_wrap" onclick="event.stopPropagation()">
              <input type="checkbox" class="row_checkbox" data-level="campaign" data-id="${c.id}" data-name="${c.name.replace(/"/g, '&quot;')}" />
              <span class="row_checkbox_box"></span>
            </label>
            ${fanHtml}
            <p class="ad_name">${c.name}</p>
          </div>
          <div class="ad_status ${campaignStatusClass}">${campaignStatusText}</div>
          ${renderCells(c, isMixed)}
          <div class="campaign_view"><i class="fa-solid fa-angle-down"></i></div>
        </div>`);

    // === Render adset (dùng cờ đã tính) ===
    for (let j = 0; j < adsets.length; j++) {
      const as = adsets[j];
      const ads = as._sortedAds || as.ads;

      // Dùng cờ `_isActive` và `_activeAdsCount` đã tính
      const hasActiveAd = as._isActive;
      const activeAdsCount = as._activeAdsCount;

      let adsetStatusClass = "inactive";
      let adsetStatusText = "INACTIVE";

      const endTime = as.end_time ? new Date(as.end_time).getTime() : null;
      const isEnded = endTime && endTime < now;
      const dailyBudget    = +as.daily_budget    || 0;
      const lifetimeBudget = +as.lifetime_budget || 0;

      const startDateFmt = _formatAdsetDate(as.start_time);
      const endDateFmt   = _formatAdsetDate(as.end_time);
      let label = "";
      let value = "";
      let timeText = "";
      if (isEnded) {
        if (startDateFmt && endDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> ${startDateFmt} to ${endDateFmt}`;
        } else if (startDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> Start: ${startDateFmt}`;
        } else if (endDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> End: ${endDateFmt}`;
        } else {
          timeText = "";
        }

        adsetStatusClass = timeText ? "complete budget" : "complete";
        label = ``;
        value = `<span class="status-value">COMPLETE</span>`;

        adsetStatusText = `
          ${label}
          ${value}
          ${timeText ? `<span class="status-date">${timeText}</span>` : ""}
        `;
      } else if (hasActiveAd && (dailyBudget > 0 || lifetimeBudget > 0)) {
        adsetStatusClass = "active budget";

        if (dailyBudget > 0) {
          label = `<span class="status-label">Daily Budget</span>`;
          value = `<span class="status-value">${dailyBudget.toLocaleString("vi-VN")}đ</span>`;
          timeText = endDateFmt
            ? `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> ${startDateFmt} to ${endDateFmt}`
            : `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> START: ${startDateFmt}`;
        } else if (lifetimeBudget > 0) {
          label = `<span class="status-label">Lifetime Budget</span>`;
          value = `<span class="status-value">${lifetimeBudget.toLocaleString("vi-VN")}đ</span>`;
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> ${startDateFmt} to ${endDateFmt}`;
        }

        adsetStatusText = `
          ${label}
          ${value}
          ${timeText ? `<span class="status-date">${timeText}</span>` : ""}
        `;
      } else if (hasActiveAd) {
        adsetStatusClass = "active";
        adsetStatusText = `<span>ACTIVE</span>`;
      } else {
        if (startDateFmt && endDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> ${startDateFmt} to ${endDateFmt}`;
        } else if (startDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> Start: ${startDateFmt}`;
        } else if (endDateFmt) {
          timeText = `<i class="fa-regular fa-clock" style="opacity: 0.5"></i> End: ${endDateFmt}`;
        } else {
          timeText = "";
        }

        adsetStatusClass = timeText ? "inactive budget" : "inactive";
        label = ``;
        value = `<span class="status-value">INACTIVE</span>`;

        adsetStatusText = `
          ${label}
          ${value}
          ${timeText ? `<span class="status-date">${timeText}</span>` : ""}
        `;
      }


      const adsHtml = new Array(ads.length);
      // Tính CPR trung bình ads trong adset này (cho badge cấp ad)
      const _adValidCprs = ads.map(ad => ad.result > 0 ? ad.spend / ad.result : null).filter(v => v !== null);
      const _adAvgCpr = _adValidCprs.length > 1 ? _adValidCprs.reduce((s, v) => s + v, 0) / _adValidCprs.length : null;
      for (let k = 0; k < ads.length; k++) {
        const ad = ads[k];
        const isActive = ad.status?.toLowerCase() === activeLower;

        adsHtml[k] = `
          <div class="ad_item ${isActive ? "active" : "inactive"}" data-campaign-id="${c.id}" data-adset-id="${as.id}">
            <div class="ads_name">
              <label class="row_checkbox_wrap" onclick="event.stopPropagation()">
                <input type="checkbox" class="row_checkbox" data-level="ad" data-id="${ad.id}" data-parent-adset="${as.id}" data-parent-campaign="${c.id}" data-name="ID: ${ad.id}" />
                <span class="row_checkbox_box"></span>
              </label>
              <a>
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${ad.thumbnail}" data-ad-id-img="${ad.id}" />
                <p class="ad_name" style="display:flex;flex-direction:column;gap:0.25rem;min-width:0;">
                  <span class="ad_name_text">ID: ${ad.id}</span>
                  <span class="ad_name_meta">
                    ${(() => {
            const adCpr = ad.result > 0 ? ad.spend / ad.result : null;
            const adFreq = +ad.frequency || 0;
            const adResult = +ad.result || 0;
            const adSpend = +ad.spend || 0;
            const adStatus = (ad.status || '').toLowerCase();
            const b = [];
            if (adCpr !== null && _adAvgCpr !== null && adCpr < _adAvgCpr * 0.70 && adStatus === 'active')
              b.push(`<span class="dom_smart_badge badge_scale" title="CPR vượt trội"><i class="fa-solid fa-bolt"></i> Scale</span>`);
            else if (adCpr !== null && _adAvgCpr !== null && adCpr < _adAvgCpr * 0.80)
              b.push(`<span class="dom_smart_badge badge_best" title="Best Performance"><i class="fa-solid fa-star"></i> Best Performance</span>`);
            if (adCpr !== null && _adAvgCpr !== null && adCpr > _adAvgCpr * 1.30)
              b.push(`<span class="dom_smart_badge badge_review" title="CPR cao"><i class="fa-solid fa-circle-exclamation"></i> Review</span>`);
            if (adResult > 0 && adResult < 30 && adStatus === 'active')
              b.push(`<span class="dom_smart_badge badge_learning" title="Learning phase"><i class="fa-solid fa-graduation-cap"></i> Learning</span>`);
            if (adFreq > 4)
              b.push(`<span class="dom_smart_badge badge_fatigue" title="Fatigue freq ${adFreq.toFixed(1)}"><i class="fa-solid fa-battery-quarter"></i> Fatigue</span>`);
            if (adSpend === 0 && adStatus === 'active')
              b.push(`<span class="dom_smart_badge badge_stale" title="No spend"><i class="fa-solid fa-ban"></i> No spend</span>`);
            return b.join('');
          })()}
                  <i class="fa-regular fa-copy ad_copy_id" 
                     data-id="${ad.id}"
                     title="Copy ID"
                     onclick="event.stopPropagation();navigator.clipboard.writeText('${ad.id}').then(()=>{this.className='fa-solid fa-circle-check ad_copy_id copied';setTimeout(()=>this.className='fa-regular fa-copy ad_copy_id',1500)});"
                     style="cursor:pointer;font-size:1.1rem;opacity:0.4;transition:all 0.2s;flex-shrink:0;"></i>
                  <span class="ad_inline_insight_btn"
                    data-ad-id="${ad.id}"
                    data-name="${as.name}"
                    data-goal="${as.optimization_goal}"
                    data-spend="${ad.spend}"
                    data-reach="${ad.reach}"
                    data-impressions="${ad.impressions}"
                    data-result="${ad.result}"
                    data-cpr="${getMetricValue(ad, 'cpr')}"
                    data-thumb="${ad.thumbnail || ""}"
                    data-post="${ad.post_url || ""}"
                    title="Xem insight"
                    onclick="event.stopPropagation();const v=this.closest('.ad_item').querySelector('.ad_view');if(v)v.click();"
                    style="display:inline-flex;align-items:center;justify-content:center;width:2.4rem;height:2.4rem;border-radius:8px;background:#f1f5f9;color:#64748b;cursor:pointer;flex-shrink:0;opacity:0.6;transition:opacity 0.15s;font-size:1.1rem;"
                    onmouseenter="this.style.opacity='1';this.style.background='#fffbeb';this.style.color='#f59e0b';"
                    onmouseleave="this.style.opacity='0.6';this.style.background='#f1f5f9';this.style.color='#64748b';">
                    <i class="fa-solid fa-magnifying-glass-chart"></i>
                  </span>
                </p>
              </a>
            </div>
            <div class="ad_status ${isActive ? "active" : "inactive"}">${ad.status
          }</div>
            ${renderCells(ad)}
            <div class="ad_view"
              data-ad-id="${ad.id}"
              data-name="${as.name}"
              data-goal="${as.optimization_goal}"
              data-spend="${ad.spend}"
              data-reach="${ad.reach}"
              data-impressions="${ad.impressions}"
              data-result="${ad.result}"
              data-cpr="${getMetricValue(ad, 'cpr')}"
              data-thumb="${ad.thumbnail || ""}"
              data-post="${ad.post_url || ""}">
              <i class="fa-solid fa-magnifying-glass-chart"></i>
            </div>
          </div>`;
      }

      campaignHtml.push(`
        <div class="adset_item ${adsetStatusClass}" data-campaign-id="${c.id}">
          <div class="ads_name" style="cursor: pointer;" onclick="const b = this.closest('.adset_item').querySelector('.adset_insight_btn'); if(b) handleAdsetInsightClick(b);">
            <label class="row_checkbox_wrap" onclick="event.stopPropagation()">
              <input type="checkbox" class="row_checkbox" data-level="adset" data-id="${as.id}" data-parent-campaign="${c.id}" data-name="${as.name.replace(/"/g, '&quot;')}" />
              <span class="row_checkbox_box"></span>
            </label>
            <a>
              <div class="adset_goal_thumb ${hasActiveAd ? '' : 'inactive'}">
                <i class="${getCampaignIcon(as.optimization_goal)}"></i>
              </div>
              <p class="ad_name" style="display:flex;flex-direction:column;gap:0.25rem;min-width:0;">
                <span class="ad_name_text">${as.name}</span>
                <span class="ad_name_meta">
                  ${(() => {
          const asCpr = as.result > 0 ? as.spend / as.result : null;
          const asFreq = +as.frequency || 0;
          const isAdsetActive = hasActiveAd; // use the already-computed _isActive flag
          const asResult = +as.result || 0;
          const asSpend = +as.spend || 0;
          const badges = [];
          if (asCpr !== null && _campAvgCpr !== null && asCpr < _campAvgCpr * 0.70 && isAdsetActive)
            badges.push(`<span class="dom_smart_badge badge_scale" title="CPR vượt trội ≥30% — nên scale"><i class="fa-solid fa-bolt"></i> Scale</span>`);
          else if (asCpr !== null && _campAvgCpr !== null && asCpr < _campAvgCpr * 0.80)
            badges.push(`<span class="dom_smart_badge badge_best" title="Best Performance — CPR thấp hơn TB ≥20%"><i class="fa-solid fa-star"></i> Best Performance</span>`);
          if (asCpr !== null && _campAvgCpr !== null && asCpr > _campAvgCpr * 1.30)
            badges.push(`<span class="dom_smart_badge badge_review" title="CPR cao hơn TB ≥30% — cần xem xét"><i class="fa-solid fa-circle-exclamation"></i> Review</span>`);
          if (asResult > 0 && asResult < 50 && isAdsetActive)
            badges.push(`<span class="dom_smart_badge badge_learning" title="<50 results — giai đoạn học"><i class="fa-solid fa-graduation-cap"></i> Learning</span>`);
          if (asFreq > 3.5)
            badges.push(`<span class="dom_smart_badge badge_fatigue" title="Frequency ${asFreq.toFixed(1)} — creative có thể mệt"><i class="fa-solid fa-battery-quarter"></i> Fatigue</span>`);
          if (asSpend === 0 && isAdsetActive)
            badges.push(`<span class="dom_smart_badge badge_stale" title="Active nhưng không có spend"><i class="fa-solid fa-ban"></i> No spend</span>`);
          return badges.join('');
        })()}
                  <span class="adset_inline_insight_btn"
                    data-adset-id="${as.id}"
                    data-name="${as.name}"
                    data-goal="${as.optimization_goal}"
                    data-spend="${as.spend}"
                    data-reach="${as.reach}"
                    data-impressions="${as.impressions}"
                    data-result="${as.result}"
                    data-cpr="${getMetricValue(as, 'cpr')}"
                    data-thumbs="${encodeURIComponent(JSON.stringify((as.ads || []).slice(0, 3).map(a => a.thumbnail || '').filter(Boolean)))}"
                    title="Xem insight adset"
                    onclick="event.stopPropagation();const b=this.closest('.adset_item').querySelector('.adset_insight_btn');if(b)handleAdsetInsightClick(b);"
                    style="display:inline-flex;align-items:center;justify-content:center;width:2.4rem;height:2.4rem;border-radius:8px;background:#f1f5f9;color:#64748b;cursor:pointer;flex-shrink:0;opacity:0;transition:opacity 0.15s;font-size:1.1rem;"
                    onmouseenter="this.style.opacity='1';this.style.background='#fffbeb';this.style.color='#f59e0b';"
                    onmouseleave="this.style.opacity='0';this.style.background='#f1f5f9';this.style.color='#64748b';">
                    <i class="fa-solid fa-magnifying-glass-chart"></i>
                  </span>
                </span>
              </p>
            </a>
          </div>
          <div class="ad_status ${adsetStatusClass}">${adsetStatusText}</div>
          ${renderCells(as)}
          <div class="adset_view">
            <div class="adset_insight_btn"
              data-adset-id="${as.id}"
              data-name="${as.name}"
              data-goal="${as.optimization_goal}"
              data-spend="${as.spend}"
              data-reach="${as.reach}"
              data-impressions="${as.impressions}"
              data-result="${as.result}"
              data-cpr="${getMetricValue(as, 'cpr')}"
              data-thumbs="${encodeURIComponent(JSON.stringify((as.ads || []).slice(0, 3).map(a => a.thumbnail || '').filter(Boolean)))}"
              title="Xem insight adset">
              <i class="fa-solid fa-magnifying-glass-chart"></i>
            </div>
          </div>
        </div>
        <div class="ad_item_box">${adsHtml.join("")}</div>`);
    }

    campaignHtml.push(`</div>`);
    htmlBuffer.push(campaignHtml.join(""));
  }

  // Update dynamic header
  const headerWrap = document.querySelector(".view_campaign_header .campaign_main");
  if (headerWrap) {
    const headerMetas = ACTIVE_COLUMNS.map(id => {
      const meta = METRIC_REGISTRY[id];
      if (meta) return meta;
      const custom = CUSTOM_METRICS.find(m => m.id === id);
      if (custom) return { ...custom, label: custom.name, isCustom: true };
      return null;
    }).filter(Boolean);

    headerWrap.innerHTML = `
      <div class="ads_name"><p class="ad_name">Ad Name</p></div>
      <div class="ad_status">Status</div>
      ${headerMetas.map(m => {
      const icon = m.isCustom ? `<i class="fa-solid fa-flask" style="font-size: 1rem; color: #f59e0b; margin-right: 0.5rem;"></i> ` : '';
      const tooltip = m.isCustom ? `data-tooltip="Công thức: ${m.formula}"` : '';
      return `<div class="ad_metric ad_${m.id}" ${tooltip}>${icon}${m.label}</div>`;
    }).join("")}
      <div class="campaign_view">Insight</div>
    `;
  }

  wrap.innerHTML = htmlBuffer.join("");

  // === Empty state handling ===
  const emptyState = document.querySelector(".view_campaign_empty");
  if (emptyState) {
    emptyState.style.display = data.length === 0 ? "flex" : "none";
  }

  // Lazy load images
  loadLazyImages(wrap);
}
function buildGoalSpendData(data) {
  const goalSpendMap = {};

  data.forEach((c) => {
    c.adsets.forEach((as) => {
      const goal = as.optimization_goal || "UNKNOWN";
      goalSpendMap[goal] = (goalSpendMap[goal] || 0) + (as.spend || 0);
    });
  });

  // Chuẩn hóa sang dạng dataset Chart.js
  const labels = Object.keys(goalSpendMap);
  const values = Object.values(goalSpendMap);

  return { labels, values };
}
