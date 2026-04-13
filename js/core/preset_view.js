

// ══════════════════════════════════════════════════════════════════
//  VIEW PRESETS  —  custom dropdown, inline edit, default preset
// ══════════════════════════════════════════════════════════════════

const VIEW_PRESETS_KEY = "dom_view_presets";
const DEFAULT_PRESET_ID = "default";
const DEFAULT_PRESET = {
  id: DEFAULT_PRESET_ID,
  name: "Mặc định",
  isDefault: true,
  columns: ["spend", "result", "cpr", "cpm", "reach", "frequency", "reaction"],
  customMetrics: []
};

/** Đọc presets — luôn đảm bảo có preset mặc định ở đầu */
function loadViewPresets() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(VIEW_PRESETS_KEY) || "[]"); } catch { }
  // Đảm bảo preset mặc định luôn có và ở đầu
  if (!list.find(p => p.id === DEFAULT_PRESET_ID)) list.unshift(DEFAULT_PRESET);
  return list;
}

/** Ghi presets — sync lên Sheet ngầm (chỉ dom_view_presets, không cần dom_column_config) */
function _saveViewPresets(presets) {
  try { localStorage.setItem(VIEW_PRESETS_KEY, JSON.stringify(presets)); } catch { }
  // Sync to Google Sheets (runs in background, non-blocking)
  if (typeof saveViewPresetsSync === "function") {
    saveViewPresetsSync(presets).catch(() => { });
  }
}

/** Áp dụng preset → update cột + lưu + re-render bảng */
function _applyPreset(id) {
  const presets = loadViewPresets();
  const p = presets.find(x => String(x.id) === String(id));
  if (!p) return;
  ACTIVE_COLUMNS = [...p.columns];
  CUSTOM_METRICS = [...(p.customMetrics || [])];
  saveColumnConfig();
  if (window._ALL_CAMPAIGNS)
    renderCampaignView(window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS);
  if (typeof renderColumnSettingsModal === "function") renderColumnSettingsModal();
  // Update button label
  const lbl = document.getElementById("toolbar_preset_label");
  if (lbl) lbl.textContent = p.name;
  _closePresetPanel();
  showToast(`📋 "${p.name}"`);
}
window.applyViewPreset = _applyPreset; // for modal select compat

// ── Panel open / close ──────────────────────────────────────────

window._togglePresetPanel = function () {
  const panel = document.getElementById("preset_panel");
  if (!panel) return;
  const isOpen = panel.classList.contains("open");
  isOpen ? _closePresetPanel() : _openPresetPanel();
};

function _openPresetPanel() {
  const panel = document.getElementById("preset_panel");
  if (!panel) return;
  panel.style.display = "block";
  panel.classList.add("open");
  document.getElementById("toolbar_preset_chevron").style.transform = "rotate(180deg)";
  const btn = document.getElementById("toolbar_preset_btn");
  if (btn) { btn.style.borderColor = UI_AMBER; btn.style.background = UI_AMBER_BG; }
  _renderPresetPanel();
  // Close on outside click
  setTimeout(() => document.addEventListener("click", _outsidePresetClick), 10);
}

function _closePresetPanel() {
  const panel = document.getElementById("preset_panel");
  if (!panel) return;
  panel.style.display = "none";
  panel.classList.remove("open");
  const chevron = document.getElementById("toolbar_preset_chevron");
  if (chevron) chevron.style.transform = "rotate(0deg)";
  const btn = document.getElementById("toolbar_preset_btn");
  if (btn) { btn.style.borderColor = UI_BORDER; btn.style.background = UI_WHITE; }
  document.removeEventListener("click", _outsidePresetClick);
}

function _outsidePresetClick(e) {
  const wrap = document.getElementById("toolbar_preset_wrap");
  if (wrap && !wrap.contains(e.target)) _closePresetPanel();
}

// ── Render panel list ───────────────────────────────────────────

