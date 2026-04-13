function setupFilterDropdown() {
  const actionFilter = document.querySelector(".dom_select.year_filter");
  if (!actionFilter) return;

  const actionList   = actionFilter.querySelector("ul.dom_select_show");
  const selectedAction = actionFilter.querySelector(".dom_selected");
  const actionItems  = actionList.querySelectorAll("li");

  actionFilter.addEventListener("click", (e) => {
    e.stopPropagation();
    const isActive = actionList.classList.contains("active");
    document.querySelectorAll(".dom_select_show.active").forEach((ul) => {
      if (ul !== actionList) ul.classList.remove("active");
    });
    actionList.classList.toggle("active", !isActive);
  });

  actionItems.forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      const actionType = li.dataset.type;

      if (li.classList.contains("active")) {
        actionList.classList.remove("active");
        return;
      }

      actionItems.forEach((el) => el.classList.remove("active"));
      actionList.querySelectorAll(".radio_box").forEach((r) => r.classList.remove("active"));
      li.classList.add("active");
      li.querySelector(".radio_box").classList.add("active");
      selectedAction.textContent = li.textContent.trim();

      const yearEl = document.querySelector(".dom_select.year .dom_selected");
      const year   = parseInt(yearEl.textContent, 10);
      if (isNaN(year)) {
        console.error("Không thể lấy năm hiện tại");
        return;
      }

      renderMonthlyChart(processMonthlyData(DATA_YEAR), actionType);
      actionList.classList.remove("active");
    });
  });

  document.addEventListener("click", (e) => {
    if (!actionFilter.contains(e.target)) actionList.classList.remove("active");
  });
}
