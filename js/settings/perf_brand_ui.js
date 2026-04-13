function updatePerfBrandDropdownUI() {
  const brands     = loadBrandSettings();
  const dropdownUl = document.getElementById("perf_brand_list");
  if (!dropdownUl) return;

  const current = (CURRENT_CAMPAIGN_FILTER || "").toUpperCase() === "RESET"
    ? ""
    : (CURRENT_CAMPAIGN_FILTER || "").toLowerCase();

  dropdownUl.innerHTML = brands.map((b) => {
    const bFilter  = (b.filter || "").toLowerCase();
    const isActive = bFilter === current;
    return `
    <li data-filter="${b.filter}" class="${isActive ? "active" : ""}">
      <img src="${b.img}" />
      <span>${b.name}</span>
    </li>`;
  }).join("");

  const selectedBrand = brands.find((b) => (b.filter || "").toLowerCase() === current) || brands[brands.length - 1];
  if (selectedBrand) {
    const parentText = document.getElementById("perf_selected_brand");
    const parentImg  = document.getElementById("perf_selected_brand_img");
    if (parentText) parentText.textContent = selectedBrand.name;
    if (parentImg) {
      const hideImg = !selectedBrand.img || selectedBrand.img.includes("ampersand_img.jpg");
      parentImg.style.display = hideImg ? "none" : "block";
      if (!hideImg) parentImg.src = selectedBrand.img;
    }
  }
}
