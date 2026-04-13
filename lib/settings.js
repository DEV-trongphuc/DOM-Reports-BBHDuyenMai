/**
 * DOM Settings Sync — Client module
 * Reads settings from Google Sheets on load.
 * Writes happen silently in background after UI is already updated.
 */

const SETTINGS_SYNC_URL =
    typeof window.SETTINGS_SHEET_URL === "string" && window.SETTINGS_SHEET_URL
        ? window.SETTINGS_SHEET_URL
        : null;

const SYNC_KEYS = [
    "dom_brand_filters",
    "dom_view_presets",
    "dom_column_config",
    "goal_keywords",
    "goal_chart_mode",
    "dom_summary_metrics",
];

// ── Core helpers ────────────────────────────────────────────────────

async function _sheetGet() {
    if (!SETTINGS_SYNC_URL) return null;
    try {
        const res = await fetch(SETTINGS_SYNC_URL, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.ok ? (json.settings || {}) : null;
    } catch (err) {
        console.warn("Settings load failed:", err.message);
        return null;
    }
}

async function _sheetPost(payload) {
    if (!SETTINGS_SYNC_URL) return;
    try {
        const res = await fetch(SETTINGS_SYNC_URL, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Unknown");
    } catch (err) {
        // Re-throw so callers can catch and show error toast
        throw err;
    }
}

// ── Apply loaded value to global state ─────────────────────────────

function _applyToGlobal(key, value) {
    switch (key) {
        case "dom_brand_filters":
            // loadBrandSettings() reads from localStorage — already written before this call
            break;
        case "dom_view_presets":
            // loadViewPresets() reads from localStorage — already written by caller
            break;
        case "dom_column_config":
            if (value && typeof value === "object") {
                if (Array.isArray(value.activeColumns))
                    window.ACTIVE_COLUMNS = value.activeColumns.slice(0, 15);
                if (Array.isArray(value.customMetrics))
                    window.CUSTOM_METRICS = value.customMetrics;
            }
            break;
        case "goal_keywords":
            if (Array.isArray(value)) window.GOAL_KEYWORDS = value;
            break;
        case "goal_chart_mode":
            if (typeof value === "string") window.GOAL_CHART_MODE = value;
            break;
        case "dom_summary_metrics":
            if (Array.isArray(value)) window.SUMMARY_METRICS = value;
            break;
    }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Called once on startup.
 * Loads all settings from Sheet (falls back to localStorage silently).
 */
window.initSettingsSync = async function () {
    const sheetData = await _sheetGet();

    SYNC_KEYS.forEach((key) => {
        let value = sheetData?.[key];

        // Fall back to localStorage if sheet has nothing for this key
        if (value === undefined || value === null) {
            try {
                const ls = localStorage.getItem(key);
                if (ls !== null) value = JSON.parse(ls);
            } catch (_) { }
        }

        if (value === undefined || value === null) return;

        // Write to localStorage so existing code (loadBrandSettings etc.) can read it
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { }

        // Apply to in-memory globals
        _applyToGlobal(key, value);
    });

    // Refresh brand dropdown after settings applied
    if (typeof updateBrandDropdownUI === "function") updateBrandDropdownUI();

    // Sync column settings into ACTIVE_COLUMNS / CUSTOM_METRICS
    if (typeof loadColumnConfig === "function") loadColumnConfig();

    // Refresh preset dropdown
    if (typeof renderPresetDropdown === "function") renderPresetDropdown();

    // Sync goal chart toggle label
    const modeLabel = document.getElementById("goal_mode_label");
    if (modeLabel && typeof GOAL_CHART_MODE !== "undefined") {
        modeLabel.textContent = GOAL_CHART_MODE === "brand" ? "Keyword" : "Brand";
    }
};

/**
 * Save brand settings to Sheet silently in background.
 * UI must already be updated by caller before calling this.
 */
window.saveBrandSettingsSync = function (brands) {
    return _sheetPost({ key: "dom_brand_filters", value: brands });
};

/**
 * Save column config to Sheet silently in background.
 */
window.saveColumnConfigSync = function (config) {
    return _sheetPost({ key: "dom_column_config", value: config });
};

/**
 * Save goal keywords + chart mode to Sheet silently in background.
 */
window.saveGoalSettingsSync = function (keywords, mode) {
    return _sheetPost({ settings: { goal_keywords: keywords, goal_chart_mode: mode } });
};

/**
 * Save view presets to Sheet silently in background.
 */
window.saveViewPresetsSync = function (presets) {
    return _sheetPost({ key: "dom_view_presets", value: presets });
};

/**
 * Save summary metrics to Sheet silently in background.
 */
window.saveSummaryMetricsSync = function (metrics) {
    return _sheetPost({ key: "dom_summary_metrics", value: metrics });
};
