// --- Summary Metrics Logic ---
var SUMMARY_METRICS = JSON.parse(localStorage.getItem("dom_summary_metrics")) || ["impressions", "reach", "message_started"];
// --- Summary Metrics UI Logic ---
window.openSummarySettings = function () {
  const modal = document.getElementById("summary_settings_modal");
  if (!modal) return;
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  const list = document.getElementById("summary_available_list");
  list.innerHTML = Object.keys(METRIC_REGISTRY)
    .filter(id => id !== "spend")
    .map(id => {
      const active = SUMMARY_METRICS.includes(id);
      return `
        <div class="summary_option ${active ? 'active' : ''}" onclick="toggleSummaryMetric('${id}')" data-id="${id}" 
             style="display: flex; align-items:center; gap: 1.2rem; padding: 1.2rem; border: 1.5px solid ${active ? 'var(--mainClr)' : '#e2e8f0'}; border-radius: 12px; cursor:pointer; background:${active ? '#fffbeb' : '#fff'}; transition:all 0.2s; position:relative;">
          <div style="width: 3.2rem; height: 3.2rem; border-radius: 8px; background: ${active ? 'var(--mainClr)' : '#f1f5f9'}; display: flex; align-items: center; justify-content: center;">
            <i class="${METRIC_REGISTRY[id].icon || 'fa-solid fa-chart-simple'}" style="color: ${active ? '#fff' : '#64748b'}; font-size: 1.4rem;"></i>
          </div>
          <span style="font-size:1.35rem; font-weight:600; color: ${active ? 'var(--mainClrText)' : '#1e293b'};">${METRIC_REGISTRY[id].label}</span>
          <i class="fa-solid fa-circle-check check-icon" style="margin-left:auto; color:var(--mainClr); font-size: 1.6rem; display:${active ? 'block' : 'none'}"></i>
        </div>
      `;
    }).join("");
};
window.domAlert = function (msg) {
  const modal = document.getElementById("dom_alert_modal");
  const msgEl = document.getElementById("dom_alert_message");
  if (!modal || !msgEl) return;
  msgEl.innerText = msg;
  modal.style.display = "flex";
  setTimeout(() => {
    modal.classList.add("active");
    document.getElementById("dom_alert_content").style.transform = "scale(1)";
  }, 10);
};

window.closeDomAlert = function () {
  const modal = document.getElementById("dom_alert_modal");
  const content = document.getElementById("dom_alert_content");
  if (content) content.style.transform = "scale(0.9)";
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 200);
  }
};

window.toggleSummaryMetric = function (id) {
  const idx = SUMMARY_METRICS.indexOf(id);
  if (idx > -1) {
    SUMMARY_METRICS.splice(idx, 1);
  } else {
    if (SUMMARY_METRICS.length >= 3) {
      domAlert("Bạn chỉ được chọn tối đa 3 chỉ số phụ.");
      return;
    }
    SUMMARY_METRICS.push(id);
  }

  document.querySelectorAll(".summary_option").forEach(el => {
    const eid = el.dataset.id;
    const active = SUMMARY_METRICS.includes(eid);
    el.style.borderColor = active ? "var(--mainClr)" : "#e2e8f0";
    el.style.background = active ? "#fffbeb" : "#fff";
    const iconContainer = el.querySelector("div");
    iconContainer.style.background = active ? "var(--mainClr)" : "#f1f5f9";
    iconContainer.querySelector("i").style.color = active ? "#fff" : "#64748b";
    el.querySelector(".check-icon").style.display = active ? 'block' : 'none';
  });
};

window.saveSummarySettings = function () {
  if (SUMMARY_METRICS.length !== 3) {
    domAlert("Vui lòng chọn đúng 3 chỉ số phụ.");
    return;
  }
  localStorage.setItem("dom_summary_metrics", JSON.stringify(SUMMARY_METRICS));

  // Đồng bộ với Google Sheets nếu có function
  if (typeof window.saveSummaryMetricsSync === "function") {
    window.saveSummaryMetricsSync(SUMMARY_METRICS).catch(e => console.warn("Sync summary settings failed:", e));
  }

  const modal = document.getElementById("summary_settings_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 300);
  }
  updateSummaryCardHTML();
  loadDashboardData();
};

window.closeSummarySettings = function () {
  const modal = document.getElementById("summary_settings_modal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
  SUMMARY_METRICS = JSON.parse(localStorage.getItem("dom_summary_metrics")) || ["impressions", "reach", "message_started"];
};

function updateSummaryCardHTML() {
  const container = document.querySelector(".dom_total_report ul");
  if (!container) return;

  let html = `
    <li class="total_spent">
      <span><i class="${METRIC_REGISTRY.spend.icon}"></i> ${METRIC_REGISTRY.spend.label}</span>
      <p id="spent">
        <span>-</span>
        <span>-%</span>
      </p>
    </li>
  `;

  SUMMARY_METRICS.forEach(id => {
    const meta = METRIC_REGISTRY[id];
    if (!meta) return;
    html += `
      <li id="card_${id}">
        <span><i class="${meta.icon || 'fa-solid fa-chart-simple'}"></i> ${meta.label}</span>
        <p id="${id}">
          <span>-</span>
          <span>-%</span>
        </p>
      </li>
    `;
  });

  container.innerHTML = html;
}

// Chạy update khi DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateSummaryCardHTML);
} else {
  updateSummaryCardHTML();
}

// 🦴 Show skeleton NGAY lập tức khi DOM ready — không chờ token hay main()
(function () {
  function _showSkeletonEarly() {
    if (typeof toggleSkeletons === "function") {
      toggleSkeletons(".dom_dashboard", true);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _showSkeletonEarly);
  } else {
    _showSkeletonEarly();
  }
})();
