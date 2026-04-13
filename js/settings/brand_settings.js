function openFilterSettings() {
  const modal = document.getElementById("filter_settings_modal");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
  }
  renderBrandSettingsToModal();
}

window.setGoalChartMode = function (mode) {
  GOAL_CHART_MODE = mode;
  const kwBtn = document.getElementById("mode_kw_btn");
  const brBtn = document.getElementById("mode_br_btn");
  const kwCont = document.getElementById("keyword_settings_container");
  const brNote = document.getElementById("brand_settings_note");

  if (kwBtn) {
    kwBtn.style.borderColor = mode === 'keyword' ? UI_AMBER_BORDER : UI_BORDER;
    kwBtn.style.background = mode === 'keyword' ? UI_AMBER_BG : UI_WHITE;
    kwBtn.style.color = mode === 'keyword' ? UI_AMBER : UI_MUTED;
  }
  if (brBtn) {
    brBtn.style.borderColor = mode === 'brand' ? UI_AMBER_BORDER : UI_BORDER;
    brBtn.style.background = mode === 'brand' ? UI_AMBER_BG : UI_WHITE;
    brBtn.style.color = mode === 'brand' ? UI_AMBER : UI_MUTED;
  }
  if (kwCont) kwCont.style.display = mode === 'brand' ? 'none' : '';
  if (brNote) brNote.style.display = mode === 'keyword' ? 'none' : '';

  // Sync quick-toggle button label + active state
  // Label shows TARGET mode (where you'll switch TO), not current mode
  const toggleBtn = document.getElementById("goal_chart_mode_toggle");
  const modeLabel = document.getElementById("goal_mode_label");
  if (modeLabel) modeLabel.textContent = mode === 'brand' ? 'Keyword' : 'Brand';
  if (toggleBtn) {
    if (mode === 'brand') {
      toggleBtn.classList.add('dom_title_button_active');
    } else {
      toggleBtn.classList.remove('dom_title_button_active');
    }
  }
};

// Quick toggle without opening modal — flips mode & re-renders instantly
window.quickToggleGoalChartMode = function () {
  const newMode = GOAL_CHART_MODE === 'brand' ? 'keyword' : 'brand';
  window.setGoalChartMode(newMode);
  localStorage.setItem("goal_chart_mode", newMode);

  // Re-render chart immediately
  if (window._ALL_CAMPAIGNS) {
    const campaigns = window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS;
    const allAds = campaigns.flatMap((c) =>
      c.adsets.flatMap((as) =>
        (as.ads || []).map((ad) => ({
          campaign_name: c.name,
          optimization_goal: as.optimization_goal,
          insights: { spend: ad.spend || 0 },
        }))
      )
    );
    renderGoalChart(allAds);
  }
  showToast(`📊 Switched to ${newMode === 'brand' ? 'Brand Groups' : 'Keyword Goal'} chart`);
};




