
let ACTIVE_COLUMNS = [];
let CUSTOM_METRICS = [];

function loadColumnConfig() {
  const saved = localStorage.getItem("dom_column_config");
  if (saved) {
    const config = JSON.parse(saved);
    ACTIVE_COLUMNS = (config.activeColumns || []).slice(0, 15);
    CUSTOM_METRICS = config.customMetrics || [];
  } else {
    // Default configuration
    ACTIVE_COLUMNS = ["spend", "result", "cpr", "cpm", "reach", "frequency", "reaction"];
    CUSTOM_METRICS = [];
  }
}

function saveColumnConfig() {
  const config = { activeColumns: ACTIVE_COLUMNS, customMetrics: CUSTOM_METRICS };
  localStorage.setItem("dom_column_config", JSON.stringify(config));
  // Sync to Google Sheets (runs in background, non-blocking)
  if (typeof saveColumnConfigSync === "function") {
    saveColumnConfigSync(config).catch(() => { });
  }
}

function getMetricValue(item, metricId) {
  // If it's a custom metric
  const custom = CUSTOM_METRICS.find(m => m.id === metricId);
  if (custom) return evaluateFormula(item, custom.formula);

  const meta = METRIC_REGISTRY[metricId];
  if (!meta) {
    // Check if it's a raw field on item (backward compatibility or missing registry)
    return item[metricId] || 0;
  }

  if (meta.type === "field") {
    const fieldKey = meta.field_name || metricId;
    return +item[fieldKey] || 0;
  }
  if (meta.type === "action") {
    // Đặc biệt cho ROAS
    if (metricId === "roas") {
      const roasArr = item.purchase_roas || [];
      const roasVal = roasArr.find(a =>
        a.action_type === "purchase" || a.action_type === "omni_purchase" ||
        a.action_type === "omni_purchase_roas" || a.action_type === "purchase_roas"
      );
      return roasVal ? +roasVal.value : 0;
    }

    const actions = item.actions || [];
    const actionType = meta.action_type;
    const fieldName = meta.field_name;

    // BƯỚC 1: Tìm trong mảng actions chuẩn
    let act = actions.find(a => a.action_type === actionType);

    // BƯỚC 2: Tìm trong các trường chuyên biệt (video_play_actions, etc.)
    if (!act && fieldName && item[fieldName]) {
      const specialData = item[fieldName];
      if (Array.isArray(specialData)) {
        act = specialData.find(a => a.action_type === actionType) || specialData[0];
      } else if (typeof specialData === "number" || typeof specialData === "string") {
        return +specialData;
      }
    }

    // BƯỚC 3: Thử các tên thay thế (Alias) nếu vẫn là 0
    if (!act) {
      // Tên thay thế cho Video View
      if (metricId === "video_view") {
        act = actions.find(a => a.action_type === "video_3_sec_watched_actions" || a.action_type === "video_view");
      }
      // Tên thay thế cho Page Like/Follows
      if (metricId === "follow") {
        act = actions.find(a => a.action_type === "page_like" || a.action_type === "like" || a.action_type === "onsite_conversion.page_like");
      }
      // Tên thay thế cho ThruPlay
      if (metricId === "thruplay") {
        act = actions.find(a => a.action_type === "video_thruplay_watched_actions" || a.action_type === "thruplay" || a.action_type === "video_thruplay");
      }
      // Thử khớp không phân biệt hoa thường
      if (!act) {
        act = actions.find(a => a.action_type && a.action_type.toLowerCase() === actionType.toLowerCase());
      }
    }

    const finalVal = act ? +act.value : (item[metricId] || 0);
    return finalVal;
  }
  if (meta.type === "action_value") {
    const actionValues = item.action_values || [];
    const act = actionValues.find(a => a.action_type === meta.action_type);
    return act ? +act.value : 0;
  }
  if (meta.type === "special") {
    const spend = +item.spend || 0;
    const reach = +item.reach || 0;
    const impressions = +item.impressions || 0;
    const result = +item.result || 0;

    if (metricId === "result") return result;
    if (metricId === "cpr") {
      if (result === 0) return 0;
      const isThousandMetric = (item.optimization_goal === "REACH" || item.optimization_goal === "IMPRESSIONS");
      return isThousandMetric ? (spend / result) * 1000 : spend / result;
    }
    if (metricId === "cpm") {
      if (reach === 0) return 0;
      return (spend / reach) * 1000;
    }
    if (metricId === "frequency") {
      if (reach === 0) return 0;
      return impressions / reach;
    }
    if (metricId === "ctr") {
      // CTR = link_clicks / impressions (tra ve decimal, formatMetric se *100 hien thi %)
      const linkClicks = getMetricValue(item, "link_click");
      if (impressions === 0) return 0;
      return linkClicks / impressions;
    }
  }
  return 0;
}



