
// ── 📊 Detailed Performance Report & Comparison ────────────────────

let perfCalendarMonth = new Date().getMonth();
let perfCalendarYear = new Date().getFullYear();
let perfCompareMode = 'auto'; // 'auto', 'last_year', 'custom'
let perfSelectedStartDate = null;
let perfSelectedEndDate = null;
let perfCustomCompareDates = null; // Lưu trữ kỳ so sánh đã chọn để dùng cho tooltip Dashboard

const fmtPerfDate = (d) => {
  if (!d) return "??/??";
  const p = d.split("-");
  return `${p[2]}/${p[1]}`;
};

window.openPerformanceDetail = function () {
  const modal = document.getElementById("performance_modal");
  if (!modal) return;

  modal.style.display = "flex";
  // Thêm class active để chạy animation popup
  setTimeout(() => modal.classList.add("active"), 10);
  document.body.style.overflow = "hidden";

  // Chỉ reset state nếu chưa có kỳ so sánh nào được chọn (hoặc muốn reset mới hoàn toàn)
  // 🚩 Giữ lại kỳ so sánh đang active để user không phải chọn lại
  if (!perfSelectedStartDate && perfCompareMode === 'auto') {
    perfCompareMode = 'auto';
    perfSelectedStartDate = null;
    perfSelectedEndDate = null;
  }

  const pnlReset = document.getElementById("perf_date_picker_panel");
  if (pnlReset) pnlReset.style.display = "none";

  const labelCurrent = document.getElementById("perf_current_date_range");
  if (labelCurrent) labelCurrent.textContent = `${fmtPerfDate(startDate)} - ${fmtPerfDate(endDate)}`;

  // Cập nhật text label cho kỳ so sánh hiện tại
  const compareLabel = document.getElementById("perf_compare_label");
  if (compareLabel) {
    if (perfCompareMode === 'auto') compareLabel.textContent = "Tự động (Kỳ trước)";
    else if (perfCompareMode === 'last_year') compareLabel.textContent = "Cùng kỳ năm ngoái";
    else if (perfCompareMode === 'custom') {
      const start = fmtPerfDate(perfSelectedStartDate);
      const end = perfSelectedEndDate ? fmtPerfDate(perfSelectedEndDate) : "...";
      compareLabel.textContent = `Tùy chỉnh (${start} - ${end})`;
    }
  }

  // Active đúng nút trong list
  const modeList = document.querySelector(".perf_compare_modes");
  if (modeList) {
    const lis = modeList.querySelectorAll("li");
    lis.forEach(li => {
      li.classList.toggle("active", li.getAttribute("onclick")?.includes(`'${perfCompareMode}'`));
    });
  }
  updatePerfBrandDropdownUI();
  renderPerformanceTable();
};

