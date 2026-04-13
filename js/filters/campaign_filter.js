
async function applyCampaignFilter(keyword) {
  CURRENT_CAMPAIGN_FILTER = keyword || "";

  if (typeof updateBrandDropdownUI === "function") updateBrandDropdownUI();
  if (typeof updatePerfBrandDropdownUI === "function") updatePerfBrandDropdownUI();
  if (typeof refreshGoogleAds === "function") refreshGoogleAds();

  const domContainer = document.querySelector(".dom_container");
  const isGoogleAdsView = domContainer && domContainer.classList.contains("google_ads");

  if (!window._ALL_CAMPAIGNS || !Array.isArray(window._ALL_CAMPAIGNS)) return;

  if (keyword && keyword.toUpperCase() === "RESET") {
    window._FILTERED_CAMPAIGNS = window._ALL_CAMPAIGNS;
    renderCampaignView(window._ALL_CAMPAIGNS);
    renderGoalChart(buildAllAdsForGoalChart(window._ALL_CAMPAIGNS));
    resetUIFilter();
    await loadAllDashboardCharts();
    return;
  }

  const filtered = keyword
    ? window._ALL_CAMPAIGNS.filter((c) => {
      const lowerKw = keyword.toLowerCase();
      if ((c.name || "").toLowerCase().includes(lowerKw)) return true;
      if (c.id === keyword) return true;
      const hasAdset = (c.adsets || []).some(
        (as) => (as.name || "").toLowerCase().includes(lowerKw) || as.id === keyword
      );
      if (hasAdset) return true;
      return (c.adsets || []).some((as) =>
        (as.ads || []).some((ad) => (ad.name || "").toLowerCase().includes(lowerKw) || ad.id === keyword)
      );
    })
    : window._ALL_CAMPAIGNS;

  window._FILTERED_CAMPAIGNS = filtered;
  renderCampaignView(filtered);

  if (filtered.length === 0) {
    window._FILTERED_CAMPAIGNS = [];
    if (!isGoogleAdsView) domContainer?.classList.add("is-empty");
    return;
  }

  domContainer?.classList.remove("is-empty");

  const ids = filtered.map((c) => c.id).filter(Boolean);
  await loadAllDashboardCharts(ids);

  renderGoalChart(buildAllAdsForGoalChart(filtered));
}

/** Shared helper — build the allAds array used by renderGoalChart */
function buildAllAdsForGoalChart(campaigns) {
  return campaigns.flatMap((c) =>
    c.adsets.flatMap((as) =>
      (as.ads || []).map((ad) => ({
        campaign_name: c.name,
        optimization_goal: as.optimization_goal,
        insights: { spend: ad.spend || 0 },
      }))
    )
  );
}

// ================== CẬP NHẬT TỔNG UI ==================
function updateSummaryUI(campaigns) {
  let totalSpend = 0,
    totalReach = 0,
    totalMessage = 0,
    totalLead = 0;

  if (!Array.isArray(campaigns)) return;

  campaigns.forEach((c) => {
    (c.adsets || []).forEach((as) => {
      totalSpend += +as.spend || 0;
      totalReach += +as.reach || 0;
      totalMessage += window.safeGetActionValue(as.actions, "onsite_conversion.messaging_conversation_started_7d")
                    || window.safeGetActionValue(as.actions, "messaging_conversation_started_7d");
      totalLead   += window.safeGetActionValue(as.actions, "onsite_conversion.lead_grouped")
                    || window.safeGetActionValue(as.actions, "lead");
    });
  });

  document.querySelector(
    "#spent span"
  ).textContent = `${totalSpend.toLocaleString("vi-VN")}đ`;
  document.querySelector(
    "#reach span"
  ).textContent = `${totalReach.toLocaleString("vi-VN")}`;
  document.querySelector(
    "#message span"
  ).textContent = `${totalMessage.toLocaleString("vi-VN")}`;
  document.querySelector(
    "#lead span"
  ).textContent = `${totalLead.toLocaleString("vi-VN")}`;
}

// ================== TẠO DỮ LIỆU THEO NGÀY ==================
function buildDailyDataFromCampaigns(campaigns) {
  const mapByDate = {};
  (campaigns || []).forEach((c) => {
    (c.adsets || []).forEach((as) => {
      const spend = +as.spend || 0;
      const dateKey = as.date_start || "Tổng";
      if (!mapByDate[dateKey])
        mapByDate[dateKey] = { date_start: dateKey, spend: 0 };
      mapByDate[dateKey].spend += spend;
    });
  });
  return Object.values(mapByDate);
}

