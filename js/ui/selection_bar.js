
// ================================================================
// ============== SELECTION SUMMARY BAR ===========================
// ================================================================
function updateSelectionSummary() {
  const bar = document.getElementById("selection_summary_bar");
  if (!bar) return;

  // Single DOM query — reused for both checked count and campaign-level filter
  const allCheckboxes   = document.querySelectorAll(".view_campaign_box .row_checkbox");
  const allChecked      = Array.from(allCheckboxes).filter((cb) => cb.checked);
  if (allChecked.length === 0) {
    bar.style.display = "none";
    return;
  }

  // --- Build a set of checked IDs per level ---
  const checkedCampaignIds = new Set();
  const checkedAdsetIds = new Set();
  const checkedAdIds = new Set();
  // Also track parent links
  const adParentAdset = {}; // adId -> adsetId
  const adParentCampaign = {}; // adId -> campaignId
  const adsetParentCampaign = {}; // adsetId -> campaignId

  allChecked.forEach((cb) => {
    const lvl = cb.dataset.level;
    const id = cb.dataset.id;
    if (lvl === "campaign") checkedCampaignIds.add(id);
    else if (lvl === "adset") {
      checkedAdsetIds.add(id);
      adsetParentCampaign[id] = cb.dataset.parentCampaign;
    } else {
      checkedAdIds.add(id);
      adParentAdset[id] = cb.dataset.parentAdset;
      adParentCampaign[id] = cb.dataset.parentCampaign;
    }
  });

  // --- Resolve items using PARENT-WINS hierarchy ---
  // If campaign checked → use campaign-level metrics (its own API data).
  // Else if adset checked → use adset-level metrics.
  // Else use individual ad metrics.
  const itemsToSum = [];

  const campaigns = window._ALL_CAMPAIGNS || [];

  for (const camp of campaigns) {
    if (checkedCampaignIds.has(camp.id)) {
      // Campaign is checked → use its own metrics, ignore children
      itemsToSum.push(camp);
    } else {
      for (const as of (camp.adsets || [])) {
        if (checkedAdsetIds.has(as.id)) {
          // Adset is checked (campaign is NOT) → use adset metrics
          itemsToSum.push(as);
        } else {
          // No parent selected → include any individually-checked ads
          for (const ad of (as.ads || [])) {
            if (checkedAdIds.has(ad.id)) {
              itemsToSum.push(ad);
            }
          }
        }
      }
    }
  }

  if (itemsToSum.length === 0) {
    bar.style.display = "none";
    return;
  }

  // --- Count active ads ---
  let totalActiveAds = 0;
  for (const item of itemsToSum) {
    if (item.adsets) {
      for (const as of (item.adsets || [])) for (const ad of (as.ads || [])) { if (ad.status?.toLowerCase() === "active") totalActiveAds++; }
    } else if (item.ads) {
      for (const ad of (item.ads || [])) { if (ad.status?.toLowerCase() === "active") totalActiveAds++; }
    } else {
      if (item.status?.toLowerCase() === "active") totalActiveAds++;
    }
  }

  // --- Build active column metas ---
  const activeMetas = ACTIVE_COLUMNS.map(id => {
    const meta = METRIC_REGISTRY[id];
    if (meta) return meta;
    const custom = CUSTOM_METRICS.find(m => m.id === id);
    return custom ? { ...custom, type: "custom" } : null;
  }).filter(Boolean);

  // --- Sum each metric by calling getMetricValue directly (same as table rows) ---
  // Rate/derived metrics are skipped here and re-derived below from raw totals.
  const DERIVED = new Set(["frequency", "cpm", "cpr", "ctr"]);
  const sums = {};

  for (const meta of activeMetas) {
    if (DERIVED.has(meta.id)) { sums[meta.id] = 0; continue; }
    sums[meta.id] = 0;
    for (const item of itemsToSum) {
      const v = meta.type === "custom"
        ? (evaluateFormula(item, meta.formula) || 0)
        : (getMetricValue(item, meta.id) || 0);
      sums[meta.id] += v;
    }
  }

  // --- Always sum raw fields needed for derived metrics (even if not in ACTIVE_COLUMNS) ---
  for (const id of ["spend", "reach", "impressions", "result", "link_click"]) {
    if (sums[id] !== undefined) continue; // already summed above
    const rawMeta = METRIC_REGISTRY[id];
    if (!rawMeta) continue;
    sums[id] = 0;
    for (const item of itemsToSum) sums[id] += getMetricValue(item, id) || 0;
  }

  // --- Re-derive rate metrics from totals ---
  const totalSpend = sums["spend"] || 0;
  const totalReach = sums["reach"] || 0;
  const totalImpressions = sums["impressions"] || 0;
  const totalResult = sums["result"] || 0;
  const totalLinkClicks = sums["link_click"] || 0;
  const firstGoal = itemsToSum[0]?.optimization_goal || "";
  const isThousandMetric = firstGoal === "REACH" || firstGoal === "IMPRESSIONS";

  sums["frequency"] = itemsToSum.length > 0
    ? itemsToSum.reduce((s, item) => s + (getMetricValue(item, "frequency") || 0), 0) / itemsToSum.length
    : 0;

  sums["cpm"] = totalReach > 0 ? (totalSpend / totalReach) * 1000 : 0;
  sums["cpr"] = totalResult > 0 ? (isThousandMetric ? (totalSpend / totalResult) * 1000 : totalSpend / totalResult) : 0;
  sums["ctr"] = totalImpressions > 0 ? totalLinkClicks / totalImpressions : 0;

  // --- Build metric cells ---
  const metricCells = activeMetas.map(meta =>
    `<div class="sel_metric_cell ad_metric ad_${meta.id}">${formatMetric(sums[meta.id] || 0, meta.format)}</div>`
  ).join("");

  // Determine if all visible campaign checkboxes are checked
  // Derive campaign-only subset from the already-fetched allChecked array (no extra DOM query)
  const allCampCbs    = allChecked.filter((cb) => cb.dataset.level === "campaign");
  const allCheckedState = allCampCbs.length > 0 && allCampCbs.every((cb) => cb.checked);

  bar.innerHTML = `
    <div class="sel_name_cell" style="display:flex;align-items:center;gap:1rem;">
      <label class="row_checkbox_wrap row_checkbox_wrap--lg sel_toggle_all" title="Select / Deselect all" onclick="event.stopPropagation()">
        <input type="checkbox" id="sel_toggle_all_cb" ${allCheckedState ? "checked" : ""} />
        <span class="row_checkbox_box"></span>
      </label>
      <span><b>${itemsToSum.length}</b> selected</span>
      <button id="sel_compare_btn" title="So sánh" style="height:2.8rem;padding:0 1.2rem;border-radius:20px;border:1.5px solid #f59e0b;background:#fffbeb;color:#92400e;font-size:1.1rem;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:0.5rem;"><i class='fa-solid fa-code-compare'></i>So sánh</button>
    </div>
    <div class="sel_status_cell ad_status">
      ${totalActiveAds > 0
      ? `<span class="live-dot"></span><b>${totalActiveAds}</b>&nbsp;AD ACTIVE`
      : `<span style="opacity:.5;font-size:1.1rem;">0 AD ACTIVE</span>`
    }
    </div>
    ${metricCells}
    <div class="campaign_view sel_clear_col" style="display:flex;align-items:center;padding-right:1rem;flex-shrink:0;">
      <button id="sel_clear_btn" title="Clear selection" style="width:3rem;height:3rem;border-radius:50%;border:none;background:rgba(0,0,0,0.08);cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i class="fa-solid fa-xmark" style="font-size:1.4rem;color:#92400e;"></i>
      </button>
    </div>
  `;

  // Re-attach toggle-all listener
  const toggleAllCb = bar.querySelector("#sel_toggle_all_cb");
  if (toggleAllCb) {
    toggleAllCb.addEventListener("change", (e) => {
      e.stopPropagation();
      const checked = e.target.checked;
      document.querySelectorAll(".view_campaign_box .row_checkbox").forEach(cb => {
        cb.checked = checked;
        const row = cb.closest(".campaign_item, .adset_item, .ad_item");
        if (row) row.classList.toggle("sel-checked", checked);
      });
      // Sync the header select-all checkbox too
      const headerCb = document.getElementById("select_all_cb");
      if (headerCb) headerCb.checked = checked;
      updateSelectionSummary();
    });
  }

  // Re-attach compare button listener
  const compareBtn = bar.querySelector("#sel_compare_btn");
  if (compareBtn) {
    compareBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      // Determine item level: campaign (has .adsets), adset (has .ads), ad (neither)
      const getLevel = (item) => item.adsets ? "campaign" : item.ads ? "adset" : "ad";
      const levelName = { campaign: "Campaign", adset: "Adset", ad: "Ad" };

      if (itemsToSum.length !== 2) {
        const levels = [...new Set(itemsToSum.map(getLevel))];
        const hint = levels.length === 1
          ? `Vui lòng chọn đúng 2 ${levelName[levels[0]] || "mục"} để so sánh. (Hiện có ${itemsToSum.length})`
          : `Vui lòng chọn đúng 2 mục cùng cấp (cà 2 Campaign, Adset, hoặc Ad) để so sánh.`;
        domAlert(hint);
        return;
      }

      const levA = getLevel(itemsToSum[0]);
      const levB = getLevel(itemsToSum[1]);
      if (levA !== levB) {
        domAlert(`Hai mục phải cùng cấp. Bạn đang chọn 1 ${levelName[levA]} và 1 ${levelName[levB]}.`);
        return;
      }

      openCompareModal(itemsToSum[0], itemsToSum[1]);
    });
  }

  // Re-attach clear button listener
  const newClear = bar.querySelector("#sel_clear_btn");
  if (newClear) {
    newClear.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".row_checkbox").forEach(cb => cb.checked = false);
      document.querySelectorAll(".sel-checked").forEach(el => el.classList.remove("sel-checked"));
      const headerCb = document.getElementById("select_all_cb");
      if (headerCb) headerCb.checked = false;
      bar.style.display = "none";
    });
  }

  bar.style.display = "flex";
}