function _renderPresetPanel() {
  const list = document.getElementById("preset_panel_list");
  if (!list) return;
  const presets = loadViewPresets();
  const activeId = _currentPresetId();

  list.innerHTML = presets.map(p => {
    const isActive = String(p.id) === String(activeId);
    return `
    <div class="_preset_row" data-pid="${p.id}"
      style="display:flex; align-items:center; gap:0; padding:0.5rem 1rem;
        transition:background .12s; border-radius:0 0 0 0;
        ${isActive ? "background:#fffbeb;" : ""}">
      <!-- Apply zone -->
      <div onclick="window._applyPreset('${p.id}')"
        style="flex:1; display:flex; align-items:center; gap:0.9rem;
          cursor:pointer; padding:0.6rem 0.4rem; min-width:0;">
        <i class="fa-solid ${isActive ? 'fa-circle-check' : 'fa-layer-group'}"
          style="color:${isActive ? '#f59e0b' : '#cbd5e1'}; font-size:1.3rem; flex-shrink:0;"></i>
        <div style="min-width:0;">
          <div class="_preset_name_display" style="font-size:1.3rem; font-weight:${isActive ? '700' : '600'};
            color:${isActive ? '#92400e' : '#374151'}; white-space:nowrap;
            overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
          <div style="font-size:1rem; color:#94a3b8; margin-top:0.5rem;">${p.columns.length} cột</div>
        </div>
      </div>
      <!-- Actions -->
      <div style="display:flex; gap:0.2rem; flex-shrink:0;">
        ${!p.isDefault ? `
        <button onclick="window._promptRenamePreset('${p.id}')" title="Đổi tên"
          style="border:none;background:transparent;cursor:pointer;padding:0.5rem;
            color:#94a3b8;font-size:1.2rem;border-radius:0.5rem;transition:all .15s;"
          onmouseover="this.style.color='#6366f1';this.style.background='#eff0ff'"
          onmouseout="this.style.color='#94a3b8';this.style.background='transparent'">
          <i class="fa-solid fa-pen-to-square"></i></button>
        <button onclick="window._deleteViewPreset('${p.id}')" title="Xóa"
          style="border:none;background:transparent;cursor:pointer;padding:0.5rem;
            color:#94a3b8;font-size:1.2rem;border-radius:0.5rem;transition:all .15s;"
          onmouseover="this.style.color='#ef4444';this.style.background='#fef2f2'"
          onmouseout="this.style.color='#94a3b8';this.style.background='transparent'">
          <i class="fa-solid fa-trash"></i></button>
        ` : `
        <span style="font-size:1rem;color:#d1d5db;padding:0.5rem 0.6rem;">
          <i class="fa-solid fa-lock"></i></span>
        `}
      </div>
    </div>`;
  }).join('<div style="height:1px;background:#f1f5f9;margin:0 1rem;"></div>');
}

/** Lấy preset ID đang active (match vs ACTIVE_COLUMNS) */
function _currentPresetId() {
  const presets = loadViewPresets();
  const cur = JSON.stringify([...ACTIVE_COLUMNS].sort());
  for (const p of presets) {
    if (JSON.stringify([...p.columns].sort()) === cur) return p.id;
  }
  return null;
}

// ── Edit preset — opens Column Settings Modal ───────────────────

let _editingPresetId = null; // track which preset is being edited

/** Opens the column settings modal pre-loaded with a preset's config */
window._promptRenamePreset = function (id) {
  const presets = loadViewPresets();
  const p = presets.find(x => String(x.id) === String(id));
  if (!p) return;

  // Load preset columns into temp state
  ACTIVE_COLUMNS = [...p.columns];
  CUSTOM_METRICS = [...(p.customMetrics || [])];

  _editingPresetId = id;
  _closePresetPanel();

  // Render modal with this preset's columns
  renderColumnSettingsModal();
  renderPresetDropdown();
  _enterPresetEditMode(p.name);

  // Open the modal
  const modal = document.getElementById("column_settings_modal");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
  }
};

/** Show edit-mode UI in the column settings modal */
function _enterPresetEditMode(name) {
  // Ẩn h2 title, hiện banner name input tại chỗ
  const h2title = document.getElementById("col_modal_title");
  if (h2title) h2title.style.display = "none";
  const banner = document.getElementById("preset_edit_banner");
  if (banner) { banner.style.display = "flex"; }
  const nameInput = document.getElementById("preset_edit_name_input");
  if (nameInput) { nameInput.value = name; }

  // Hide preset controls, show cancel btn
  const controls = document.getElementById("col_modal_preset_controls");
  if (controls) controls.style.display = "none";
  const cancelBtn = document.getElementById("cancel_edit_preset_btn");
  if (cancelBtn) cancelBtn.style.display = "flex";

  // Update save button label
  const lbl = document.getElementById("save_btn_label");
  if (lbl) lbl.textContent = "Cập nhật Preset";
}

/** Restore normal modal state after editing */
function _exitPresetEditMode() {
  _editingPresetId = null;

  const h2title = document.getElementById("col_modal_title");
  if (h2title) h2title.style.display = "";
  const banner = document.getElementById("preset_edit_banner");
  if (banner) banner.style.display = "none";

  const controls = document.getElementById("col_modal_preset_controls");
  if (controls) controls.style.display = "flex";
  const cancelBtn = document.getElementById("cancel_edit_preset_btn");
  if (cancelBtn) cancelBtn.style.display = "none";

  const lbl = document.getElementById("save_btn_label");
  if (lbl) lbl.textContent = "Lưu thay đổi";
}