// ================== Tổng hợp dữ liệu ====================
function calcTotal(data, key) {
  if (!data) return 0;
  return Object.values(data).reduce((sum, d) => sum + (d[key] || 0), 0);
}
function calcTotalAction(data, type) {
  if (!data) return 0;
  return Object.values(data).reduce(
    (sum, d) => {
      const actionsArr = d.actions;
      // ⭐ Hỗ trợ 2 format:
      // 1. Array: [{action_type, value}, ...] — từ adset raw data
      // 2. Object: {action_type: value, ...} — từ processedByDate trong showAdDetail
      if (Array.isArray(actionsArr)) {
        const entry = actionsArr.find(a => a.action_type === type);
        return sum + (entry ? +entry.value || 0 : 0);
      } else if (actionsArr && typeof actionsArr === "object") {
        return sum + (+actionsArr[type] || 0);
      }
      return sum;
    },
    0
  );
}

// ================== Render Targeting ==================
function renderTargetingToDOM(targeting) {
  const targetBox = document.getElementById("detail_targeting");
  if (!targetBox || !targeting) return;

  // === AGE RANGE ===
  let min = 18,
    max = 65;
  if (Array.isArray(targeting.age_range) && targeting.age_range.length === 2) {
    [min, max] = targeting.age_range;
  } else {
    min = targeting.age_min || 18;
    max = targeting.age_max || 65;
  }

  const ageDivs = targetBox.querySelectorAll(".detail_gender .age_text p");
  if (ageDivs.length >= 2) {
    ageDivs[0].textContent = min;
    ageDivs[1].textContent = max;
  }

  const ageBar = targetBox.querySelector(".detail_age_bar");
  if (ageBar) {
    const fullMin = 18,
      fullMax = 65;
    const leftPercent = ((min - fullMin) / (fullMax - fullMin)) * 100;
    const widthPercent = ((max - min) / (fullMax - fullMin)) * 100;
    let rangeEl = ageBar.querySelector(".age_range");
    if (!rangeEl) {
      rangeEl = document.createElement("div");
      rangeEl.className = "age_range";
      ageBar.appendChild(rangeEl);
    }
    rangeEl.style.left = `${leftPercent}%`;
    rangeEl.style.width = `${widthPercent}%`;
  }

  // === GENDER ===
  const genderWrap = targetBox.querySelector(".detail_gender_bar");
  if (genderWrap) {
    const genders = Array.isArray(targeting.genders) ? targeting.genders : [];
    const validGenders = genders
      .map(String)
      .filter((g) => ["male", "female", "other"].includes(g.toLowerCase()));
    genderWrap.innerHTML = validGenders.length
      ? validGenders.map((g) => `<p>${g}</p>`).join("")
      : `<p>Male</p><p>Female</p><p>Other</p>`;
  }

  // === LOCATIONS ===
  const locationWrap = targetBox.querySelector(".detail_location_bar");
  if (locationWrap) {
    let locations = [];
    const { geo_locations } = targeting || {};

    if (geo_locations?.cities)
      locations = geo_locations.cities.map(
        (c) => `${c.name} (${c.radius}${c.distance_unit || "km"})`
      );

    if (geo_locations?.regions)
      locations = locations.concat(geo_locations.regions.map((r) => r.name));

    if (geo_locations?.custom_locations)
      locations = locations.concat(
        geo_locations.custom_locations.map(
          (r) => `${r.name} (${r.radius}${r.distance_unit || "km"})`
        )
      );

    if (geo_locations?.places)
      locations = locations.concat(
        geo_locations.places.map(
          (p) => `${p.name} (${p.radius}${p.distance_unit || "km"})`
        )
      );

    if (geo_locations?.countries)
      locations = locations.concat(geo_locations.countries);

    locationWrap.innerHTML = locations.length
      ? locations
        .slice(0, 5)
        .map(
          (c) =>
            `<p><i class="fa-solid fa-location-crosshairs"></i><span>${c}</span></p>`
        )
        .join("")
      : `<p><i class="fa-solid fa-location-crosshairs"></i><span>Việt Nam</span></p>`;
  }

  // === FLEXIBLE SPEC (Interests / Education / etc.) ===
  const freqWrap = targetBox.querySelector(".frequency_tag");
  if (freqWrap) {
    const tags = [];
    const flex = targeting.flexible_spec || [];

    flex.forEach((fs) => {
      for (const [key, arr] of Object.entries(fs)) {
        if (!Array.isArray(arr)) continue;
        arr.forEach((item) => {
          const name = item?.name || item;
          const cleanKey = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          tags.push(`${name} (${cleanKey})`);
        });
      }
    });

    freqWrap.innerHTML = tags.length
      ? tags
        .map(
          (t) =>
            `<p class="freq_tag_item"><span class="tag_dot"></span><span class="tag_name">${t}</span></p>`
        )
        .join("")
      : `<p class="freq_tag_item"><span class="tag_dot"></span><span class="tag_name">Advantage targeting</span></p>`;
  }

  // === CUSTOM & LOOKALIKE AUDIENCES ===
  const audienceWrap = targetBox.querySelector(".detail_audience");
  if (audienceWrap) {
    const audiences = [];

    if (Array.isArray(targeting.custom_audiences)) {
      targeting.custom_audiences.forEach((a) =>
        audiences.push(`${a.name || a.id} (Custom Audience)`)
      );
    }

    if (Array.isArray(targeting.lookalike_spec)) {
      targeting.lookalike_spec.forEach((a) =>
        audiences.push(`${a.name || a.origin || a.id} (Lookalike Audience)`)
      );
    }

    audienceWrap.innerHTML = audiences.length
      ? audiences
        .map(
          (t) =>
            `<p class="freq_tag_item"><span class="tag_dot"></span><span class="tag_name">${t}</span></p>`
        )
        .join("")
      : `<p><span>No audience selected</span></p>`;
  }

  // === EXCLUDED AUDIENCES ===
  const excludeWrap = targetBox.querySelector(".detail_exclude");
  if (excludeWrap) {
    const excluded = [];
    const {
      excluded_custom_audiences,
      excluded_interests,
      excluded_behaviors,
      excluded_geo_locations,
    } = targeting || {};

    if (Array.isArray(excluded_custom_audiences))
      excluded_custom_audiences.forEach((e) =>
        excluded.push(`${e.name || e.id} (Custom Audience)`)
      );

    if (Array.isArray(excluded_interests))
      excluded_interests.forEach((e) =>
        excluded.push(`${e.name || e.id} (Interest)`)
      );

    if (Array.isArray(excluded_behaviors))
      excluded_behaviors.forEach((e) =>
        excluded.push(`${e.name || e.id} (Behavior)`)
      );

    if (excluded_geo_locations?.countries)
      excluded_geo_locations.countries.forEach((c) =>
        excluded.push(`${c} (Excluded Country)`)
      );

    excludeWrap.innerHTML = excluded.length
      ? excluded
        .map(
          (t) =>
            `<p class="freq_tag_item"><span class="tag_dot"></span><span class="tag_name">${t}</span></p>`
        )
        .join("")
      : `<p><span>No excluded audience</span></p>`;
  }

  // === LANGUAGES (Locales) ===
  const localeWrap = targetBox.querySelector(".detail_locale");
  if (localeWrap && Array.isArray(targeting.locales)) {
    const localeMap = {
      1: "English (US)",
      2: "Spanish",
      3: "French",
      6: "Vietnamese",
    };
    const langs = targeting.locales.map(
      (l) => localeMap[l] || `Locale ID ${l}`
    );
    localeWrap.innerHTML = langs
      .map(
        (l) => `<p><i class="fa-solid fa-language"></i><span>${l}</span></p>`
      )
      .join("");
  }

  // === PLACEMENT ===
  const placementWrap = targetBox.querySelector(".detail_placement");
  if (placementWrap) {
    const { publisher_platforms, facebook_positions, instagram_positions } =
      targeting || {};
    const platforms = [
      ...(publisher_platforms || []),
      ...(facebook_positions || []),
      ...(instagram_positions || []),
    ];
    placementWrap.innerHTML = platforms.length
      ? platforms
        .map(
          (p) =>
            `<p><i class="fa-solid fa-bullhorn"></i><span>${p}</span></p>`
        )
        .join("")
      : `<p><i class="fa-solid fa-bullhorn"></i><span>Automatic placement</span></p>`;
  }

  // === ADVANTAGE AUDIENCE ===
  const optimizeWrap = targetBox.querySelector(".detail_optimize");
  if (optimizeWrap) {
    const adv =
      targeting.targeting_automation?.advantage_audience === 0
        ? "No Advantage Audience"
        : "Advantage Audience";
    optimizeWrap.textContent = adv;
  }

  // === DEVICE PLATFORMS ===
  const deviceWrap = targetBox.querySelector(".detail_device");
  if (deviceWrap) {
    const deviceIconMap = {
      mobile: "fa-solid fa-mobile-screen-button",
      desktop: "fa-solid fa-desktop",
    };
    const devices = Array.isArray(targeting.device_platforms) ? targeting.device_platforms : [];
    deviceWrap.innerHTML = devices.length
      ? devices.map((d) => {
        const icon = deviceIconMap[d.toLowerCase()] || "fa-solid fa-display";
        return `<p><i class="${icon}"></i> ${d.charAt(0).toUpperCase() + d.slice(1)}</p>`;
      }).join("")
      : `<p><i class="fa-solid fa-display"></i> All Devices</p>`;
  }

  // === BRAND SAFETY EXCLUDED ===
  const brandSafetyWrap = targetBox.querySelector(".detail_brand_safety");
  if (brandSafetyWrap) {
    const excluded = Array.isArray(targeting.excluded_brand_safety_content_types)
      ? targeting.excluded_brand_safety_content_types
      : [];
    const labelMap = {
      INSTREAM_LIVE: "Live Stream",
      INSTREAM_VIDEO_MATURE: "Mature Videos",
      FACEBOOK_LIVE: "Facebook Live",
      INSTAGRAM_LIVE: "Instagram Live",
    };
    brandSafetyWrap.innerHTML = excluded.length
      ? excluded.map((t) => {
        const label = labelMap[t] || t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        return `<p><i class="fa-solid fa-shield-halved" style="color:#ef4444"></i> ${label}</p>`;
      }).join("")
      : `<p style="opacity:0.5"><i class="fa-solid fa-shield-check" style="color:#22c55e"></i> None excluded</p>`;
  }
}