// ================================================================
// ==================== COMPARE MODAL ============================
// ================================================================
const COMPARE_GROUPS = [
  {
    label: "TỔNG QUAN TÀI CHÍNH",
    ids: ["spend", "cpm", "cpr", "ctr"],
  },
  {
    label: "HIỂN THỊ & TIẾP CẬN",
    ids: ["impressions", "reach", "frequency", "result", "link_click"],
  },
  {
    label: "TƯƠNG TÁC",
    ids: ["reaction", "comment", "share", "page_engagement", "post_engagement", "photo_view", "save", "lead", "follow", "like", "message_started", "message_connection", "purchase", "roas"],
  },
  {
    label: "VIDEO",
    ids: ["video_play", "video_view", "thruplay", "video_p25", "video_p50", "video_p75", "video_p95", "video_p100"],
  },
];

function getItemLabel(item) {
  return item.name || item.ad_name || item.id || "(unknown)";
}

window.openCompareModal = function (itemA, itemB) {
  const modal = document.getElementById("compare_modal");
  const colHeads = document.getElementById("compare_col_heads");
  const body = document.getElementById("compare_modal_body");
  const header = document.getElementById("compare_modal_header");
  if (!modal) return;

  const labelA = getItemLabel(itemA);
  const labelB = getItemLabel(itemB);

  // Track which column is the comparison BASE ("A" or "B")
  let compareBase = "A";

  // Format current date range
  const dateStr = (startDate && endDate)
    ? `📅 ${startDate} → ${endDate}`
    : "";

  // Redesigned header: two name cards with VS badge between them
  header.innerHTML = `
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:1.4rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:160px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:1.2rem 1.6rem;">
          <div style="font-size:1rem;font-weight:600;color:#94a3b8;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.05em;">Mục A</div>
          <div style="font-size:1.4rem;font-weight:800;color:#1e293b;word-break:break-word;line-height:1.3;">${labelA}</div>
        </div>
        <div style="flex-shrink:0;width:4.4rem;height:4.4rem;border-radius:50%;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 60%,#d97706 100%);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:900;color:#fff;box-shadow:0 6px 20px rgba(245,158,11,0.45),0 0 0 4px rgba(245,158,11,0.15);">VS</div>
        <div style="flex:1;min-width:160px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:1.2rem 1.6rem;">
          <div style="font-size:1rem;font-weight:600;color:#94a3b8;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.05em;">Mục B</div>
          <div style="font-size:1.4rem;font-weight:800;color:#1e293b;word-break:break-word;line-height:1.3;">${labelB}</div>
        </div>
      </div>
      ${dateStr ? `
        <div style="margin-top:1.2rem;">
          <span style="display:inline-flex;align-items:center;gap:0.6rem;padding:0.5rem 1.2rem;background:#fffbeb;border:1.5px solid #fde68a;border-radius:20px;font-size:1.15rem;font-weight:600;color:#92400e;">
            <i class="fa-regular fa-calendar" style="color:#f59e0b;"></i>
            ${startDate} &nbsp;→&nbsp; ${endDate}
          </span>
          <span style="font-size:1rem;color:#94a3b8;font-style:italic;margin-left:0.7rem;">So sánh 2 mục khác nhau chỉ số chỉ mang tính tham khảo</span>
        </div>` : ""}
    </div>
    <button onclick="closeCompareModal()" style="align-self:flex-start;width:3.6rem;height:3.6rem;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:1.2rem;">
      <i class="fa-solid fa-xmark" style="font-size:1.6rem;color:#64748b;"></i>
    </button>
  `;

  // Short column labels
  const short = (s) => s.length > 20 ? s.slice(0, 18) + "…" : s;

  // Clear col-heads div (we use sticky thead inside table instead)
  colHeads.style.display = "none";

  // Helper to build a compare row <tr>
  // baseVal = the reference column, compareVal = the other column
  function makeRow(icon, label, rawA, rawB, fmtA, fmtB, id) {
    // selectedVal = cột đang chọn làm cơ sở, refVal = cột tham chiếu (còn lại)
    const selectedVal = compareBase === "A" ? rawA : rawB;
    const refVal = compareBase === "A" ? rawB : rawA;
    let badgeHtml = `<span class="perf_change_badge equal">—</span>`;
    if (refVal > 0) {
      const pct = ((selectedVal - refVal) / refVal) * 100;
      const isGoodUp = !["cpm", "cpr", "frequency"].includes(id);
      const isIncrease = pct >= 0;
      const isPositive = isIncrease ? isGoodUp : !isGoodUp;
      const cls = Math.abs(pct) < 0.05 ? "equal" : (isPositive ? "increase" : "decrease");
      const sign = isIncrease ? "▲" : "▼";
      badgeHtml = `<span class="perf_change_badge ${cls}">${sign} ${Math.abs(pct).toFixed(1)}%</span>`;
    }
    return `<tr>
      <td>
        <span class="perf_metric_label">
          <i class="${icon}"></i>
          ${label}
        </span>
      </td>
      <td class="perf_val_current">${fmtA}</td>
      <td class="perf_val_compare">${fmtB}</td>
      <td>${badgeHtml}</td>
    </tr>`;
  }

  // Collect row data for re-render without re-fetching values
  const rowData = [];
  const allCustom = CUSTOM_METRICS || [];

  for (const group of COMPARE_GROUPS) {
    const groupRows = [];
    for (const id of group.ids) {
      const meta = METRIC_REGISTRY[id];
      if (!meta) continue;
      const rawA = getMetricValue(itemA, id) || 0;
      const rawB = getMetricValue(itemB, id) || 0;
      if (rawA === 0 && rawB === 0) continue;
      groupRows.push({ icon: meta.icon, label: meta.label, rawA, rawB, fmtA: formatMetric(rawA, meta.format), fmtB: formatMetric(rawB, meta.format), id });
    }
    if (group === COMPARE_GROUPS[COMPARE_GROUPS.length - 1] && allCustom.length > 0) {
      for (const cm of allCustom) {
        const rawA = evaluateFormula(itemA, cm.formula) || 0;
        const rawB = evaluateFormula(itemB, cm.formula) || 0;
        if (rawA === 0 && rawB === 0) continue;
        groupRows.push({ icon: "fa-solid fa-flask", label: cm.label || cm.id, rawA, rawB, fmtA: formatMetric(rawA, cm.format || "number"), fmtB: formatMetric(rawB, cm.format || "number"), id: cm.id });
      }
    }
    if (groupRows.length > 0) rowData.push({ group, rows: groupRows });
  }

  // Build & inject table HTML
  function renderTable() {
    const shortA = short(labelA);
    const shortB = short(labelB);
    const baseStyleA = compareBase === "A"
      ? `font-weight:800;color:#1e293b;cursor:pointer;border-bottom:2.5px solid #f59e0b;padding-bottom:2px;`
      : `font-weight:600;color:#94a3b8;cursor:pointer;`;
    const baseStyleB = compareBase === "B"
      ? `font-weight:800;color:#1e293b;cursor:pointer;border-bottom:2.5px solid #f59e0b;padding-bottom:2px;`
      : `font-weight:600;color:#94a3b8;cursor:pointer;`;
    const hintA = compareBase === "A" ? ` <i class="fa-solid fa-star" style="font-size:0.8em;color:#f59e0b;" title="Đang dùng làm cơ sở"></i>` : ``;
    const hintB = compareBase === "B" ? ` <i class="fa-solid fa-star" style="font-size:0.8em;color:#f59e0b;" title="Đang dùng làm cơ sở"></i>` : ``;

    let html = `<table class="perf_table"><thead><tr>
      <th style="font-size:1rem;">CHỈ SỐ (METRICS)</th>
      <th title="${labelA} — Nhấn để dùng làm cơ sở" style="${baseStyleA}" onclick="window._compareSetBase('A')">${shortA}${hintA}</th>
      <th title="${labelB} — Nhấn để dùng làm cơ sở" style="${baseStyleB}" onclick="window._compareSetBase('B')">${shortB}${hintB}</th>
      <th style="font-size:1rem;">THAY ĐỔI (%)</th>
    </tr><tr>
      <td colspan="4" style="padding:0 0 0.6rem;font-size:0.95rem;color:#94a3b8;font-style:italic;">★ Nhấn vào tên cột để chọn làm cơ sở so sánh</td>
    </tr></thead><tbody>`;

    for (const { group, rows } of rowData) {
      html += `<tr><td colspan="4" class="perf_section_title" style="padding-top:1.6rem;">${group.label}</td></tr>`;
      for (const r of rows) {
        html += makeRow(r.icon, r.label, r.rawA, r.rawB, r.fmtA, r.fmtB, r.id);
      }
    }

    html += `</tbody></table>`;
    body.innerHTML = html;
  }

  // Expose setter so onclick can update base and re-render
  window._compareSetBase = function (col) {
    compareBase = col;
    renderTable();
  };

  renderTable();

  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
};

window.closeCompareModal = function () {
  const modal = document.getElementById("compare_modal");
  if (!modal) return;
  modal.classList.remove("active");
  setTimeout(() => { modal.style.display = "none"; }, 200);
};

// Close on backdrop click
document.addEventListener("click", (e) => {
  const modal = document.getElementById("compare_modal");
  if (modal && e.target === modal) closeCompareModal();
});

// ===================== ADSET INSIGHT HANDLER ====================
// ================================================================