/** Cancel editing a preset — restore original columns from preset */
window._cancelEditPreset = function () {
  if (_editingPresetId) {
    // Restore original columns from preset
    const p = loadViewPresets().find(x => String(x.id) === String(_editingPresetId));
    if (p) {
      ACTIVE_COLUMNS = [...p.columns];
      CUSTOM_METRICS = [...(p.customMetrics || [])];
    }
  }
  _exitPresetEditMode();
  renderColumnSettingsModal();
};


// ── Save new preset — opens Column Settings Modal in "new" mode ──

window.saveCurrentAsPreset = function () {
  _editingPresetId = null; // new mode, not editing existing
  _closePresetPanel();

  renderColumnSettingsModal();
  renderPresetDropdown();

  // Hiện banner nhập tên tại chỗ (góc trái), ẩn tiêu đề chính
  const h2title = document.getElementById("col_modal_title");
  if (h2title) h2title.style.display = "none";
  const banner = document.getElementById("preset_edit_banner");
  if (banner) banner.style.display = "flex";
  const nameInput = document.getElementById("preset_edit_name_input");
  if (nameInput) { nameInput.value = ""; setTimeout(() => nameInput.focus(), 120); }

  const controls = document.getElementById("col_modal_preset_controls");
  if (controls) controls.style.display = "none";
  const cancelBtn = document.getElementById("cancel_edit_preset_btn");
  if (cancelBtn) cancelBtn.style.display = "flex";

  const lbl = document.getElementById("save_btn_label");
  if (lbl) lbl.textContent = "Lưu Preset mới";

  const modal = document.getElementById("column_settings_modal");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
  }
};

// ── Core save handler (edit existing OR save new) ───────────────

function _savePresetEditIfActive() {
  const banner = document.getElementById("preset_edit_banner");
  const bannerVisible = banner && banner.style.display !== "none";

  if (_editingPresetId) {
    // Update existing preset
    const presets = loadViewPresets();
    const idx = presets.findIndex(p => String(p.id) === String(_editingPresetId));
    if (idx < 0) { _exitPresetEditMode(); return; }
    const nameInput = document.getElementById("preset_edit_name_input");
    const name = nameInput?.value?.trim() || presets[idx].name;
    presets[idx] = { ...presets[idx], name, columns: [...ACTIVE_COLUMNS], customMetrics: [...CUSTOM_METRICS] };
    _saveViewPresets(presets);
    saveColumnConfig(); // ☁️ Đồng bộ cả config cột hiện tại
    renderPresetDropdown();
    _renderPresetPanel();
    _exitPresetEditMode();
    showToast(`✅ Đã cập nhật preset "${name}"`);
  } else if (bannerVisible) {
    // Save new preset
    const nameInput = document.getElementById("preset_edit_name_input");
    const trimmed = nameInput?.value?.trim();
    if (!trimmed) { nameInput?.focus(); showToast("⚠️ Vui lòng nhập tên preset"); return; }

    const presets = loadViewPresets();
    const dupIdx = presets.findIndex(p => p.name.toLowerCase() === trimmed.toLowerCase());
    const np = {
      id: dupIdx >= 0 ? presets[dupIdx].id : Date.now(), name: trimmed,
      columns: [...ACTIVE_COLUMNS], customMetrics: [...CUSTOM_METRICS]
    };
    if (dupIdx >= 0) presets[dupIdx] = np;
    else presets.push(np);
    _saveViewPresets(presets);
    saveColumnConfig(); // ☁️ Đồng bộ cả config cột hiện tại
    renderPresetDropdown();
    _exitPresetEditMode();
    showToast(`✅ Đã lưu preset "${trimmed}"`);
  }
}

window._confirmRenamePreset = _savePresetEditIfActive; // legacy compat

// ── Delete preset ───────────────────────────────────────────────

window._deleteViewPreset = function (id) {
  if (id === DEFAULT_PRESET_ID) return; // bảo vệ default
  const presets = loadViewPresets().filter(p => String(p.id) !== String(id));
  _saveViewPresets(presets);
  renderPresetDropdown();
  _renderPresetPanel();
  showToast("🗑️ Đã xóa preset");
};

// ── Preset dropdown (toolbar label + modal select) ──────────────