// ================== Render Delivery Estimate (Audience Size Bar) ==================
function renderDeliveryEstimate(data) {
  const wrap = document.getElementById("detail_delivery_estimate");
  if (!wrap) return;

  const lower = data?.estimate_mau_lower_bound;
  const upper = data?.estimate_mau_upper_bound;

  // --- Xác định vị trí "breadth" trên thanh Narrow → Broad ---
  // Dùng log10 scale: <100K=Narrow, 100K-1M=So So, >1M=Broad
  let breadthPercent = 50; // default giữa
  let label = "Medium";
  let labelColor = "#f59e0b";

  if (lower != null && upper != null) {
    const mid = (lower + upper) / 2;
    if (mid < 50000) {
      breadthPercent = 10;
      label = "Very Narrow";
      labelColor = "#ef4444";
    } else if (mid < 200000) {
      breadthPercent = 28;
      label = "Narrow";
      labelColor = "#f97316";
    } else if (mid < 1000000) {
      breadthPercent = 50;
      label = "Balanced";
      labelColor = "#f59e0b";
    } else if (mid < 10000000) {
      breadthPercent = 72;
      label = "Broad";
      labelColor = "#22c55e";
    } else {
      breadthPercent = 92;
      label = "Very Broad";
      labelColor = "#16a34a";
    }
  }

  // --- Format số lớn ---
  const fmtNum = (n) => {
    if (!n && n !== 0) return "?";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
    return n.toLocaleString();
  };

  const sizeText = (lower != null && upper != null)
    ? `${fmtNum(lower)} – ${fmtNum(upper)}`
    : "Unavailable";

  wrap.innerHTML = `
    <div style="margin-top:0.6rem;">
      <!-- 3-segment bar -->
      <div style="position:relative; height:0.9rem; border-radius:999px; overflow:hidden; display:flex; gap:2px; margin-bottom:0.5rem;">
        <div style="flex:1; background:#fca5a5; border-radius:999px 0 0 999px;"></div>
        <div style="flex:1; background:#fde68a;"></div>
        <div style="flex:1; background:#86efac; border-radius:0 999px 999px 0;"></div>
      </div>
      <!-- Marker -->
      <div style="position:relative; height:1.4rem; margin-bottom:0.4rem;">
        <div style="position:absolute; left:calc(${breadthPercent}% - 6px); top:0; width:0; height:0;
          border-left: 6px solid transparent; border-right: 6px solid transparent;
          border-bottom: 10px solid ${labelColor};"></div>
      </div>
      <!-- Labels dưới thanh -->
      <div style="display:flex; justify-content:space-between; font-size:1rem; color:#94a3b8; font-weight:500; margin-bottom:0.8rem;">
        <span>Narrow</span>
        <span style="color:${labelColor}; font-weight:700;">${label}</span>
        <span>Broad</span>
      </div>
      <!-- Audience size -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.7rem 1rem; display:flex; align-items:center; gap:0.8rem;">
        <i class="fa-solid fa-users" style="color:#64748b; font-size:1.1rem;"></i>
        <div>
          <div style="font-size:0.95rem; color:#94a3b8; font-weight:500; line-height:1;">Est. audience size</div>
          <div style="font-size:1.25rem; font-weight:700; color:#1e293b; line-height:1.4;">${sizeText}</div>
        </div>
      </div>
    </div>
  `;
}