function evaluateFormula(item, formula) {
  try {
    let processed = formula.replace(/\{\{([^}]+)\}\}/g, (match, id) => {
      // Ép kiểu số ngay tại đây để đảm bảo an toàn toán học
      const val = parseFloat(getMetricValue(item, id.trim()));
      return isNaN(val) ? 0 : val;
    });

    // Thực thi tính toán
    const result = Function(`"use strict"; return (${processed})`)();

    // Nếu kết quả là Infinity (chia cho 0) hoặc NaN, trả về 0
    return isFinite(result) ? result : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Định dạng giá trị metric — nhận biết % theo 4 tầng ưu tiên:
 *  1. format === "percent"          → luôn là %, auto-scale nếu num < 1
 *  2. Tên metric chứa từ khóa %     → auto-scale nếu num < 1
 *  3. formula chứa "*100"           → giá trị đã nhân 100, hiển thị thẳng + "%"
 *  4. isProbability (0 < num < 1)   → nhân 100 nếu format không phải money/decimal
 *
 * @param {*}      value     Giá trị cần format
 * @param {string} format    "money" | "decimal" | "percent" | "number"
 * @param {string} metricId  ID của metric (dùng để detect tên)
 * @param {string} formula   Công thức custom metric (dùng để detect *100)
 */
function formatMetric(value, format, metricId = "", formula = "") {
  if (value === "-" || value === null || value === undefined) return "-";
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return "-";
  if (num === 0) return "0";

  const id = (metricId || "").toLowerCase();

  // ─── Tầng 1: format được khai báo rõ là "percent" ──────────────────────
  if (format === "percent") {
    const displayVal = (num > 0 && num < 1) ? num * 100 : num;
    return displayVal.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";
  }

  // ─── Tầng 2: Tên metric chứa từ khóa liên quan đến % ───────────────────
  // Mở rộng từ {rate, ctr, percent} → thêm cvr, ratio, pct, share
  const PERCENT_KEYWORDS = ["rate", "ctr", "cvr", "percent", "ratio", "pct", "share"];
  const isPercentName = PERCENT_KEYWORDS.some(kw => id.includes(kw));
  if (isPercentName) {
    // num < 1  → xác suất thập phân (VD: 0.0054 = 0.54%) → nhân 100
    // num >= 1 → đã là % (VD: 54.2%) → giữ nguyên
    const displayVal = (num > 0 && num < 1) ? num * 100 : num;
    return displayVal.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";
  }

  // ─── Tầng 3: Formula custom metric chứa "*100" hoặc "/ ... * 100" ────────
  // VD: {{clicks}} / {{impressions}} * 100  →  giá trị đã nhân sẵn, hiển thị + "%"
  const hasScaleTo100 = formula && /\*\s*100(?![\d.])|\/[^*/]+\*\s*100(?![\d.])/.test(formula);
  if (hasScaleTo100) {
    return num.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";
  }

  // ─── Tầng 4: Heuristic – giá trị xác suất (0 < num < 1) ─────────────────
  // Chỉ áp dụng khi format KHÔNG phải money hoặc decimal
  // (tránh nhầm 0.5đ hoặc 0.75 freq thành %)
  const isProbability = num > 0 && num < 1 && format !== "money" && format !== "decimal";
  if (isProbability) {
    return (num * 100).toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";
  }

  // ─── Fallback: format chuẩn ───────────────────────────────────────────────
  switch (format) {
    case "money": return Math.round(num).toLocaleString("vi-VN") + " đ";
    case "decimal": return num.toLocaleString("vi-VN", { minimumFractionDigits: 2 });
    default: return num.toLocaleString("vi-VN");
  }
}


loadColumnConfig();

function renderColumnSettingsModal(filter = "") {
  const availList = document.getElementById("available_metrics_list");
  const activeList = document.getElementById("active_columns_list");
  if (!availList || !activeList) return;

  const f = filter.toLowerCase();

  // Render Available
  availList.innerHTML = Object.keys(METRIC_REGISTRY)
    .filter(id => !ACTIVE_COLUMNS.includes(id))
    .filter(id => {
      const m = METRIC_REGISTRY[id];
      return m.label.toLowerCase().includes(f) || id.toLowerCase().includes(f);
    })
    .map(id => `
      <div class="metric_tag" onclick="window.addColumnToActive('${id}')" style="background:#f1f5f9; color:#475569; padding:0.8rem 1.4rem; border-radius:1.2rem; font-size:1.15rem; cursor:pointer; border:1.5px solid #e2e8f0; transition:all 0.2s; display:flex; align-items:center; gap:0.8rem;">
        <i class="fa-solid fa-plus" style="color:#94a3b8;"></i> 
        <div style="display:flex; flex-direction:column; line-height:1.3;">
          <span style="font-weight:600;">${METRIC_REGISTRY[id].label}</span>
          <small style="color:#94a3b8; font-weight:400; font-size:1rem;">{{${id}}}</small>
        </div>
      </div>
    `).join("");

  // Render Active (with Drag & Drop)
  activeList.innerHTML = ACTIVE_COLUMNS.map((id, idx) => {
    const meta = METRIC_REGISTRY[id];
    const custom = CUSTOM_METRICS.find(m => m.id === id);
    let label = meta ? meta.label : (custom?.name || id);
    let isCustom = !meta;

    return `
      <div draggable="true" data-col-id="${id}" data-col-idx="${idx}"
        style="display:flex; align-items:center; justify-content:space-between; padding:1.2rem 1.5rem; background:#fff; border:1px solid #eee; border-radius:1rem; box-shadow:0 2px 4px rgba(0,0,0,0.02); cursor:grab; transition:opacity .15s, transform .15s;"
        ondragstart="window._colDragStart(event)" ondragover="window._colDragOver(event)" ondrop="window._colDrop(event)" ondragend="window._colDragEnd(event)">
        <div style="display:flex; align-items:center; gap:1.2rem;">
          <i class="fa-solid fa-grip-vertical" style="color:#ccc; cursor:grab;"></i>
          <div style="display:flex; flex-direction:column; gap:0.2rem; line-height:1.2;">
            <span style="font-size:1.35rem; font-weight:700; color:#333; display:flex; align-items:center; gap:0.6rem;">
              ${label} 
              ${isCustom ? '<span style="font-size:0.9rem; color:#f59e0b; background:#fffaf0; padding:0.1rem 0.5rem; border-radius:0.4rem; border:1px solid #fef3c7;">Custom</span>' : ''}
            </span>
            ${!isCustom ? `<small style="color:#999; font-weight:400; font-size:1.1rem;">{{${id}}}</small>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
           ${isCustom ? `<i class="fa-solid fa-pen-to-square" onclick="window.editCustomMetric('${id}')" style="cursor:pointer; color:#6366f1; padding:0.5rem; font-size:1.4rem;" title="Sửa công thức"></i>` : ''}
           <i class="fa-solid fa-trash-can" onclick="window.removeColumnFromActive('${id}')" style="cursor:pointer; color:#ef4444; padding:0.5rem; margin-left:0.5rem;"></i>
        </div>
      </div>
    `;
  }).join("");

  // Wire up drag-and-drop sau khi render
  _initColDnD();
}

// ── Drag & Drop cột (HTML5 native) ─────────────────────────
let _dragSrcIdx = null;

window._colDragStart = function (e) {
  _dragSrcIdx = +e.currentTarget.dataset.colIdx;
  e.currentTarget.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
};

window._colDragOver = function (e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  target.style.transform = 'scale(1.02)';
  target.style.borderColor = '#f59e0b';
};

window._colDragEnd = function (e) {
  // Reset visual trên tất cả items
  document.querySelectorAll('#active_columns_list [draggable]').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.borderColor = '';
  });
  _dragSrcIdx = null;
};

window._colDrop = function (e) {
  e.stopPropagation();
  const destIdx = +e.currentTarget.dataset.colIdx;
  if (_dragSrcIdx === null || _dragSrcIdx === destIdx) return;
  // Hoán đổi vị trí trong ACTIVE_COLUMNS
  const moved = ACTIVE_COLUMNS.splice(_dragSrcIdx, 1)[0];
  ACTIVE_COLUMNS.splice(destIdx, 0, moved);
  renderColumnSettingsModal();
};

function _initColDnD() {
  // Đưa dragover reset ra mouseout khi rời khỏi item
  document.querySelectorAll('#active_columns_list [draggable]').forEach(el => {
    el.addEventListener('dragleave', () => {
      el.style.transform = '';
      el.style.borderColor = '';
    });
  });
}

window.addColumnToActive = (id) => {
  if (!ACTIVE_COLUMNS.includes(id)) {
    if (ACTIVE_COLUMNS.length >= 15) {
      return showToast("Tối đa chỉ được hiển thị 15 cột báo cáo!");
    }
    ACTIVE_COLUMNS.push(id);
    renderColumnSettingsModal();
  }
};

window.removeColumnFromActive = (id) => {
  ACTIVE_COLUMNS = ACTIVE_COLUMNS.filter(c => c !== id);
  renderColumnSettingsModal();
};

window.editCustomMetric = (id) => {
  const custom = CUSTOM_METRICS.find(m => m.id === id);
  if (!custom) return;

  document.getElementById("custom_metric_name").value = custom.name;
  document.getElementById("custom_metric_formula").value = custom.formula;
  document.getElementById("custom_metric_name").dataset.editingId = id;
  document.getElementById("add_custom_metric_btn").textContent = "Cập nhật Metric";
};

window.moveColumn = (idx, dir) => {
  const target = idx + dir;
  if (target < 0 || target >= ACTIVE_COLUMNS.length) return;
  const item = ACTIVE_COLUMNS.splice(idx, 1)[0];
  ACTIVE_COLUMNS.splice(target, 0, item);
  renderColumnSettingsModal();
};

window.filterAvailableMetrics = (query) => {
  renderColumnSettingsModal(query);
};

window.selectAllMetrics = () => {
  const fInput = document.getElementById("metric_search_input");
  const filter = fInput ? fInput.value.toLowerCase() : "";

  const toAdd = Object.keys(METRIC_REGISTRY).filter(id => {
    if (ACTIVE_COLUMNS.includes(id)) return false;
    const m = METRIC_REGISTRY[id];
    return m.label.toLowerCase().includes(filter) || id.toLowerCase().includes(filter);
  });

  if (toAdd.length + ACTIVE_COLUMNS.length > 25) { // Tạm nâng giới hạn khi select all nếu user muốn, nhưng Meta report thực tế tầm 20-30 cột là max.
    showToast("Cảnh báo: Quá nhiều cột có thể làm đơ bảng báo cáo!");
  }

  // Tạm khóa ở 20 cột cho ổn định
  const limit = 20;
  const currentLen = ACTIVE_COLUMNS.length;
  const space = limit - currentLen;

  if (space <= 0) return showToast("Đã đạt giới hạn số cột tối đa!");

  const added = toAdd.slice(0, space);
  ACTIVE_COLUMNS = [...ACTIVE_COLUMNS, ...added];
  renderColumnSettingsModal(filter);
};

window.deselectAllMetrics = () => {
  ACTIVE_COLUMNS = [];
  const fInput = document.getElementById("metric_search_input");
  renderColumnSettingsModal(fInput ? fInput.value : "");
};
