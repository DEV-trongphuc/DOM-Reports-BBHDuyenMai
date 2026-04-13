/**
 * @file age_gender_chart.js
 * @description Loader wrapper và biểu đồ tuổi/giới tính.
 *
 * loadAgeGenderSpendChart(campaignIds)  — fetch + render
 *   @renders  xem js/charts/render_age_gender.js
 *
 * ============================================================
 * ⚠️  Các hàm DƯỚI ĐÂY SAI CHỔ — nên tách ra js/ui/date_picker.js:
 * ============================================================
 * • initDateSelector()
 *     @renders  .dom_select.time → .time_picker_panel (toggle dropdown)
 *              #start_date_val, #end_date_val (input)
 *
 * • renderCalendar()
 *     @renders  #calendar_left (hưới lịch tháng)
 *
 * • window.changeMonth(dir)
 *     @uses     renderCalendar()
 *
 * • window.selectCalendarDay(dateStr)
 *     @renders  #start_date_val, #end_date_val + .time_picker_sidebar li highlights
 *
 * • getDateRange(type)    → Nên ở: js/core/utils.js
 * • formatDateLocal(date) → Nên ở: js/core/utils.js
 * • reloadDashboard()     → Nên ở: js/core/dashboard.js
 */
async function loadAgeGenderSpendChart(campaignIds = []) {
  const data = await fetchSpendByAgeGender(campaignIds);
  renderAgeGenderChart(data);
}

// =================== DATE PICKER LOGIC (FB ADS STYLE) ===================
// Variables moved to top to avoid TDZ error

function initDateSelector() {
  const selectBox = document.querySelector(".dom_select.time");
  if (!selectBox) return;

  const selectedText = selectBox.querySelector(".dom_selected");
  const panel = selectBox.querySelector(".time_picker_panel");
  const presetItems = panel.querySelectorAll(".time_picker_sidebar li[data-date]");
  const updateBtn = panel.querySelector(".btn_update");
  const cancelBtn = panel.querySelector(".btn_cancel");
  const startInput = panel.querySelector("#start_date_val");
  const endInput = panel.querySelector("#end_date_val");

  // Initial display sync
  if (startDate && endDate) {
    startInput.value = startDate;
    endInput.value = endDate;
    tempStartDate = startDate;
    tempEndDate = endDate;
  }

  // Prevent duplicate listeners
  if (selectBox.dataset.initialized) {
    return;
  }
  selectBox.dataset.initialized = "true";

  // Prevent clicks inside the panel from bubbling effectively
  panel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Toggle dropdown
  selectBox.addEventListener("click", (e) => {
    // If clicking inside panel (though handled above, safety check) use return
    if (e.target.closest(".time_picker_panel")) return;

    // Stop propagation to prevent document listeners from closing it immediately
    e.stopPropagation();

    const isActive = panel.classList.contains("active");
    // Close all other dropdowns
    document.querySelectorAll(".dom_select_show").forEach(p => p.classList.remove("active"));

    if (!isActive) {
      panel.classList.add("active");
      renderCalendar();
    }
  });

  // Handle sidebar presets
  presetItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = item.dataset.date;

      // Reset active state
      presetItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      if (type === "custom_range") {
        // Just focus on the calendar
        return;
      }

      const range = getDateRange(type);
      startDate = range.start;
      endDate = range.end;
      tempStartDate = startDate;
      tempEndDate = endDate;

      startInput.value = startDate;
      endInput.value = endDate;

      selectedText.textContent = item.querySelector('span:last-child').textContent.trim();
      panel.classList.remove("active");

      // Update calendar highlights
      renderCalendar();

      // Refresh dashboard
      reloadDashboard();
    });
  });

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.remove("active");
      // Reset temp to match actual global
      tempStartDate = startDate;
      tempEndDate = endDate;
    });
  }

  // Update button
  if (updateBtn) {
    updateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const start = startInput.value;
      const end = endInput.value;

      if (!start || !end) {
        domAlert("⛔ Vui lòng chọn đầy đủ ngày!");
        return;
      }

      const s = new Date(start);
      const eD = new Date(end);
      if (eD < s) {
        domAlert("⚠️ Ngày kết thúc phải sau ngày bắt đầu!");
        return;
      }

      const fmt = (d) => {
        const [y, m, da] = d.split("-");
        return `${da}/${m}/${y}`;
      };

      startDate = start;
      endDate = end;
      selectedText.textContent = `${fmt(start)} - ${fmt(end)}`;
      panel.classList.remove("active");

      reloadDashboard();
    });
  }

  // Handle manual input changes
  startInput.addEventListener('change', () => {
    tempStartDate = startInput.value;
    renderCalendar();
  });
  endInput.addEventListener('change', () => {
    tempEndDate = endInput.value;
    renderCalendar();
  });
}