function renderInteraction(byDate) {
  // Original was byDevice, changed to byDate as it seems more logical
  const wrap = document.querySelector(".interaction");
  if (!wrap) return;

  const metrics = [
    {
      key: "post_reaction",
      label: "Reactions",
      icon: "fa-solid fa-heart",
    },
    {
      key: "comment",
      label: "Comments",
      icon: "fa-solid fa-comment",
    },
    {
      key: "post",
      label: "Shares",
      icon: "fa-solid fa-share-nodes",
    },

    {
      key: "onsite_conversion.post_save",
      label: "Saves",
      icon: "fa-solid fa-bookmark",
    },
    {
      key: "page_engagement",
      label: "Page Engaged",
      icon: "fa-solid fa-bolt",
    },
    {
      key: "link_click",
      label: "Link Clicks",
      icon: "fa-solid fa-link",
    },
    {
      key: "video_view",
      label: "Media Views",
      icon: "fa-solid fa-video",
    },
    {
      key: "like",
      label: "Follows",
      icon: "fa-solid fa-user-plus",
    },
    {
      key: "onsite_conversion.messaging_conversation_started_7d",
      label: "Messages",
      icon: "fa-solid fa-message",
    },
  ];

  // Tính tổng từng hành động
  const totals = {};
  metrics.forEach((m) => {
    totals[m.key] = calcTotalAction(byDate, m.key);
  });

  // Render UI
  const html = `
      <div class="interaction_list">
        ${metrics
      .map(
        (m) => `
            <div class="dom_interaction_note">
                  <span class="metric_label">${m.label}</span>
              <span class="metric_value">${formatNumber(
          totals[m.key] || 0
        )}</span>
                </div>
          `
      )
      .join("")}
    </div>
  `;

  wrap.innerHTML = html;

  // Update video funnel nếu có adset data
  if (window.__lastAdsetObj) renderVideoFunnel(window.__lastAdsetObj);
}