window.togglePerfDatePicker = function () {
  const panel = document.getElementById("perf_date_picker_panel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "flex" : "none";
  if (panel.style.display === "flex") {
    renderPerfCalendar();
  }
};

window.setPerfCompareType = function (type, el) {
  perfCompareMode = type;
  const lis = el.parentElement.querySelectorAll("li");
  lis.forEach(li => li.classList.remove("active"));
  el.classList.add("active");

  if (type === 'auto') {
    perfSelectedStartDate = null;
    perfSelectedEndDate = null;
    document.getElementById("perf_compare_label").textContent = "Tự động (Kỳ trước)";
    togglePerfDatePicker();
    refreshPerformanceComparison();
  } else if (type === 'last_year') {
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    s.setFullYear(s.getFullYear() - 1);
    e.setFullYear(e.getFullYear() - 1);
    perfSelectedStartDate = s.toISOString().slice(0, 10);
    perfSelectedEndDate = e.toISOString().slice(0, 10);
    document.getElementById("perf_compare_label").textContent = "Cùng kỳ năm ngoái";
    togglePerfDatePicker();
    refreshPerformanceComparison();
  }
};

window.renderPerfCalendar = function () {
  const container = document.getElementById("perf_calendar");
  if (!container) return;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstDay = new Date(perfCalendarYear, perfCalendarMonth, 1).getDay();
  const daysInMonth = new Date(perfCalendarYear, perfCalendarMonth + 1, 0).getDate();
  let html = `
      <div class="calendar_nav">
        <button onclick="changePerfMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <span>${monthNames[perfCalendarMonth]} ${perfCalendarYear}</span>
        <button onclick="changePerfMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="calendar_grid">
        <div class="calendar_day_name">S</div><div class="calendar_day_name">M</div><div class="calendar_day_name">T</div>
        <div class="calendar_day_name">W</div><div class="calendar_day_name">T</div><div class="calendar_day_name">F</div>
        <div class="calendar_day_name">S</div>
   `;
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar_day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${perfCalendarYear}-${String(perfCalendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let cls = "calendar_day";
    if (perfSelectedStartDate && dateStr === perfSelectedStartDate) cls += " selected start";
    if (perfSelectedEndDate && dateStr === perfSelectedEndDate) cls += " selected end";
    if (perfSelectedStartDate && perfSelectedEndDate && dateStr > perfSelectedStartDate && dateStr < perfSelectedEndDate) {
      cls += " in_range";
    }
    html += `<div class="${cls}" onclick="selectPerfDate('${dateStr}')">${d}</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
};

window.changePerfMonth = (dir) => {
  perfCalendarMonth += dir;
  if (perfCalendarMonth < 0) { perfCalendarMonth = 11; perfCalendarYear--; }
  else if (perfCalendarMonth > 11) { perfCalendarMonth = 0; perfCalendarYear++; }
  renderPerfCalendar();
};

window.selectPerfDate = (dateStr) => {
  if (!perfSelectedStartDate || (perfSelectedStartDate && perfSelectedEndDate)) {
    perfSelectedStartDate = dateStr;
    perfSelectedEndDate = null;
  } else {
    if (dateStr < perfSelectedStartDate) {
      perfSelectedEndDate = perfSelectedStartDate;
      perfSelectedStartDate = dateStr;
    } else {
      perfSelectedEndDate = dateStr;
    }
  }

  perfCompareMode = 'custom';
  const sInp = document.getElementById("perf_start_date_input");
  const eInp = document.getElementById("perf_end_date_input");
  if (sInp) sInp.value = perfSelectedStartDate || "";
  if (eInp) eInp.value = perfSelectedEndDate || "";

  renderPerfCalendar();
};

window.applyPerfCompareDate = function () {
  if (perfCompareMode === 'custom' && (!perfSelectedStartDate || !perfSelectedEndDate)) {
    alert("Vui lòng chọn khoảng ngày so sánh (Ngày bắt đầu và kết thúc).");
    return;
  }
  togglePerfDatePicker();
  refreshPerformanceComparison();
};

window.closePerformanceDetail = function () {
  const modal = document.getElementById("performance_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
  document.body.style.overflow = "auto";
};

window.refreshPerformanceComparison = async function () {
  const loading = document.querySelector(".perf_loading");
  const content = document.getElementById("performance_detail_content");

  if (!perfSelectedStartDate) {
    document.getElementById("perf_compare_label").textContent = "Tự động (Kỳ trước)";
    renderPerformanceTable();
    return;
  }

  if (loading) loading.style.display = "block";
  const table = content.querySelector(".perf_table");
  if (table) table.style.opacity = "0.5";

  try {
    let compareStart = perfSelectedStartDate;
    let compareEnd = perfSelectedEndDate;

    // Nếu chỉ có start (thường là auto/last_year), tự tính end
    if (!compareEnd) {
      const s = new Date(startDate + "T00:00:00");
      const e = new Date(endDate + "T00:00:00");
      const durationDays = Math.round((e - s) / 86400000);
      const cs = new Date(compareStart + "T00:00:00");
      const ce = new Date(cs);
      ce.setDate(ce.getDate() + durationDays);
      compareEnd = ce.toISOString().slice(0, 10);
    }

    const campaignIds = window._LAST_CAMPAIGN_IDS || [];
    const filtering = campaignIds.length
      ? `&filtering=${encodeURIComponent(JSON.stringify([{ field: "campaign.id", operator: "IN", value: campaignIds }]))}`
      : "";

    const endpoint = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions,inline_link_clicks,purchase_roas,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions${filtering}&time_range={"since":"${compareStart}","until":"${compareEnd}"}&access_token=${META_TOKEN}`;

    const resp = await fetchJSON(endpoint);
    const manualData = resp.data?.[0] || {};
    renderPerformanceTable(manualData);

    // 🚩 Lưu lại kỳ so sánh custom để dashboard dùng
    perfCustomCompareDates = { start: compareStart, end: compareEnd, data: manualData };

    // Cập nhật thẻ tóm tắt ở ngoài Dashboard
    updatePlatformSummaryUI(
      window._DASHBOARD_BATCH_RESULTS?.platformStats,
      [manualData],
      perfCustomCompareDates
    );
  } catch (err) {
    console.error("❌ Lỗi load so sánh:", err);
  } finally {
    if (loading) loading.style.display = "none";
  }
};



function renderPerformanceTable(manualCompareData = null) {
  const content = document.getElementById("performance_detail_content");
  if (!content) return;

  const results = window._DASHBOARD_BATCH_RESULTS || {};

  // Helper xử lý data insights thành metrics object
  const process = (data) => {
    const insights = Array.isArray(data) ? data[0] || {} : data || {};
    const acts = {};
    (insights.actions || []).forEach(a => acts[a.action_type] = (acts[a.action_type] || 0) + (+a.value || 0));

    const getAct = (types) => {
      let s = 0;
      const doneBase = new Set();
      types.forEach(t => {
        const base = t.startsWith("onsite_conversion.") ? t.replace("onsite_conversion.", "") : t;
        if (doneBase.has(base)) return;
        doneBase.add(base);

        const onsite = "onsite_conversion." + base;
        // Ưu tiên onsite nếu có, ko thì lấy base (ko cộng cả 2 vì Meta thường log duplicate)
        if (acts[onsite]) {
          s += acts[onsite];
        } else if (acts[base]) {
          s += acts[base];
        }
      });
      return s;
    };

    const sumArr = (arr) => {
      if (!arr) return 0;
      if (Array.isArray(arr)) {
        return arr.reduce((acc, a) => acc + (+a.value || 0), 0);
      }
      return +arr.value || 0;
    };

    const spend = +insights.spend || 0;
    const impressions = +insights.impressions || 0;
    const links = getAct(["link_click", "inline_link_clicks", "outbound_click"]) || +insights.clicks || 0;
    const message_started = getAct(["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d"]);
    const message_connection = getAct(["onsite_conversion.total_messaging_connection", "total_messaging_connection"]);
    const lead = getAct(["onsite_conversion.lead_grouped", "lead", "onsite_web_lead"]);
    const purchase = getAct(["purchase", "onsite_conversion.purchase"]);
    const roas = +insights.purchase_roas || (Array.isArray(insights.purchase_roas) ? +insights.purchase_roas[0]?.value : 0) || 0;
    const reach = +insights.reach || 0;

    return {
      spend, impressions, reach, message_started, message_connection, lead, purchase, roas,
      link_click: links,
      ctr: impressions > 0 ? (links / impressions) * 100 : 0,
      cpc: links > 0 ? spend / links : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      frequency: reach > 0 ? impressions / reach : 0,
      video_play: sumArr(insights.video_play_actions) || getAct(["video_play", "video_view"]),
      thruplay: sumArr(insights.video_thruplay_watched_actions) || getAct(["thruplay", "video_thruplay_watched_actions"]),
      video_p25: sumArr(insights.video_p25_watched_actions) || 0,
      video_p50: sumArr(insights.video_p50_watched_actions) || 0,
      video_p75: sumArr(insights.video_p75_watched_actions) || 0,
      video_p95: sumArr(insights.video_p95_watched_actions) || 0,
      video_p100: sumArr(insights.video_p100_watched_actions) || 0,
      photo_view: getAct(["photo_view"]),
      page_engagement: getAct(["page_engagement"]),
      post_engagement: getAct(["post_engagement"]),
      engagement: getAct(["post_engagement", "page_engagement", "post_interaction"]),
      reaction: getAct(["post_reaction", "reaction", "like"]),
      comment: getAct(["comment", "post_comment"]),
      share: getAct(["post", "share"]),
      follow: getAct(["page_like", "page_follow", "instagram_profile_follow", "onsite_conversion.page_like", "onsite_conversion.instagram_profile_follow", "like"]),
    };
  };

  const cur = process(results.platformStats);
  let prev = manualCompareData ? process(manualCompareData) : process(results.platformStats_previous);

  // 🚩 Nếu dashboard gọi render mà đang có kỳ custom được chọn, dùng kỳ đó luôn
  if (!manualCompareData && perfCustomCompareDates && perfCompareMode !== 'auto') {
    prev = process(perfCustomCompareDates.data);
    // Cập nhật lại Card ở Dashboard với kỳ custom đang có
    updatePlatformSummaryUI(results.platformStats, [perfCustomCompareDates.data], perfCustomCompareDates);
  } else if (!manualCompareData) {
    // Reset về Auto
    perfCustomCompareDates = null;
    updatePlatformSummaryUI(results.platformStats, results.platformStats_previous);
  }

  const rows = [
    { section: "Tổng quan tài chính" },
    { id: "spend", label: "Chi tiêu (Spent)", icon: "fa-solid fa-coins", val: cur.spend, old: prev.spend, type: "money" },
    { id: "cpm", label: "CPM (Mỗi 1000 lượt hiển thị)", icon: "fa-solid fa-gauge-high", val: cur.cpm, old: prev.cpm, type: "money" },
    { id: "cpc", label: "CPC (Mỗi lượt click)", icon: "fa-solid fa-mouse-pointer", val: cur.cpc, old: prev.cpc, type: "money" },

    { section: "Hiển thị & Tiếp cận" },
    { id: "impressions", label: "Lượt hiển thị (Impressions)", icon: "fa-solid fa-eye", val: cur.impressions, old: prev.impressions, type: "num" },
    { id: "reach", label: "Lượt tiếp cận (Reach)", icon: "fa-solid fa-street-view", val: cur.reach, old: prev.reach, type: "num" },
    { id: "frequency", label: "Tần suất (Frequency)", icon: "fa-solid fa-repeat", val: cur.frequency, old: prev.frequency, type: "float" },
    { id: "ctr", label: "Tỷ lệ click (CTR)", icon: "fa-solid fa-chart-line", val: cur.ctr, old: prev.ctr, type: "percent" },

    { section: "Kết quả mục tiêu" },
    { id: "message_started", label: "Mới nhắn tin (Started)", icon: "fa-brands fa-facebook-messenger", val: cur.message_started, old: prev.message_started, type: "num" },
    { id: "message_connection", label: "Tin nhắn kết nối (Connection)", icon: "fa-solid fa-comments", val: cur.message_connection, old: prev.message_connection, type: "num" },
    { id: "lead", label: "Khách hàng tiềm năng (Leads)", icon: "fa-solid fa-bullseye", val: cur.lead, old: prev.lead, type: "num" },
    { id: "purchase", label: "Mua hàng (Purchase)", icon: "fa-solid fa-cart-shopping", val: cur.purchase, old: prev.purchase, type: "num" },
    { id: "roas", label: "ROAS (Mua hàng)", icon: "fa-solid fa-money-bill-trend-up", val: cur.roas, old: prev.roas, type: "float" },

    { section: "Tương tác nội dung" },
    { id: "engage", label: "Tương tác bài viết", icon: "fa-solid fa-thumbs-up", val: cur.engagement, old: prev.engagement, type: "num" },
    { id: "react", label: "Cảm xúc (Reactions)", icon: "fa-solid fa-heart", val: cur.reaction, old: prev.reaction, type: "num" },
    { id: "comment", label: "Bình luận (Comments)", icon: "fa-solid fa-comment", val: cur.comment, old: prev.comment, type: "num" },
    { id: "share", label: "Chia sẻ (Shares)", icon: "fa-solid fa-share", val: cur.share, old: prev.share, type: "num" },
    { id: "follow", label: "Lượt thích Trang (Like Page)", icon: "fa-solid fa-thumbs-up", val: cur.follow, old: prev.follow, type: "num" },
    { id: "photo", label: "Xem ảnh (Photo Views)", icon: "fa-solid fa-image", val: cur.photo_view, old: prev.photo_view, type: "num" },
    { id: "link_click", label: "Link Clicks (Hành động)", icon: "fa-solid fa-link", val: cur.link_click, old: prev.link_click, type: "num" },

    { section: "Phát Video & Thử thách" },
    { id: "vplay", label: "Lượt xem Video", icon: "fa-solid fa-circle-play", val: cur.video_play, old: prev.video_play, type: "num" },
    { id: "thru", label: "ThruPlays", icon: "fa-solid fa-forward-step", val: cur.thruplay, old: prev.thruplay, type: "num" },
    { id: "video_p25", label: "Video xem 25%", icon: "fa-solid fa-hourglass-start", val: cur.video_p25, old: prev.video_p25, type: "num" },
    { id: "video_p50", label: "Video xem 50%", icon: "fa-solid fa-hourglass-half", val: cur.video_p50, old: prev.video_p50, type: "num" },
    { id: "video_p75", label: "Video xem 75%", icon: "fa-solid fa-hourglass-end", val: cur.video_p75, old: prev.video_p75, type: "num" },
    { id: "video_p95", label: "Video xem 95%", icon: "fa-solid fa-hourglass", val: cur.video_p95, old: prev.video_p95, type: "num" },
    { id: "video_p100", label: "Video xem 100%", icon: "fa-solid fa-clock", val: cur.video_p100, old: prev.video_p100, type: "num" },
  ];

  // --- 🧠 SMART INSIGHTS LOGIC ---
  const getInsight = () => {
    const calcDiff = (c, p) => (p > 0 ? ((c - p) / p) * 100 : 0);
    const spendDiff = calcDiff(cur.spend, prev.spend);

    const metricAnalysis = SUMMARY_METRICS.map(mid => {
      const c = cur[mid] || 0;
      const p = prev[mid] || 0;
      const diff = calcDiff(c, p);
      const label = METRIC_REGISTRY[mid]?.label || mid;
      return { mid, label, diff };
    });

    // Pick the "most important" result to determine overall status
    const mainResult = metricAnalysis.find(m => ["message", "lead", "link_click", "result"].includes(m.mid)) || metricAnalysis[metricAnalysis.length - 1];
    const resDiff = mainResult.diff;

    let evaluation = "";
    let evalColor = "#64748b";

    if (resDiff > spendDiff && spendDiff >= 0) {
      evaluation = "CHI PHÍ TỐI ƯU RẤT TỐT";
      evalColor = "#f59e0b"; // Golden Amber
    } else if (resDiff >= 0 && spendDiff < 0) {
      evaluation = "HIỆU QUẢ TĂNG DÙ GIẢM NGÂN SÁCH";
      evalColor = "#f59e0b"; // Golden Amber
    } else if (resDiff < spendDiff && spendDiff > 20) {
      evaluation = "CẦN TỐI ƯU LẠI QUẢNG CÁO";
      evalColor = "#f59e0b"; // Warning Orange
    } else if (resDiff < 0) {
      evaluation = "HIỆU QUẢ ĐANG GIẢM TRÚT";
      evalColor = "#f59e0b"; // Warning Orange
    } else {
      evaluation = "HIỆU QUẢ ĐANG DUY TRÌ";
      evalColor = "#f59e0b"; // Golden Amber
    }

    const getClr = (v) => v > 0 ? '#10b981' : (v < 0 ? '#ef4444' : '#64748b');

    const details = metricAnalysis.map(m => `<b>${m.label}</b> ${m.diff >= 0 ? 'tăng' : 'giảm'} <span style="color:${getClr(m.diff)}; font-weight:800;">${Math.abs(m.diff).toFixed(1)}%</span>`).join(", ");

    return `
      <span style="color:${evalColor}; font-weight:800; font-size:1.45rem;">${evaluation}</span>. 
      Ngân sách <b>${spendDiff >= 0 ? 'tăng' : 'giảm'} <span style="color:${getClr(spendDiff)}; font-weight:800;">${Math.abs(spendDiff).toFixed(1)}%</span></b>. 
      ${details}.
    `;
  };

  let html = `
    <div class="perf_insight_banner" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.6rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 1.5rem;">
      <div style="width: 4rem; height: 4rem; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <i class="fa-solid fa-wand-magic-sparkles" style="color: #ffa900; font-size: 1.8rem;"></i>
      </div>
      <div>
        <p style="margin: 0; font-size: 1.1rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Nhận xét nhanh</p>
        <p style="margin: 0.3rem 0 0; font-size: 1.4rem; color: #1e293b; font-weight: 500;">${getInsight()}</p>
      </div>
    </div>

    <table class="perf_table">
      <thead>
        <tr>
          <th style="width: 30%">Chỉ số (Metrics)</th>
          <th style="width: 25%">Kỳ hiện tại</th>
          <th style="width: 25%">Kỳ so sánh</th>
          <th style="width: 20%">Thay đổi (%)</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(r => {
    if (r.section) {
      html += `<tr><td colspan="4" class="perf_section_title">${r.section}</td></tr>`;
      return;
    }

    const change = r.old > 0 ? ((r.val - r.old) / r.old) * 100 : (r.val > 0 ? 100 : 0);
    const cls = change > 0 ? "increase" : (change < 0 ? "decrease" : "equal");
    const icon = change > 0 ? "fa-caret-up" : (change < 0 ? "fa-caret-down" : "fa-equals");

    const format = (v, t) => {
      if (t === "money") return formatMoney(v);
      if (t === "percent") return v.toFixed(2) + "%";
      if (t === "float") return v.toFixed(2);
      return formatNumber(v);
    };

    html += `
      <tr>
        <td>
          <div class="perf_metric_label">
            <i class="${r.icon}"></i>
            <span>${r.label}</span>
          </div>
        </td>
        <td><span class="perf_val_current">${format(r.val, r.type)}</span></td>
        <td><span class="perf_val_compare">${format(r.old, r.type)}</span></td>
        <td>
          <div class="perf_change_badge ${cls}">
            <i class="fa-solid ${icon}"></i>
            ${change === 0 && r.val === 0 ? "0.0" : change.toFixed(1)}%
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  content.innerHTML = html;
}

// Xóa listener cũ không còn sử dụng