function renderPresetDropdown() {
  const presets = loadViewPresets();
  // Modal select
  const modalSel = document.getElementById("preset_select");
  if (modalSel) {
    modalSel.innerHTML = `<option value="">-- Chọn preset --</option>` +
      presets.map(p => `<option value="${p.id}">${p.name} (${p.columns.length} cột)</option>`).join("");
  }
  // Toolbar label
  const lbl = document.getElementById("toolbar_preset_label");
  if (lbl) {
    const aid = _currentPresetId();
    const ap = presets.find(p => String(p.id) === String(aid));
    lbl.textContent = ap ? ap.name : "Preset";
  }
}

window._applyToolbarPreset = _applyPreset; // legacy compat

// ── DOMContentLoaded: wire up modal buttons ─────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("column_settings_modal");
  const close = document.getElementById("close_column_settings");
  if (close && modal) {
    close.onclick = () => {
      _exitPresetEditMode();
      modal.classList.remove("active");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    };
  }

  // Khởi tạo toolbar preset dropdown ngay khi trang load
  renderPresetDropdown();

  const addCustomBtn = document.getElementById("add_custom_metric_btn");
  if (addCustomBtn) {
    addCustomBtn.onclick = () => {
      const nameInput = document.getElementById("custom_metric_name");
      const formulaInput = document.getElementById("custom_metric_formula");
      const name = nameInput.value.trim();
      const formula = formulaInput.value.trim();
      const editingId = nameInput.dataset.editingId;

      if (!name || !formula) return showToast("Vui lòng nhập tên và công thức");

      if (editingId) {
        const idx = CUSTOM_METRICS.findIndex(m => m.id === editingId);
        if (idx > -1) {
          CUSTOM_METRICS[idx].name = name;
          CUSTOM_METRICS[idx].formula = formula;
        }
        delete nameInput.dataset.editingId;
        addCustomBtn.textContent = "Tạo Metric";
      } else {
        if (ACTIVE_COLUMNS.length >= 15) {
          return showToast("Tối đa 15 cột! Vui lòng gỡ bớt cột trước khi tạo metric mới.");
        }
        const id = "custom_" + Date.now();
        CUSTOM_METRICS.push({ id, name, formula, format: "number" });
        ACTIVE_COLUMNS.push(id);
      }

      nameInput.value = "";
      formulaInput.value = "";
      renderColumnSettingsModal();
      showToast(editingId ? "Đã cập nhật metric" : "Đã thêm custom metric");
    };
  }

  const saveBtn = document.getElementById("save_column_config_btn");
  if (saveBtn) {
    saveBtn.onclick = () => {
      const banner = document.getElementById("preset_edit_banner");
      const bannerVisible = banner && banner.style.display !== "none";

      if (_editingPresetId || bannerVisible) {
        // Preset mode (edit or new)
        _savePresetEditIfActive();
        renderColumnSettingsModal();
        if (modal) {
          modal.classList.remove("active");
          setTimeout(() => { modal.style.display = "none"; }, 300);
        }
        if (window._ALL_CAMPAIGNS)
          renderCampaignView(window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS);
      } else {
        // Normal column config mode
        saveColumnConfig();
        if (modal) {
          modal.classList.remove("active");
          setTimeout(() => { modal.style.display = "none"; }, 300);
        }
        if (window._ALL_CAMPAIGNS) renderCampaignView(window._ALL_CAMPAIGNS);
        showToast("Đã đồng bộ cấu hình thiết lập");
      }
    };
  }

  const resetBtn = document.getElementById("reset_column_config");
  if (resetBtn) {
    resetBtn.onclick = () => {
      ACTIVE_COLUMNS = ["spend", "result", "cpr", "cpm", "reach", "frequency", "reaction"];
      CUSTOM_METRICS = [];
      saveColumnConfig();
      renderColumnSettingsModal();
    };
  }

  // ── Premium Tooltip Manager ──────────────────────────────────
  const tooltip = document.createElement("div");
  tooltip.className = "dom_premium_tooltip";
  document.body.appendChild(tooltip);

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (!target) return;
    const text = target.getAttribute("data-tooltip");
    if (!text) return;
    tooltip.textContent = text;
    tooltip.classList.add("show");
    // Chỉ gọi getBoundingClientRect 1 lần trong RAF — tránh force layout
    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let top = rect.top - tooltipRect.height - 12;
      let left = rect.left + rect.width / 2;
      if (left - tooltipRect.width / 2 < 10) left = tooltipRect.width / 2 + 10;
      if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width / 2 - 10;
      }
      if (top < 10) {
        top = rect.bottom + 12;
        tooltip.classList.add('is-bottom');
      } else {
        tooltip.classList.remove('is-bottom');
      }
      tooltip.style.top = top + "px";
      tooltip.style.left = left + "px";
      tooltip.style.transform = "translate(-50%, 0)";
    });
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("[data-tooltip]")) {
      tooltip.classList.remove("show");
    }
  });
});