/**
 * Render CSS-only Video Funnel chart (không dùng Chart.js)
 * Dững dữ liệu từ adsetObj.actions (giống Full Actions Detail)
 * Pipeline: 3s View → 25% → 50% → 75% → 95% → ThruPlay → p100
 */
function renderVideoFunnel(adsetObj) {
  const content = document.getElementById("video_funnel_content");
  if (!content) return;

  // actions[] array (action_type lookup)
  const actionsArr = Array.isArray(adsetObj?.actions) ? adsetObj.actions : [];

  const getVal = (key) => {
    // Nguồn 1: actions[] array (giống Full Actions Detail actionsSource loop)
    const entry = actionsArr.find(a => a.action_type === key);
    if (entry) return parseInt(entry.value || 0);
    // Nguồn 2: top-level field trên adsetObj (giống Full Actions Detail vfs fallback)
    const topLevel = adsetObj?.[key];
    if (topLevel) {
      return parseInt(Array.isArray(topLevel) ? (topLevel[0]?.value || 0) : (topLevel?.value || topLevel) || 0);
    }
    return 0;
  };

  // Các bước của funnel video
  const steps = [
    { key: "video_view", label: "Video View (3s)", color: "gold" },
    { key: "video_p25_watched_actions", label: "Video 25%", color: "gold" },
    { key: "video_p50_watched_actions", label: "Video 50%", color: "amber" },
    { key: "video_p75_watched_actions", label: "Video 75%", color: "amber" },
    { key: "video_p95_watched_actions", label: "Video 95%", color: "orange" },
    { key: "video_thruplay_watched_actions", label: "ThruPlay", color: "orange" },
    { key: "video_p100_watched_actions", label: "Video 100%", color: "gray" },
  ];

  const values = steps.map(s => getVal(s.key));
  const maxVal = Math.max(...values) || 1;
  const hasVideo = values.some(v => v > 0);
  window._videoFunnelHasData = hasVideo;

  // ✅ Hiện / ẩn nút + tự động switch sang Video Funnel nếu có data
  const toggleBtn = document.getElementById("video_funnel_toggle_btn");
  const funnelPanel = document.getElementById("video_funnel_panel");
  if (toggleBtn) toggleBtn.style.display = hasVideo ? "inline-flex" : "none";
  if (funnelPanel) {
    if (hasVideo) funnelPanel.classList.add("active");
    else funnelPanel.classList.remove("active");
  }

  if (!hasVideo) {
    content.innerHTML = `<p style="text-align:center;padding:2rem;color:#94a3b8;font-size:1.3rem;">
      <i class="fa-solid fa-circle-info"></i> Không có dữ liệu video.
    </p>`;
    return;
  }

  // ✅ Gắn value vào step và sort giảm dần theo giá trị
  const stepsWithVal = steps
    .map((s, i) => ({ ...s, val: values[i] }))
    .filter(s => s.val > 0)
    .sort((a, b) => b.val - a.val);

  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
  const pct = (n) => maxVal > 0 ? ((n / maxVal) * 100).toFixed(1) + "%" : "–";
  const dropHtml = (cur, prev) => {
    if (!prev) return "";
    const d = ((prev - cur) / prev * 100).toFixed(0);
    return `<span class="vf_drop"><i class="fa-solid fa-arrow-down"></i> -${d}%</span>`;
  };

  let html = "";
  stepsWithVal.forEach((step, i) => {
    const val = step.val;
    const widthPct = Math.max(8, Math.round((val / maxVal) * 100));
    const retentionPct = i === 0 ? "100%" : pct(val);
    const prevVal = i > 0 ? stepsWithVal[i - 1].val : 0;
    const drop = i > 0 ? dropHtml(val, prevVal) : "";

    html += `
      ${i > 0 ? '<div class="vf_connector"></div>' : ""}
      <div class="vf_step">
        <div class="vf_meta">
          <div class="vf_name">${step.label}</div>
          ${drop}
        </div>
        <div class="vf_bar_wrap">
          <div class="vf_bar ${step.color}" style="width:${widthPct}%;">
            <span>${retentionPct}</span>
          </div>
        </div>
        <div class="vf_count">${fmt(val)}</div>
      </div>`;
  });

  content.innerHTML = html;
}