// Helper to format date in Local Time (YYYY-MM-DD)
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderCalendar() {
  const container = document.getElementById("calendar_left");
  if (!container) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const firstDayOfMonth = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
  const daysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();

  let html = `
    <div class="calendar_nav">
      <button onclick="changeMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <span>${monthNames[calendarCurrentMonth]} ${calendarCurrentYear}</span>
      <button onclick="changeMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="calendar_grid">
      <div class="calendar_day_name">Su</div>
      <div class="calendar_day_name">Mo</div>
      <div class="calendar_day_name">Tu</div>
      <div class="calendar_day_name">We</div>
      <div class="calendar_day_name">Th</div>
      <div class="calendar_day_name">Fr</div>
      <div class="calendar_day_name">Sa</div>
  `;

  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar_day empty"></div>`;
  }

  const todayStr = formatDateLocal(new Date());
  const start = tempStartDate ? new Date(tempStartDate) : null;
  const end = tempEndDate ? new Date(tempEndDate) : null;

  for (let day = 1; day <= daysInMonth; day++) {
    const curDate = new Date(calendarCurrentYear, calendarCurrentMonth, day);
    const curDateStr = formatDateLocal(curDate);

    let classes = ["calendar_day"];
    if (curDateStr === todayStr) classes.push("today");

    if (start && curDateStr === tempStartDate) classes.push("selected");
    if (end && curDateStr === tempEndDate) classes.push("selected");

    if (start && end && curDate > start && curDate < end) {
      classes.push("in_range");
    }

    html += `<div class="${classes.join(' ')}" onclick="selectCalendarDay('${curDateStr}')">${day}</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// Attach these to window so they're accessible from inline onclick if needed
// or better, use standard listeners. I'll use standard but for quick iteration here:
window.changeMonth = (dir) => {
  calendarCurrentMonth += dir;
  if (calendarCurrentMonth < 0) {
    calendarCurrentMonth = 11;
    calendarCurrentYear--;
  } else if (calendarCurrentMonth > 11) {
    calendarCurrentMonth = 0;
    calendarCurrentYear++;
  }
  renderCalendar();
};

window.selectCalendarDay = (dateStr) => {
  const startInput = document.getElementById("start_date_val");
  const endInput = document.getElementById("end_date_val");

  if (!tempStartDate || (tempStartDate && tempEndDate)) {
    // Start fresh selection
    tempStartDate = dateStr;
    tempEndDate = null;
    startInput.value = dateStr;
    endInput.value = "";
  } else {
    // Selecting the end date
    if (dateStr === tempStartDate) {
      // Deselect if clicking the same day twice when no end date set
      tempStartDate = null;
      startInput.value = "";
    } else {
      const s = new Date(tempStartDate);
      const e = new Date(dateStr);

      if (e < s) {
        tempEndDate = tempStartDate;
        tempStartDate = dateStr;
      } else {
        tempEndDate = dateStr;
      }

      startInput.value = tempStartDate;
      endInput.value = tempEndDate;
    }
  }

  // Highlight "Custom Date" in sidebar
  const presetItems = document.querySelectorAll(".time_picker_sidebar li[data-date]");
  presetItems.forEach(i => i.classList.remove("active"));
  const customLi = document.querySelector('li[data-date="custom_range"]');
  if (customLi) customLi.classList.add("active");

  renderCalendar();
};

// =================== PRESET RANGE ===================
function getDateRange(type) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (type) {
    case "today":
      break;
    case "yesterday":
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;
    case "last_7days":
      start.setDate(today.getDate() - 6);
      break;
    case "last_30days":
      start.setDate(today.getDate() - 29);
      break;
    case "this_week": {
      const day = today.getDay() || 7;
      start.setDate(today.getDate() - day + 1);
      break;
    }
    case "last_week": {
      const day = today.getDay() || 7;
      end.setDate(today.getDate() - day);
      start.setDate(today.getDate() - day - 6);
      break;
    }
    case "this_month":
      start.setDate(1);
      break;
    case "last_month":
      start.setMonth(today.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      end.setMonth(today.getMonth() - 1, lastDayPrevMonth);
      break;
  }

  // Use local formatter instead of UTC
  const fmt = (d) => formatDateLocal(d);
  return { start: fmt(start), end: fmt(end) };
}

// =================== RELOAD DASHBOARD ===================
function reloadDashboard() {
  const loading = document.querySelector(".loading");
  if (loading) loading.classList.add("active");

  // 💡 Cập nhật text range đang chọn (VD: "01/06/2025 - 28/06/2025")
  const domDate = document.querySelector(".dom_date");
  if (domDate) {
    const fmt = (d) => {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    };
    domDate.textContent = `${fmt(startDate)} - ${fmt(endDate)}`;
  }
  const selectedText = document.querySelector(".quick_filter .dom_selected");
  if (selectedText) selectedText.textContent = "Quick filter"; // Đặt lại text filter bảng về mặc định

  // Gọi các hàm load dữ liệu
  // Nếu có bộ lọc, applyCampaignFilter sẽ tự gọi loadAllDashboardCharts(ids) sau khi load list xong
  if (!CURRENT_CAMPAIGN_FILTER || CURRENT_CAMPAIGN_FILTER.toUpperCase() === "RESET") {
    loadAllDashboardCharts();
  }

  loadCampaignList().finally(() => {
    // 🚩 Nếu đang có bộ lọc thì áp dụng lại để lọc danh sách và cập nhật dashboard
    if (CURRENT_CAMPAIGN_FILTER && CURRENT_CAMPAIGN_FILTER.toUpperCase() !== "RESET") {
      applyCampaignFilter(CURRENT_CAMPAIGN_FILTER);
    }
    if (loading) loading.classList.remove("active");
  });

  // 🔹 Refresh Google Ads with FORCE fetch because dates changed
  if (typeof fetchGoogleAdsData === 'function') {
    fetchGoogleAdsData(true);
  }
}

// =================== MAIN INIT ===================

