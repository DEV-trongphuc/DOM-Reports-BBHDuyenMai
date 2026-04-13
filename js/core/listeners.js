/**
 * Event delegation — gán 1 listener cho container cha thay vì N listener riêng lẻ.
 * Chạy 1 lần khi initDashboard.
 */
function addListeners() {
  const wrap = document.querySelector(".view_campaign_box");
  if (!wrap) {
    console.warn("Không tìm thấy container .view_campaign_box để gán listener.");
    return;
  }

  // Clicks bên trong .view_campaign_box
  wrap.addEventListener("click", (e) => {
    // Click Campaign → mở/đóng Adset list
    const campaignMain = e.target.closest(".campaign_main");
    if (campaignMain) {
      if (e.target.closest(".row_checkbox_wrap")) return;
      e.stopPropagation();
      const campaignItem = campaignMain.closest(".campaign_item");
      if (!campaignItem) return;
      campaignItem.classList.toggle("show");
      if (campaignItem.classList.contains("show")) loadLazyImages(campaignItem);
      return;
    }

    // Click nút insight của adset (phải check trước .adset_item)
    const adsetInsightBtn = e.target.closest(".adset_insight_btn");
    if (adsetInsightBtn) {
      e.stopPropagation();
      handleAdsetInsightClick(adsetInsightBtn);
      return;
    }

    // Click Adset → mở/đóng Ad list
    const adsetItem = e.target.closest(".adset_item");
    if (adsetItem) {
      if (e.target.closest(".row_checkbox_wrap")) return;
      e.stopPropagation();
      adsetItem.classList.toggle("show");
      if (adsetItem.classList.contains("show")) {
        const adItemBox = adsetItem.nextElementSibling;
        if (adItemBox && adItemBox.classList.contains("ad_item_box")) {
          loadLazyImages(adItemBox);
        }
      }
      return;
    }

    // Click nút "View Ad Detail"
    const adViewBtn = e.target.closest(".ad_view");
    if (adViewBtn) {
      e.stopPropagation();
      handleViewClick(e, "ad");
    }
  });

  // Checkbox change — event delegation
  wrap.addEventListener("change", (e) => {
    const cb = e.target.closest(".row_checkbox");
    if (!cb) return;

    if (cb.dataset.level === "campaign") {
      const campaignItem = cb.closest(".campaign_item");
      if (campaignItem) {
        campaignItem.querySelectorAll(".row_checkbox").forEach((child) => {
          child.checked = cb.checked;
          child.closest(".campaign_item, .adset_item, .ad_item")?.classList.toggle("sel-checked", cb.checked);
        });
        campaignItem.classList.toggle("sel-checked", cb.checked);
      }
    } else if (cb.dataset.level === "adset") {
      const adsetItem = cb.closest(".adset_item");
      if (adsetItem) {
        const adItemBox = adsetItem.nextElementSibling;
        if (adItemBox && adItemBox.classList.contains("ad_item_box")) {
          adItemBox.querySelectorAll(".row_checkbox").forEach((child) => {
            child.checked = cb.checked;
            child.closest(".ad_item")?.classList.toggle("sel-checked", cb.checked);
          });
        }
        adsetItem.classList.toggle("sel-checked", cb.checked);
      }
    } else {
      cb.closest(".ad_item")?.classList.toggle("sel-checked", cb.checked);
    }
    updateSelectionSummary();
  });

  // Đóng popup chi tiết khi click overlay
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dom_overlay")) return;
    document.querySelector("#dom_detail")?.classList.remove("active");
  });

  // Export CSV
  document.getElementById("export_csv_btn")?.addEventListener("click", () => {
    if (typeof exportAdsToCSV === "function") exportAdsToCSV();
  });

  // Select-all / deselect-all header checkbox
  document.addEventListener("change", (e) => {
    if (e.target.id !== "select_all_cb") return;
    document.querySelectorAll(".view_campaign_box .row_checkbox").forEach((cb) => {
      cb.checked = e.target.checked;
      cb.closest(".campaign_item, .adset_item, .ad_item")?.classList.toggle("sel-checked", e.target.checked);
    });
    updateSelectionSummary();
  });
}
