// ── Goal Settings Modal Logic ────────────────────────────────
function openGoalSettings() {
  const modal = document.getElementById("goal_settings_modal");
  if (!modal) return;
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  modal.innerHTML = `
    <div style="background:#fff; width:48rem; border-radius:18px; box-shadow:0 20px 50px rgba(0,0,0,0.15); display:flex; flex-direction:column; overflow:hidden;">
      <div style="padding:1.6rem 2rem; background:linear-gradient(135deg,#f8fafc,#f1f5f9); border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
        <h3 style="margin:0; font-size:1.6rem; color:#1e293b;"><i class="fa-solid fa-gear" style="margin-right:0.6rem; color:#f59e0b;"></i> Cài đặt Dashboard</h3>
        <i class="fa-solid fa-xmark" onclick="closeGoalSettings()" style="cursor:pointer; color:#94a3b8; font-size:1.6rem;"></i>
      </div>
      <div style="padding:2.4rem; overflow-y:auto; max-height:60vh;">
        <!-- Toggle Mode -->
        <div style="margin-bottom:2.4rem; padding-bottom:1.6rem; border-bottom:1px dashed #e2e8f0;">
           <label style="display:block; font-size:1.2rem; font-weight:700; color:#475569; margin-bottom:1rem;">Chế độ hiển thị Custom Bar</label>
           <div style="display:flex; gap:1rem;">
             <button onclick="window.setGoalChartMode('keyword')" id="mode_kw_btn" style="flex:1; padding:0.8rem; border-radius:8px; border:1.5px solid ${GOAL_CHART_MODE === 'keyword' ? '#f59e0b' : '#e2e8f0'}; background:${GOAL_CHART_MODE === 'keyword' ? '#fffaf0' : '#fff'}; color:${GOAL_CHART_MODE === 'keyword' ? '#f59e0b' : '#64748b'}; font-weight:600; cursor:pointer;">
               <i class="fa-solid fa-tags"></i> Keyword Goal
             </button>
             <button onclick="window.setGoalChartMode('brand')" id="mode_br_btn" style="flex:1; padding:0.8rem; border-radius:8px; border:1.5px solid ${GOAL_CHART_MODE === 'brand' ? '#f59e0b' : '#e2e8f0'}; background:${GOAL_CHART_MODE === 'brand' ? '#fffaf0' : '#fff'}; color:${GOAL_CHART_MODE === 'brand' ? '#f59e0b' : '#64748b'}; font-weight:600; cursor:pointer;">
               <i class="fa-solid fa-building"></i> Brand Groups
             </button>
           </div>
        </div>
        <!-- Keyword list -->
        <div id="keyword_settings_container" style="${GOAL_CHART_MODE === 'brand' ? 'display:none' : ''}">
          <label style="display:block; font-size:1.2rem; font-weight:700; color:#475569; margin-bottom:1rem;">Danh sách từ khóa Goal</label>
          <div id="goal_keyword_list" style="display:flex; flex-wrap:wrap; gap:0.8rem; margin-bottom:1.6rem;"></div>
          <div style="display:flex; gap:0.8rem;">
            <input type="text" id="new_goal_kw" placeholder="Thêm từ khóa mới..." style="flex:1; padding:0.7rem 1.2rem; border-radius:8px; border:1.5px solid #e2e8f0; outline:none; font-size:1.25rem;">
            <button onclick="addNewGoalKeyword()" style="background:#f59e0b; color:#fff; border:none; padding:0 1.6rem; border-radius:8px; cursor:pointer; font-weight:700;">Thêm</button>
          </div>
        </div>
        <div id="brand_settings_note" style="${GOAL_CHART_MODE === 'keyword' ? 'display:none' : ''}">
          <p style="font-size:1.2rem; color:#64748b; line-height:1.5; margin:0;">
            <i class="fa-solid fa-circle-info"></i> Ở chế độ <b>Brand Groups</b>, biểu đồ sẽ hiển thị tổng Spend dựa trên các filter của từng Brand được cấu hình trong <b>Brand Settings</b>.
          </p>
        </div>
      </div>
      <div style="padding:1.6rem 2.4rem; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:1.2rem;">
        <button onclick="closeGoalSettings()" style="padding:0.8rem 2rem; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; font-weight:600; cursor:pointer;">Hủy</button>
        <button onclick="saveGoalSettings()" style="padding:0.8rem 2rem; border-radius:8px; border:none; background:#1e293b; color:#fff; font-weight:600; cursor:pointer;">Lưu thay đổi</button>
      </div>
    </div>
  `;

  renderGoalKeywordsInModal();
}
window.openGoalSettings = openGoalSettings;

function closeGoalSettings() {
  const modal = document.getElementById("goal_settings_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 300);
  }
}
window.closeGoalSettings = closeGoalSettings;

function renderGoalKeywordsInModal() {
  const list = document.getElementById("goal_keyword_list");
  if (!list) return;

  list.innerHTML = GOAL_KEYWORDS.map((kw, idx) => `
      <div style="display:flex; gap:0.8rem; align-items:center;">
        <input type="text" value="${kw}" class="goal_keyword_input" style="flex:1; padding:0.8rem 1.2rem; border-radius:8px; border:1px solid #ddd; font-size:1.3rem;">
        <button onclick="removeGoalKeyword(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:0.8rem; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join("");
}

window.removeGoalKeyword = function (idx) {
  GOAL_KEYWORDS.splice(idx, 1);
  renderGoalKeywordsInModal();
};

window.addNewGoalKeyword = function () {
  const input = document.getElementById("new_goal_kw");
  if (!input || !input.value.trim()) return;

  GOAL_KEYWORDS.push(input.value.trim());
  input.value = "";
  renderGoalKeywordsInModal();
};


window.saveGoalSettings = async function () {
  const inputs = document.querySelectorAll(".goal_keyword_input");
  const newKeywords = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);

  if (GOAL_CHART_MODE === 'keyword' && !newKeywords.length) {
    showToast("Vui lòng nhập ít nhất 1 từ khóa");
    return;
  }

  GOAL_KEYWORDS = newKeywords;

  // 1. Lưu local + đóng modal + re-render ngay
  localStorage.setItem("goal_keywords", JSON.stringify(GOAL_KEYWORDS));
  localStorage.setItem("goal_chart_mode", GOAL_CHART_MODE);
  closeGoalSettings();
  showToast("Đã đồng bộ cấu hình thiết lập");

  if (window._ALL_CAMPAIGNS) {
    const campaigns = window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS;
    const allAds = campaigns.flatMap((c) =>
      c.adsets.flatMap((as) =>
        (as.ads || []).map((ad) => ({
          campaign_name: c.name,
          insights: { spend: ad.spend || 0 },
        }))
      )
    );
    renderGoalChart(allAds);
  }

  // 2. Lưu lên sheet ngầm (non-blocking)
  if (typeof saveGoalSettingsSync === "function") {
    saveGoalSettingsSync(GOAL_KEYWORDS, GOAL_CHART_MODE).catch(err => {
      console.warn("Settings sync failed:", err);
      showToast("⚠️ Không thể đồng bộ cấu hình, vui lòng thử lại");
    });
  }
};

// ── Toast notification utility ────────────────────────────────
function showToast(msg, duration = 2500) {
  let toast = document.getElementById("kb_toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "kb_toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}