/**
 * Toggle Video Funnel panel (giống pattern Spent Platform / Details)
 * Nếu không có data video → show toast
 */
window.toggleVideoFunnel = function () {
  const panel = document.getElementById("video_funnel_panel");
  if (!panel) return;

  // Chỉ show toast khi đã load xong API mà vẫn không có video
  if (window._videoFunnelLoaded && !window._videoFunnelHasData) {
    const existing = document.getElementById("_vf_toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "_vf_toast";
    toast.style.cssText = `
      position: fixed; bottom: 3rem; left: 50%; transform: translateX(-50%);
      background: #1e293b; color: #fff; padding: 1.2rem 2.4rem;
      border-radius: 12px; font-size: 1.3rem; font-weight: 600;
      z-index: 99999; display: flex; align-items: center; gap: 1rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    `;
    toast.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#f87171;"></i> Không có định dạng video.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    return;
  }

  // Mở panel luôn (nếu chưa load xong thì hiện nội dung hiện tại)
  panel.classList.toggle("active");
};

/**
 * Render all available actions in a scrollable list from the item's existing data
 */
let lastFullActionsData = null; // Store data for filtering

function renderFullActionsDetail(manualTotals, filterQuery = "") {
  if (!manualTotals && !lastFullActionsData) return;
  if (manualTotals) lastFullActionsData = manualTotals;
  else manualTotals = lastFullActionsData;

  const listWrap = document.getElementById("detail_full_actions_list");
  if (!listWrap) return;

  const query = filterQuery.toLowerCase().trim();

  // 1. Grouping rules (Deduplication)
  const aliasGroupMap = {
    // Engagement
    "page_engagement": "Engagement",
    "post_engagement": "Engagement",
    "post_interaction_gross": "Engagement",
    // Messages
    "onsite_conversion.messaging_conversation_started_7d": "Messenger Conversations",
    "messaging_conversation_started_7d": "Messenger Conversations",
    "onsite_conversion.total_messaging_connection": "Messenger Conversations",
    "total_messaging_connection": "Messenger Conversations",
    // Leads (Normalizing multiple Meta/Pixel aliases)
    "onsite_conversion.lead_grouped": "Leads",
    "lead_grouped": "Leads",
    "lead": "Leads",
    "Leads": "Leads",
    "onsite_web_lead": "Leads",
    "offsite_conversion.fb_pixel_lead": "Leads",
    "offsite_conversion.fb_pixel_complete_registration": "Leads",
    "offsite_conversion.fb_pixel_search": "Leads",
    "offsite_conversion.fb_pixel_view_content": "Leads",
    "complete_registration": "Leads",
    // Saves
    "onsite_conversion.post_save": "Saves",
    "post_save": "Saves",
    "onsite_conversion.post_net_save": "Saves",
    // Follows
    "page_like": "Follows",
    "onsite_conversion.page_like": "Follows",
    "instagram_profile_follow": "Follows",
    "post_reaction": "Reactions/Likes",
    "post_net_like": "Reactions/Likes",
    // Video Metrics
    "video_view": "Video View (3s)",
    "video_play": "Video Plays",
    "video_play_actions": "Video Plays",
    "video_thruplay_watched_actions": "ThruPlays",
    "video_p25_watched_actions": "Video 25%",
    "video_p50_watched_actions": "Video 50%",
    "video_p75_watched_actions": "Video 75%",
    "video_p95_watched_actions": "Video 95%",
    "video_p100_watched_actions": "Video 100%"
  };

  const aggregated = {};
  let totalSpend = manualTotals.spend || 0;
  let totalReach = manualTotals.reach || 0;
  let totalImp = manualTotals.impressions || 0;
  let totalClicks = 0;

  // 1. Aggregating from an item's data (campaign/adset/ad)
  const actionsSource = manualTotals.actions || [];
  if (Array.isArray(actionsSource)) {
    actionsSource.forEach(a => {
      const type = a.action_type;
      const val = parseInt(a.value || 0);
      if (type === 'link_click') totalClicks += val;

      let label = aliasGroupMap[type] || null;

      // O(1) lookup via pre-built reverse-map
      if (!label) label = getActionTypeLabel(type);

      // Final prettify fallback
      if (!label) {
        label = type.replace("onsite_conversion.", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }

      // Use Max for engagement/plays to avoid duplicate counting
      if (label === "Engagement" || label === "Video Plays" || label === "Video View (3s)") {
        aggregated[label] = Math.max(aggregated[label] || 0, val);
      } else {
        aggregated[label] = (aggregated[label] || 0) + val;
      }
    });
  }

  // Direct video performance fields as fallback
  const vfs = {
    "video_play_actions": "Video Plays",
    "video_thruplay_watched_actions": "ThruPlays",
    "video_p25_watched_actions": "Video 25%",
    "video_p50_watched_actions": "Video 50%",
    "video_p75_watched_actions": "Video 75%",
    "video_p95_watched_actions": "Video 95%",
    "video_p100_watched_actions": "Video 100%"
  };

  Object.entries(vfs).forEach(([vf, label]) => {
    if (!aggregated[label]) {
      const data = manualTotals[vf];
      if (data) {
        const val = parseInt(Array.isArray(data) ? (data[0]?.value || 0) : (data?.value || data) || 0);
        aggregated[label] = val;
      }
    }
  });

  // --- ⭐ Include Custom Metrics from Registry/Memory ---
  if (window.CUSTOM_METRICS) {
    window.CUSTOM_METRICS.forEach(cm => {
      const val = window.evaluateFormula ? window.evaluateFormula(manualTotals, cm.formula) : 0;
      if (val > 0) {
        aggregated[cm.label] = (aggregated[cm.label] || 0) + val;
      }
    });
  }

  // 2. Common logic for both branches
  const coreMetrics = [
    { label: "Cost Per Click (CPC)", val: totalClicks ? (totalSpend / totalClicks) : 0, key: "cpc", icon: "fa-arrow-pointer", format: formatMoney },
    { label: "Click-Through Rate (CTR)", val: totalImp ? (totalClicks / totalImp) * 100 : 0, key: "ctr", icon: "fa-percent", format: v => v.toFixed(2) + '%' }
  ];

  const METRIC_DESCRIPTIONS = {
    "Cost Per Click (CPC)": "Average cost for each click on your ad.",
    "Click-Through Rate (CTR)": "Percentage of times people saw your ad and performed a click.",
    "Engagement": "Total number of actions people take involving your ads (views, comments, shares, etc).",
    "Messenger Conversations": "Number of times people started a chat with your business after seeing the ad.",
    "Leads": "Number of people who submitted a lead form or completed a registration.",
    "Saves": "Number of times people saved your ad for later.",
    "Follows": "Total number of Page Likes or Profile Follows generated.",
    "Reactions/Likes": "Total number of reactions (Like, Love, Haha, Wow...) on the ad post.",
    "Video View (3s)": "Number of times your video was played for at least 3 seconds, or for nearly its total length if it's shorter than 3 seconds.",
    "Video Plays": "Number of times your video started playing.",
    "ThruPlays": "Number of times your video was played for at least 15 seconds (or completion).",
    "Video 25%": "Video watched to 25% of its total duration.",
    "Video 50%": "Video watched to 50% of its total video duration.",
    "Video 75%": "Video watched to 75% of its total video duration.",
    "Video 95%": "Video watched to 95% of its total video duration.",
    "Video 100%": "Video watched to full completion (100%)."
  };

  // Helper for filtering
  const matchesQuery = (label) => !query || label.toLowerCase().includes(query);

  const actionEntries = Object.entries(aggregated)
    .filter(([label, v]) => v > 0 && matchesQuery(label))
    .sort((a, b) => b[1] - a[1]);

  const filteredCore = coreMetrics.filter(m => matchesQuery(m.label));

  if (!actionEntries.length && !filteredCore.length) {
    listWrap.innerHTML = `<div style='grid-column: 1/-1; padding: 4rem 2rem; text-align: center; opacity: 0.5; color: #718096; font-size: 1.3rem;'>
      <i class="fa-solid fa-magnifying-glass" style="display: block; font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.2;"></i>
      Không tìm thấy chỉ số nào khớp với "${query}"
    </div>`;
    return;
  }

  // ⭐ TỐI ƯU: Xây dựng reverse lookup map 1 lần, tránh iterate aliasGroupMap mỗi action entry
  const labelToAliasKey = Object.create(null);
  for (const [key, grpLabel] of Object.entries(aliasGroupMap)) {
    if (!labelToAliasKey[grpLabel]) labelToAliasKey[grpLabel] = key;
  }
  const registryLabelToKey = Object.create(null);
  for (const k in METRIC_REGISTRY) {
    const m = METRIC_REGISTRY[k];
    if (m.label && !registryLabelToKey[m.label]) registryLabelToKey[m.label] = m.action_type || k;
  }

  // ===== NHÓM CÁC METRICS =====
  const GROUP_DEFS = [
    {
      key: "performance", label: "Performance", icon: "fa-gauge-high",
      match: (label) => ["Cost Per Click (CPC)", "Click-Through Rate (CTR)", "Engagement", "Video Plays"].includes(label)
    },
    {
      key: "video", label: "Video", icon: "fa-film",
      match: (label) => label.includes("Video") || label.includes("ThruPlay")
    },
    {
      key: "social", label: "Social Interaction", icon: "fa-thumbs-up",
      match: (label) => ["Reactions/Likes", "Saves", "Shares", "Comments", "Post Net Like", "Link Clicks", "Follows", "Media Views"].some(k => label.includes(k))
    },
    {
      key: "messaging", label: "Messaging", icon: "fa-comment-dots",
      match: (label) => label.includes("Message") || label.includes("Messenger") || label.includes("Messaging")
    },
    {
      key: "leads", label: "Leads & Conversion", icon: "fa-bullseye",
      match: (label) => label.includes("Lead") || label.includes("Registration") || label.includes("Pixel") || label.includes("Offsite") || label.includes("Conversion")
    },
  ];

  const renderCard = (label, valStr, icon, titleAttr, isMoney = false, formatFn = null) => {
    const displayVal = formatFn ? formatFn(parseFloat(valStr)) : formatNumber(parseInt(valStr));
    return `
      <div class="action_detail_card" title="${titleAttr}">
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <div class="icon_box">
            <i class="fa-solid ${icon}" style="font-size: 1.3rem; color: #475569;"></i>
          </div>
          <span class="label_text">${label}</span>
        </div>
        <div class="value_text">${displayVal}</div>
      </div>`;
  };

  const renderCoreCard = (m) => `
    <div class="action_detail_card core" title="${m.key}">
      <div style="display: flex; align-items: center; gap: 0.8rem;">
        <div class="icon_box">
          <i class="fa-solid ${m.icon}" style="font-size: 1.3rem; color: var(--mainClr);"></i>
        </div>
        <span class="label_text">${m.label}</span>
      </div>
      <div class="value_text">${m.format(m.val)}</div>
    </div>`;

  const renderSectionHeader = (group) => `
    <div class="fad_section_header" style="grid-column:1/-1;">
      <i class="fa-solid ${group.icon}"></i> ${group.label}
    </div>`;

  // Phân loại action entries vào từng nhóm
  const grouped = {};
  GROUP_DEFS.forEach(g => grouped[g.key] = []);
  const others = [];

  actionEntries.forEach(([label, val]) => {
    const grp = GROUP_DEFS.find(g => g.match(label));
    if (grp) grouped[grp.key].push([label, val]);
    else others.push([label, val]);
  });

  // Core metrics luôn vào Performance
  const coreHtml = filteredCore.map(renderCoreCard).join("");

  const getIcon = (label) => {
    if (label.includes("Lead") || label.includes("Conversion") || label.includes("Offsite")) return "fa-bullseye";
    if (label.includes("Message") || label.includes("Messenger") || label.includes("Messaging")) return "fa-comment-dots";
    if (label.includes("Save")) return "fa-bookmark";
    if (label.includes("Engagement")) return "fa-fingerprint";
    if (label.includes("Video") || label.includes("ThruPlay") || label.includes("View")) return "fa-play-circle";
    if (label.includes("Click")) return "fa-mouse-pointer";
    if (label.includes("Reaction") || label.includes("Like")) return "fa-heart";
    if (label.includes("Share")) return "fa-share-nodes";
    if (label.includes("Comment")) return "fa-comment";
    if (label.includes("Follow")) return "fa-user-plus";
    return "fa-chart-simple";
  };

  let html = "";

  GROUP_DEFS.forEach(grp => {
    const items = grouped[grp.key];
    const isCoreGroup = grp.key === "performance";
    if (!items.length && (isCoreGroup ? !filteredCore.length : true)) return;

    html += renderSectionHeader(grp);
    if (isCoreGroup) html += coreHtml;
    items.forEach(([label, val]) => {
      const technicalKey = labelToAliasKey[label] || registryLabelToKey[label] || label.toLowerCase().replace(/\s+/g, "_");
      html += renderCard(label, val, getIcon(label), technicalKey);
    });
  });

  if (others.length) {
    html += `<div class="fad_section_header" style="grid-column:1/-1;"><i class="fa-solid fa-ellipsis"></i> Other</div>`;
    others.forEach(([label, val]) => {
      const technicalKey = labelToAliasKey[label] || registryLabelToKey[label] || label.toLowerCase().replace(/\s+/g, "_");
      html += renderCard(label, val, getIcon(label), technicalKey);
    });
  }

  listWrap.innerHTML = html;
}

