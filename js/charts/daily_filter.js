function setupDetailDailyFilter() {
  const qualitySelect = document.querySelector(".dom_select.daily");
  if (!qualitySelect) return;

  const list       = qualitySelect.querySelector("ul.dom_select_show");
  const selectedEl = qualitySelect.querySelector(".dom_selected");
  const allItems   = list.querySelectorAll("li");

  qualitySelect.onclick = (e) => {
    e.stopPropagation();
    const isActive = list.classList.contains("active");
    document.querySelectorAll(".dom_select_show").forEach((ul) => ul !== list && ul.classList.remove("active"));
    list.classList.toggle("active", !isActive);
  };

  allItems.forEach((li) => {
    li.onclick = (e) => {
      e.stopPropagation();
      if (li.classList.contains("active")) {
        list.classList.remove("active");
        return;
      }
      allItems.forEach((el) => el.classList.remove("active"));
      list.querySelectorAll(".radio_box").forEach((r) => r.classList.remove("active"));
      li.classList.add("active");
      li.querySelector(".radio_box").classList.add("active");
      selectedEl.textContent = li.textContent.trim();
      renderDetailDailyChart(window.dataByDate, li.dataset.type);
      list.classList.remove("active");
    };
  });

  document.addEventListener("click", (e) => {
    if (!qualitySelect.contains(e.target)) list.classList.remove("active");
  });
}