function closeFilterSettings() {
  const modal = document.getElementById("filter_settings_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
}

function renderBrandSettingsToModal() {
  const brands = loadBrandSettings();
  const listContainer = document.getElementById("brand_settings_list");
  if (!listContainer) return;

  listContainer.innerHTML = brands.map((b, i) => `
    <div class="brand_setting_item" style="background:#fff; border-radius:14px; border:1.5px solid #e2e8f0; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <!-- Header bar -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.4rem; background:linear-gradient(135deg,#f8fafc,#f1f5f9); border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <span style="background:#e2e8f0; color:#64748b; font-size:1rem; font-weight:700; padding:0.2rem 0.7rem; border-radius:20px;">#${i + 1}</span>
          <span style="font-weight:700; color:#1e293b; font-size:1.3rem;" class="brand_label_preview">${b.name || 'Brand mới'}</span>
        </div>
        <button onclick="removeBrandSetting(${i})" style="background:#fee2e2; color:#ef4444; border:none; width:3rem; height:3rem; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition:background .2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <!-- Body -->
      <div style="display:flex; gap:1.6rem; padding:1.4rem; align-items:flex-start;">
        <!-- Avatar preview -->
        <div style="flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:0.6rem;">
          <img class="brand_avatar_preview" src="${b.img || ''}" onerror="this.src=''" style="width:5.6rem; height:5.6rem; border-radius:12px; object-fit:cover; border:2px solid #e2e8f0; background:#f1f5f9;">
          <span style="font-size:1rem; color:#94a3b8;">Avatar</span>
        </div>
        <!-- Fields -->
        <div style="flex:1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem 1.2rem;">
          <div>
            <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Tên thương hiệu</label>
            <input type="text" placeholder="VD: The Running Bean" class="brand_name bsi_input" value="${b.name}"
              oninput="this.closest('.brand_setting_item').querySelector('.brand_label_preview').textContent = this.value || 'Brand mới'"
              style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.25rem; outline:none; transition:border .2s; box-sizing:border-box;"
              onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <div>
            <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Từ khóa (Campaign name)</label>
            <input type="text" placeholder="VD: TRB" class="brand_filter bsi_input" value="${b.filter}"
              style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.25rem; outline:none; transition:border .2s; font-family:monospace; box-sizing:border-box;"
              onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <div style="grid-column:1/-1;">
            <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Đường dẫn ảnh Avatar</label>
            <input type="text" placeholder="VD: ./assets/brand_logo/TRB.jpg" class="brand_img bsi_input" value="${b.img}"
              oninput="const preview=this.closest('.brand_setting_item').querySelector('.brand_avatar_preview'); preview.src=this.value;"
              style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.2rem; outline:none; transition:border .2s; font-family:monospace; color:#64748b; box-sizing:border-box;"
              onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function addNewBrandSetting() {
  const listContainer = document.getElementById("brand_settings_list");
  if (!listContainer) return;
  const div = document.createElement("div");
  div.className = "brand_setting_item";
  div.style.cssText = `background:${UI_WHITE}; border-radius:14px; border:1.5px solid ${UI_AMBER_BORDER}; overflow:hidden; box-shadow:0 2px 8px ${UI_AMBER_SOFT};`;
  div.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.9rem 1.4rem; background:linear-gradient(135deg,#fffbeb,#fef3c7); border-bottom:1px solid #fde68a;">
      <div style="display:flex;align-items:center;gap:0.8rem;">
        <span style="background:#fde68a; color:#92400e; font-size:1rem; font-weight:700; padding:0.2rem 0.7rem; border-radius:20px;">Mới</span>
        <span style="font-weight:700; color:#1e293b; font-size:1.3rem;" class="brand_label_preview">Brand mới</span>
      </div>
      <button onclick="this.closest('.brand_setting_item').remove()" style="background:#fee2e2; color:#ef4444; border:none; width:3rem; height:3rem; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
    <div style="display:flex; gap:1.6rem; padding:1.4rem; align-items:flex-start;">
      <div style="flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:0.6rem;">
        <img class="brand_avatar_preview" src="" onerror="this.src=''" style="width:5.6rem; height:5.6rem; border-radius:12px; object-fit:cover; border:2px solid #e2e8f0; background:#f1f5f9;">
        <span style="font-size:1rem; color:#94a3b8;">Avatar</span>
      </div>
      <div style="flex:1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem 1.2rem;">
        <div>
          <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Tên thương hiệu</label>
          <input type="text" placeholder="VD: The Running Bean" class="brand_name bsi_input" value=""
            oninput="this.closest('.brand_setting_item').querySelector('.brand_label_preview').textContent = this.value || 'Brand mới'"
            style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.25rem; outline:none; transition:border .2s; box-sizing:border-box;"
            onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
        </div>
        <div>
          <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Từ khóa (Campaign name)</label>
          <input type="text" placeholder="VD: TRB" class="brand_filter bsi_input" value=""
            style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.25rem; outline:none; transition:border .2s; font-family:monospace; box-sizing:border-box;"
            onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
        </div>
        <div style="grid-column:1/-1;">
          <label style="display:block; font-size:1.1rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">Đường dẫn ảnh Avatar</label>
          <input type="text" placeholder="VD: ./assets/brand_logo/TRB.jpg" class="brand_img bsi_input" value=""
            oninput="const preview=this.closest('.brand_setting_item').querySelector('.brand_avatar_preview'); preview.src=this.value;"
            style="width:100%; padding:0.65rem 0.9rem; border-radius:8px; border:1.5px solid #e2e8f0; font-size:1.2rem; outline:none; transition:border .2s; font-family:monospace; color:#64748b; box-sizing:border-box;"
            onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#e2e8f0'">
        </div>
      </div>
    </div>
  `;
  listContainer.appendChild(div);
  div.querySelector(".brand_name").focus();
}

function removeBrandSetting(index) {
  const items = document.querySelectorAll("#brand_settings_list .brand_setting_item");
  if (items[index]) items[index].remove();
}

async function saveBrandSettings() {
  const items = document.querySelectorAll("#brand_settings_list .brand_setting_item");
  const brands = Array.from(items).map(item => ({
    name: item.querySelector(".brand_name").value,
    img: item.querySelector(".brand_img").value,
    filter: item.querySelector(".brand_filter").value
  }));

  // 1. Cập nhật UI + đóng modal ngay lập tức
  localStorage.setItem(BRAND_SETTINGS_KEY, JSON.stringify(brands));
  updateBrandDropdownUI();
  closeFilterSettings();
  showToast("Đã đồng bộ cấu hình thiết lập");

  // 2. Lưu lên sheet ngầm (non-blocking)
  if (typeof saveBrandSettingsSync === "function") {
    saveBrandSettingsSync(brands).catch(err => {
      console.warn("Settings sync failed:", err);
      showToast("⚠️ Không thể đồng bộ cấu hình, vui lòng thử lại");
    });
  }
}

// Expose functions to global scope for onclick attributes
window.openFilterSettings = openFilterSettings;
window.closeFilterSettings = closeFilterSettings;
window.addNewBrandSetting = addNewBrandSetting;
window.removeBrandSetting = removeBrandSetting;
window.saveBrandSettings = saveBrandSettings;

/* =============================================
   ACCOUNT ACTIVITY LOG
   ============================================= */

let _activityAllData = [];       // all fetched from API (cur page batch)
let _activityCursor = null;      // after cursor for next page
let _activityLoading = false;
let _activityCategory = "";      // current filter category

// Category → event_type mapping (source: Meta API doc /ad-activity/)
const ACTIVITY_CATEGORY_MAP = {
  // CAMPAIGN category per doc
  CAMPAIGN: [
    "create_campaign_group",
    "create_campaign_legacy",
    "update_campaign_duration",
    "update_campaign_name",
    "update_campaign_run_status",
  ],
  // AD_SET category per doc
  AD_SET: [
    "create_ad_set",
    "update_ad_set_bidding",
    "update_ad_set_bid_strategy",
    "update_ad_set_bid_adjustments",
    "update_ad_set_budget",
    "update_ad_set_duration",
    "update_ad_set_name",
    "update_ad_set_run_status",
    "update_ad_set_target_spec",
    "update_ad_set_ad_keywords",
  ],
  // AD category per doc
  AD: [
    "ad_review_approved",
    "ad_review_declined",
    "create_ad",
    "update_ad_creative",
    "edit_and_update_ad_creative",
    "update_ad_friendly_name",
    "update_ad_run_status",
    "update_ad_run_status_to_be_set_after_review",
  ],
  // BUDGET category per doc
  BUDGET: [
    "ad_account_billing_charge",
    "ad_account_billing_chargeback",
    "ad_account_billing_chargeback_reversal",
    "ad_account_billing_decline",
    "ad_account_billing_refund",
    "ad_account_remove_spend_limit",
    "ad_account_reset_spend_limit",
    "ad_account_update_spend_limit",
    "add_funding_source",
    "remove_funding_source",
    "billing_event",
    "funding_event_initiated",
    "funding_event_successful",
    "update_ad_set_budget",
    "update_campaign_budget",
    "update_campaign_group_spend_cap",
  ],
  // STATUS category per doc
  STATUS: [
    "ad_account_update_status",
    "update_ad_run_status",
    "update_ad_run_status_to_be_set_after_review",
    "update_ad_set_run_status",
    "update_campaign_run_status",
  ],
  // ACCOUNT category per doc
  ACCOUNT: [
    "ad_review_approved",
    "ad_review_declined",
    "ad_account_set_business_information",
    "ad_account_update_status",
    "ad_account_add_user_to_role",
    "ad_account_remove_user_from_role",
    "add_images",
    "edit_images",
  ],
  // TARGETING category per doc
  TARGETING: [
    "update_ad_set_target_spec",
    "update_ad_targets_spec",
  ],
  // AUDIENCE category per doc
  AUDIENCE: [
    "create_audience",
    "update_audience",
    "delete_audience",
    "share_audience",
    "receive_audience",
    "unshare_audience",
    "remove_shared_audience",
    "update_adgroup_stop_delivery",
  ],
};

function getActivityIcon(event_type) {
  if (!event_type) return "fa-clock-rotate-left";
  const t = event_type.toLowerCase();
  if (t.includes("create")) return "fa-plus";
  if (t.includes("approved")) return "fa-check";
  if (t.includes("declined") || t.includes("failed")) return "fa-xmark";
  if (t.includes("budget") || t.includes("billing") || t.includes("funding") || t.includes("spend")) return "fa-wallet";
  if (t.includes("run_status") || t.includes("update_status")) return "fa-toggle-on";
  if (t.includes("target") || t.includes("audience")) return "fa-crosshairs";
  if (t.includes("bid")) return "fa-gavel";
  if (t.includes("creative") || t.includes("image")) return "fa-image";
  if (t.includes("user") || t.includes("role")) return "fa-user-gear";
  if (t.includes("schedule") || t.includes("duration")) return "fa-calendar-days";
  if (t.includes("name")) return "fa-pencil";
  return "fa-clock-rotate-left";
}

// Infer the correct object type label from event_type (more accurate than API's object_type field)
function inferTypeLabel(event_type, object_type) {
  const et = (event_type || "").toLowerCase();

  // Ad Set events — API often wrongly returns object_type=CAMPAIGN for these
  if (
    et.startsWith("create_ad_set") ||
    et.startsWith("update_ad_set_")
  ) return "Ad Set";

  // Campaign events
  if (
    et.startsWith("create_campaign") ||
    et.startsWith("update_campaign_")
  ) return "Campaign";

  // Ad events
  if (
    et === "create_ad" ||
    et.startsWith("update_ad_") ||
    et.startsWith("edit_and_update_ad") ||
    et === "ad_review_approved" ||
    et === "ad_review_declined" ||
    et === "update_ad_run_status_to_be_set_after_review"
  ) return "Ad";

  // Audience events
  if (et.includes("audience")) return "Audience";

  // Account events
  if (et.startsWith("ad_account_") || et === "add_images" || et === "edit_images") return "Account";

  // Fallback to API-provided object_type
  if (!object_type) return "";
  const map = { ADGROUP: "Ad Set", AD_SET: "Ad Set", AD: "Ad", CAMPAIGN: "Campaign", ACCOUNT: "Account" };
  return map[object_type.toUpperCase()] || "";
}

// Convert event_type to short action phrase
function actionPhrase(event_type, translated) {
  if (!event_type) return translated || "updated";
  const t = event_type.toLowerCase();
  if (t.includes("create")) return "created";
  if (t.includes("approved")) return "approved ad";
  if (t.includes("declined")) return "declined ad";
  if (t.includes("update_ad_set_budget") || t.includes("update_campaign_budget")) return "updated budget for";
  if (t.includes("budget")) return "updated budget for";
  if (t.includes("run_status")) return "changed status of";
  if (t.includes("target_spec") || t.includes("target")) return "updated targeting of";
  if (t.includes("bidding") || t.includes("bid_strategy") || t.includes("bid_info")) return "updated bidding of";
  if (t.includes("name")) return "renamed";
  if (t.includes("schedule") || t.includes("duration")) return "updated schedule of";
  if (t.includes("creative")) return "updated creative of";
  if (t.includes("optimization")) return "changed optimization of";
  if (t.includes("audience")) return "modified audience";
  if (t.includes("user") || t.includes("role")) return "changed user role";
  if (t.includes("billing") || t.includes("funding")) return "billing event";
  if (t.includes("add_images") || t.includes("edit_images")) return "edited images";
  return (translated || event_type.replace(/_/g, " ")).toLowerCase();
}

function formatActivityTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderActivityRow(item) {
  const icon = getActivityIcon(item.event_type);
  const actor = item.actor_name || "";
  const action = actionPhrase(item.event_type, item.translated_event_type);
  const objName = item.object_name || "";
  const objType = inferTypeLabel(item.event_type, item.object_type);
  const timeStr = formatActivityTime(item.event_time);
  const dtLocal = item.date_time_in_timezone || "";

  // Infer clickability: clickable if we can tell it's a Campaign/AdSet/Ad
  const inferredType = inferTypeLabel(item.event_type, item.object_type);
  const isClickable = ["Campaign", "Ad Set", "Ad"].includes(inferredType);
  const objHtml = objName
    ? `<span class="act_obj ${isClickable ? 'clickable' : ''}" 
        ${isClickable ? `onclick="navigateToAdObject('${item.object_id}', '${objName.replace(/'/g, "\\'")}', '${item.object_type}')"` : ''}
        title="Click to view details">${objName}</span>`
    : "";

  // Simple gray icons as requested
  const iconColor = UI_ICON_COLOR;
  const iconBg = UI_ICON_BG;

  return `
    <div class="activity_row premium_row">
      <div class="activity_icon" style="background: ${iconBg}; color: ${iconColor};">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="activity_body">
        <div class="activity_sentence">
          <span class="act_actor">${actor}</span>
          <span class="act_action"> ${action} </span>${objHtml}${objType ? `<span class="act_type_badge">${objType}</span>` : ""}
        </div>
        <div class="activity_meta">
          ${dtLocal ? `<span><i class="fa-regular fa-clock"></i> ${dtLocal}</span>` : ""}
          ${item.object_id ? `<span class="act_id_small"><i class="fa-solid fa-fingerprint"></i> ID: ${item.object_id}</span>` : ""}
        </div>
      </div>
      <div class="activity_time">${timeStr}</div>
    </div>
  `;
}


function renderActivityList(items) {
  const container = document.getElementById("activity_log_list");
  if (!container) return;

  // 1. Filter out system/Meta actor
  let display = items.filter(item => {
    const a = (item.actor_name || "").trim();
    return a.length > 0 && a.toLowerCase() !== "meta";
  });

  // 2. Client-side category filter
  if (_activityCategory && ACTIVITY_CATEGORY_MAP[_activityCategory]) {
    const allowed = new Set(ACTIVITY_CATEGORY_MAP[_activityCategory]);
    display = display.filter(item => allowed.has(item.event_type));
  }

  const html = display.map(renderActivityRow).join("");
  container.innerHTML = html || `
    <div style="text-align:center;padding:4rem 2rem;color:#94a3b8;font-size:1.3rem;background:#f8fafc;border-radius:12px;border:1.5px dashed #e2e8f0;margin:1rem 0;">
      <i class="fa-solid fa-inbox" style="font-size:3rem;display:block;margin-bottom:1.5rem;color:#cbd5e1;"></i>
      No activities found for this category.
      <p style="font-size:1.1rem;margin-top:0.5rem;color:#cbd5e1;">Try a different filter or load more entries.</p>
    </div>`;
}

function handleActivitySearch(val) {
  // Disabling search for now as requested
}

function navigateToAdObject(id, name, type) {
  // 1. Switch to Campaign details view via the menu
  const menuItems = document.querySelectorAll(".dom_menu li");
  let detailLi = null;
  menuItems.forEach(li => {
    if (li.dataset.view === "ad_detail") detailLi = li;
  });

  if (detailLi) {
    detailLi.click();

    // 2. Clear then Fill search filter in that view
    const filterInput = document.getElementById("filter");
    if (filterInput) {
      filterInput.value = id || name;
      // Trigger the filter logic
      applyCampaignFilter(id || name);

      // 3. Smooth scroll to the table area
      setTimeout(() => {
        const targetView = document.querySelector(".view_campaign");
        if (targetView) {
          targetView.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // 4. Subtle visual feedback (highlighting matches)
          setTimeout(() => {
            const rows = document.querySelectorAll(".view_campaign_box .campaign_main");
            rows.forEach(r => {
              if (r.innerText.includes(id) || r.innerText.includes(name)) {
                r.style.backgroundColor = UI_AMBER_HOVER;
                r.style.transition = "background-color 0.4s";
                setTimeout(() => r.style.backgroundColor = "", 2500);
              }
            });
          }, 600);
        }
      }, 300);
    }
  }
}

function setActivityCategory(btn) {
  document.querySelectorAll(".act_chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  _activityCategory = btn.dataset.category || "";
  // Client-side filter: re-render from already-fetched data — no new API call needed
  renderActivityList(_activityAllData, false);
  // Update badge count to reflect filtered total
  const allowed = _activityCategory && ACTIVITY_CATEGORY_MAP[_activityCategory]
    ? new Set(ACTIVITY_CATEGORY_MAP[_activityCategory])
    : null;
  const filteredCount = allowed
    ? _activityAllData.filter(i => allowed.has(i.event_type)).length
    : _activityAllData.length;
  const badge = document.getElementById("activity_count_badge");
  if (badge) {
    badge.textContent = `${filteredCount}${_activityHasMore ? "+" : ""} entries`;
  }
}

async function loadAccountActivities(reset = false) {
  if (_activityLoading) return;
  _activityLoading = true;

  const btn = document.getElementById("activity_refresh_btn");
  if (btn) btn.innerHTML = `<i class="fa-solid fa-rotate-right fa-spin"></i> Loading…`;

  if (reset) {
    _activityAllData = [];
    _activityCursor = null;
    _activityHasMore = false;
    const container = document.getElementById("activity_log_list");
    if (container) container.innerHTML = `<div class="activity_skeleton"></div><div class="activity_skeleton"></div><div class="activity_skeleton"></div>`;
    document.getElementById("activity_load_more_wrap").style.display = "none";
  }

  try {
    const fields = "actor_id,actor_name,event_time,event_type,object_id,object_name,object_type,translated_event_type,date_time_in_timezone";
    const limit = 30;

    // Fetch ALL events — API ignores event_type filter so we filter client-side
    let url = `${BASE_URL}/act_${ACCOUNT_ID}/activities?fields=${fields}&limit=${limit}&access_token=${META_TOKEN}`;
    if (_activityCursor) {
      url += `&after=${encodeURIComponent(_activityCursor)}`;
    }

    const res = await fetchJSON(url);
    const newItems = res.data || [];
    _activityAllData.push(...newItems);

    // Paging
    const paging = res.paging || {};
    const nextCursor = paging.cursors?.after || null;
    const hasNextPage = !!(paging.next);
    _activityCursor = hasNextPage ? nextCursor : null;
    _activityHasMore = hasNextPage;

    // Update badge (total fetched)
    const badge = document.getElementById("activity_count_badge");
    if (badge) {
      badge.textContent = `${_activityAllData.length}${_activityHasMore ? "+" : ""} entries`;
      badge.style.display = "inline-block";
    }

    // Render (client-side filter applied inside renderActivityList)
    renderActivityList(_activityAllData, false);

    // Load more button
    const wrap = document.getElementById("activity_load_more_wrap");
    if (wrap) wrap.style.display = _activityHasMore ? "block" : "none";

  } catch (err) {
    console.error("❌ Failed to load activities:", err);
    const container = document.getElementById("activity_log_list");
    if (!container) return;

    const isPermissionErr = err?.message?.includes("Code: 200") || err?.message?.includes("200");
    if (isPermissionErr) {
      container.innerHTML = `
        <div style="text-align:center;padding:3.5rem 2rem;background:#fffbeb;border-radius:14px;border:1.5px solid #fde68a;margin:1rem 0;">
          <i class="fa-solid fa-lock" style="font-size:3rem;display:block;margin-bottom:1.2rem;color:#f59e0b;"></i>
          <p style="font-size:1.4rem;font-weight:700;color:#92400e;margin:0 0 0.5rem;">Permission Required: <code>ads_management</code></p>
          <p style="font-size:1.15rem;color:#78350f;margin:0 0 1.5rem;">The current access token only has <b>ads_read</b>.<br>
          The <b>/activities</b> endpoint requires <b>ads_management</b> permission.</p>
          <div style="background:#fff8e7;border-radius:10px;padding:1.2rem 1.6rem;text-align:left;max-width:500px;margin:0 auto;font-size:1.1rem;color:#78350f;line-height:1.8;">
            <b>Cách lấy token mới:</b><br>
            1. Vào <a href="https://developers.facebook.com/tools/explorer/" target="_blank" style="color:#d97706;">Graph API Explorer</a><br>
            2. Chọn <b>User Token</b> → Add permission: <code>ads_management</code><br>
            3. Generate Token → cập nhật vào <code>token.js</code>
          </div>
        </div>`;
    } else {
      container.innerHTML = `
        <div style="text-align:center;padding:3rem;color:#ef4444;font-size:1.3rem;background:#fef2f2;border-radius:12px;border:1.5px dashed #fca5a5;margin:1rem 0;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i>
          Failed to load activities.<br>
          <span style="font-size:1rem;color:#b91c1c;">${err?.message || "Unknown error"}</span>
        </div>`;
    }
  } finally {
    _activityLoading = false;
    const b = document.getElementById("activity_refresh_btn");
    if (b) b.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Refresh`;
  }
}

async function loadMoreActivities() {
  if (!_activityHasMore || _activityLoading) return;
  const btn = document.getElementById("activity_load_more_btn");
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading…`;
  await loadAccountActivities(false);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> Load more`;
}

// Auto-load when ad account section becomes visible (triggered from loadDashboardData / tab switch)
window.loadAccountActivities = loadAccountActivities;
window.loadMoreActivities = loadMoreActivities;
window.setActivityCategory = setActivityCategory;
window.handleActivitySearch = handleActivitySearch;
window.navigateToAdObject = navigateToAdObject;

// ================================================================
// =================== KEYBOARD SHORTCUTS =========================
// ================================================================
(function initKeyboardShortcuts() {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const mod = isMac ? "⌘" : "Ctrl";

  const SHORTCUTS = [
    { keys: ["?"], desc: "Show keyboard shortcuts", group: "General" },
    { keys: [mod, "Shift", "S"], desc: "Share current view URL", group: "General" },
    { keys: [mod, "E"], desc: "Export CSV", group: "General" },
    { keys: [mod, "K"], desc: "Focus brand filter / search", group: "Navigation" },
    { keys: ["Esc"], desc: "Close panel / modal", group: "Navigation" },
    { keys: ["ArrowDown"], desc: "Expand next campaign", group: "Navigation" },
    { keys: ["ArrowUp"], desc: "Collapse / go to previous", group: "Navigation" },
    { keys: [mod, "ArrowRight"], desc: "Shift date range forward 7 days", group: "Date" },
    { keys: [mod, "ArrowLeft"], desc: "Shift date range back 7 days", group: "Date" },
    { keys: [mod, "1"], desc: "Quick range: Today", group: "Date" },
    { keys: [mod, "2"], desc: "Quick range: Last 7 days", group: "Date" },
    { keys: [mod, "3"], desc: "Quick range: Last 30 days", group: "Date" },
    { keys: [mod, "4"], desc: "Quick range: This month", group: "Date" },
    { keys: [mod, "5"], desc: "Quick range: Last month", group: "Date" },
    { keys: [mod, "R"], desc: "Refresh data", group: "Data" },
    { keys: [mod, "Shift", "R"], desc: "Reset all filters", group: "Data" },
    { keys: [mod, "Shift", "A"], desc: "Expand all campaigns", group: "Campaigns" },
    { keys: [mod, "Shift", "C"], desc: "Collapse all campaigns", group: "Campaigns" },
  ];

  // ── Build and inject the help modal ─────────────────────────
  function buildShortcutModal() {
    const el = document.getElementById("kb_shortcut_modal");
    if (el) return;

    const groups = {};
    SHORTCUTS.forEach(s => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });

    const rows = Object.entries(groups).map(([gname, items]) => `
      <div class="kb_group">
        <p class="kb_group_title">${gname}</p>
        ${items.map(s => `
          <div class="kb_row">
            <span class="kb_desc">${s.desc}</span>
            <span class="kb_keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join(" + ")}</span>
          </div>`).join("")}
      </div>`).join("");

    const modal = document.createElement("div");
    modal.id = "kb_shortcut_modal";
    modal.innerHTML = `
      <div class="kb_backdrop"></div>
      <div class="kb_panel box_shadow">
        <div class="kb_header">
          <h3><i class="fa-solid fa-keyboard"></i> Keyboard Shortcuts</h3>
          <span class="kb_os_badge">${isMac ? "macOS" : "Windows"}</span>
          <button class="kb_close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="kb_body">${rows}</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".kb_close").addEventListener("click", closeShortcutModal);
    modal.querySelector(".kb_backdrop").addEventListener("click", closeShortcutModal);
  }

  function openShortcutModal() { buildShortcutModal(); document.getElementById("kb_shortcut_modal")?.classList.add("active"); }
  function closeShortcutModal() { document.getElementById("kb_shortcut_modal")?.classList.remove("active"); }
  function toggleShortcutModal() { document.getElementById("kb_shortcut_modal")?.classList.contains("active") ? closeShortcutModal() : openShortcutModal(); }

  document.getElementById("kb_shortcut_btn")?.addEventListener("click", toggleShortcutModal);

  // ── Keyboard listener ────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    // Don't fire inside inputs
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    const shift = e.shiftKey;
    const key = e.key;

    // ? → toggle shortcuts
    if (!inInput && key === "?") { e.preventDefault(); toggleShortcutModal(); return; }

    // Esc → close panels/modals
    if (key === "Escape") {
      closeShortcutModal();
      document.getElementById("dom_detail")?.classList.remove("active");
      document.querySelector(".dom_overlay")?.classList.remove("active");
      return;
    }

    if (inInput) return;

    // Ctrl/Cmd + Shift + S → Share
    if (ctrl && shift && key.toLowerCase() === "s") { e.preventDefault(); shareCurrentView(); return; }

    // Ctrl/Cmd + K → focus brand filter
    if (ctrl && key.toLowerCase() === "k") {
      e.preventDefault();
      const filterToggle = document.querySelector(".dom_select.quick_filter_detail");
      filterToggle?.click();
      return;
    }

    // Ctrl/Cmd + E → export CSV
    if (ctrl && key.toLowerCase() === "e") {
      e.preventDefault();
      document.getElementById("export_csv_btn")?.click();
      return;
    }

    // Ctrl/Cmd + R → refresh
    if (ctrl && !shift && key.toLowerCase() === "r") {
      e.preventDefault();
      if (typeof loadDashboardData === "function") loadDashboardData();
      return;
    }

    // Ctrl/Cmd + Shift + R → reset all filters
    if (ctrl && shift && key.toLowerCase() === "r") {
      e.preventDefault();
      document.querySelector(".btn_reset_all")?.click();
      return;
    }

    // Ctrl/Cmd + Shift + A → expand all campaigns
    if (ctrl && shift && key.toLowerCase() === "a") {
      e.preventDefault();
      document.querySelectorAll(".campaign_item:not(.show)").forEach(el => el.classList.add("show"));
      document.querySelectorAll(".adset_item:not(.show)").forEach(el => el.classList.add("show"));
      return;
    }

    // Ctrl/Cmd + Shift + C → collapse all
    if (ctrl && shift && key.toLowerCase() === "c") {
      e.preventDefault();
      document.querySelectorAll(".campaign_item.show, .adset_item.show").forEach(el => el.classList.remove("show"));
      return;
    }

    // Ctrl/Cmd + Arrow → shift date range
    if (ctrl && !shift && (key === "ArrowRight" || key === "ArrowLeft")) {
      e.preventDefault();
      shiftDateRange(key === "ArrowRight" ? 7 : -7);
      return;
    }

    // Ctrl/Cmd + 1-5 → quick date ranges
    if (ctrl && !shift) {
      const rangeMap = { "1": "today", "2": "last_7days", "3": "last_30days", "4": "this_month", "5": "last_month" };
      if (rangeMap[key]) {
        e.preventDefault();
        applyQuickRange(rangeMap[key]);
        return;
      }
    }

    // Arrow keys → navigate campaigns
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      navigateCampaigns(key === "ArrowDown" ? 1 : -1);
    }
  });

  // ── Helper: shift date ────────────────────────────────────────
  function shiftDateRange(days) {
    if (!window.startDate || !window.endDate) return;
    const s = new Date(startDate + "T00:00:00");
    const en = new Date(endDate + "T00:00:00");
    s.setDate(s.getDate() + days);
    en.setDate(en.getDate() + days);
    const fmt = d => d.toISOString().split("T")[0];
    startDate = fmt(s);
    endDate = fmt(en);
    if (typeof loadDashboardData === "function") loadDashboardData();
    showToast(`📅 ${startDate} → ${endDate}`, 2000);
  }

  function applyQuickRange(id) {
    if (typeof getDateRange !== "function") return;
    const r = getDateRange(id);
    if (!r) return;
    startDate = r.start;
    endDate = r.end;
    if (typeof loadDashboardData === "function") loadDashboardData();
    showToast(`📅 ${startDate} → ${endDate}`, 2000);
  }

  let _kbFocusedIdx = -1;
  function navigateCampaigns(dir) {
    const items = [...document.querySelectorAll(".campaign_item .campaign_main")];
    if (!items.length) return;
    _kbFocusedIdx = Math.min(Math.max(0, _kbFocusedIdx + dir), items.length - 1);
    items[_kbFocusedIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    items[_kbFocusedIdx]?.closest(".campaign_item")?.classList.add("show");
  }
})();

// ================================================================
// =================== SHARE URL FEATURE ==========================
// ================================================================
