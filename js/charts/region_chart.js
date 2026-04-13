/**
 * @file region_chart.js
 * @description Vẽ biểu đồ chi tiêu theo tỉnh thành (bar chart, top 5).
 *
 * renderRegionChart(data)
 *   @renders  #region_chart (canvas bar) → window.chart_region_total
 *
 * ============================================================
 * ⚠️  Các hàm DƯỚI ĐÂY SAI CHỔ — cần tách ra file đúng:
 * ============================================================
 * • Quick Filter / Status Filter dropdown (dòng ~148-427)
 *     → Nên ở: js/filters/quick_filter.js
 *
 * • DOMContentLoaded block lớn (dòng ~429-669) chứa:
 *     - date picker init, preview button, menu items, account dropdown,
 *       quick_filter_detail, perf_brand_selector
 *     → Nên ở: js/core/listeners.js
 *
 * • fetchAdAccountInfo() (dòng ~671-753)
 *     @renders  #detail_balance, #detail_vat, #detail_method,
 *               #detail_total_report .dom_total_report.balance ul li:nth-child(3)
 *     → Nên ở: js/api/account.js
 *
 * • getYears() (dòng ~755-758)
 *     → Nên ở: js/core/utils.js
 *
 * @depends   makeGoldGradient, makeGrayGradient, formatMoneyShort,
 *            ChartDataLabels, CHART_TICK_MID, CHART_GRID_COLOR,
 *            CHART_GRID_BORDER, CHART_TICK_LIGHT
 */
function renderRegionChart(data = []) {
  if (!Array.isArray(data) || !data.length) return;

  const ctx = document.getElementById("region_chart");
  if (!ctx) return;
  const c2d = ctx.getContext("2d");

  if (window.chart_region_total instanceof Chart) {
    try {
      window.chart_region_total.destroy();
    } catch (err) {
      console.warn("⚠️ Chart destroy error:", err);
    }
  }
  window.chart_region_total = null;

  const regionSpend = {};
  data.forEach((d) => {
    let region = (d.region || "").trim();
    if (!region || region.toUpperCase() === "UNKNOWN") return;

    region = region
      .replace(/\b(province|city|region|state|district|area|zone)\b/gi, "")
      .replace(/\b(tỉnh|thành phố|tp|quận|huyện)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const spend = parseFloat(d.spend || 0);
    if (spend <= 0) return;

    const key = region.toLowerCase();
    regionSpend[key] = (regionSpend[key] || 0) + spend;
  });

  const totalSpend = Object.values(regionSpend).reduce((a, b) => a + b, 0);
  if (totalSpend === 0) return;

  // ✅ Top 5 cao nhất
  const allEntries = Object.entries(regionSpend).filter(([_, v]) => v > 0);
  allEntries.sort((a, b) => b[1] - a[1]);
  const filtered = allEntries.slice(0, 5);
  if (!filtered.length) return;

  // ✅ Helper rút gọn tên
  const shortenRegion = (name) => {
    let s = name
      .replace(/\b(tỉnh|thành phố|thành phố trực thuộc trung ương|tp\.|tp|province|city|region|state|district|area|zone)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .normalize("NFC");
    return s.length > 12 ? s.slice(0, 11) + "…" : s;
  };

  // ✅ Chuẩn hoá label
  const regions = filtered.map(([r]) => shortenRegion(r));
  const fullNames = filtered.map(([r]) =>
    r.replace(/\b\w/g, (c) => c.toUpperCase()).normalize("NFC").trim()
  );

  const values = filtered.map(([_, v]) => Math.round(v));

  const [maxRegion] = filtered.reduce((a, b) => (a[1] > b[1] ? a : b));

  const gradientGold = makeGoldGradient(c2d, 300);
  const gradientGray = makeGrayGradient(c2d, 300);

  const bgColors = filtered.map(([r]) =>
    r === maxRegion ? gradientGold : gradientGray
  );

  const isFew = regions.length < 3;
  const barWidth = isFew ? 0.35 : undefined;
  const catWidth = isFew ? 0.65 : undefined;

  window.chart_region_total = new Chart(c2d, {
    type: "bar",
    data: {
      labels: regions,
      datasets: [
        {
          label: "Spend",
          data: values,
          backgroundColor: bgColors,
          borderRadius: 8,
          borderWidth: 0,
          ...(isFew && {
            barPercentage: barWidth,
            categoryPercentage: catWidth,
          }),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10 } },
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) => fullNames[ctx[0].dataIndex] || ctx[0].label,
            label: (ctx) => `Spend: ${formatMoneyShort(ctx.raw)}`,
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          offset: 2,
          font: { size: 11, weight: "600" },
          color: CHART_TICK_MID,
          formatter: (v) => (v > 0 ? formatMoneyShort(v) : ""),
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_GRID_COLOR,
            drawBorder: true,
            borderColor: CHART_GRID_BORDER,
          },
          ticks: {
            color: CHART_TICK_LIGHT,
            font: { weight: "600", size: 9 },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false, // ✅ không bỏ label nữa
            maxTicksLimit: regions.length, // ✅ bắn full
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: CHART_GRID_COLOR,
            drawBorder: true,
            borderColor: CHART_GRID_BORDER,
          },
          ticks: { display: false },
          suggestedMax: Math.max(...values) * 1.2,
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// 🎯 Quick Filter Logic

const quickFilterBox = document.querySelector(".quick_filter");
if (quickFilterBox) {
  const selectedText = quickFilterBox.querySelector(".dom_selected");
  const listItems = quickFilterBox.querySelectorAll(".dom_select_show li");

  listItems.forEach((li) => {
    li.addEventListener("click", async (e) => {
      e.stopPropagation(); // 🧱 chặn sự kiện lan lên .quick_filter

      // Xóa highlight cũ
      listItems.forEach((x) => x.classList.remove("active"));
      li.classList.add("active");

      // Lấy label & data-view
      const label = li.querySelector("span:last-child")?.innerHTML || "";
      const view = li.querySelector(".view_quick")?.dataset.view || "";

      // Hiển thị text đã chọn
      selectedText.innerHTML = label;

      // --- 🔹 Active campaigns ---
      if (view === "active_ads") {
        const activeLower = "active";

        const activeCampaigns = window._ALL_CAMPAIGNS.filter((c) => {
          let campaignActive = false;
          for (const adset of c.adsets || []) {
            for (const ad of adset.ads || []) {
              if ((ad.status || "").toLowerCase() === activeLower) {
                campaignActive = true;
                break;
              }
            }
            if (campaignActive) break;
          }
          return campaignActive;
        });

        renderCampaignView(activeCampaigns);
      }

      // --- 🔹 Campaigns with Spend ---
      else if (view === "spent_ads") {
        const spentCampaigns = window._ALL_CAMPAIGNS.filter((c) => {
          const spend = +c.spend || 0;
          return spend > 0;
        });
        renderCampaignView(spentCampaigns);
      }

      // --- 🔹 Lead Ads (Optimization Goal) ---
      else if (view === "lead_ads_goal") {
        const leadAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some(
            (adset) =>
              adset.optimization_goal?.toLowerCase().includes("lead")
          )
        );

        renderCampaignView(leadAdsCampaigns);
      }

      // --- 🔹 Message Ads (Optimization Goal) ---
      else if (view === "mess_ads_goal") {
        const messageAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some(
            (adset) =>
              adset.optimization_goal?.toLowerCase() === "replies" ||
              adset.optimization_goal?.toLowerCase() === "messaging_conversation_started_7d"
          )
        );

        renderCampaignView(messageAdsCampaigns);
      }

      // --- 🔹 Engagement Ads (Optimization Goal) ---
      else if (view === "engage_ads_goal") {
        const engageAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            [
              "post_engagement",
              "event_responses",
              "page_likes",
            ].includes(adset.optimization_goal?.toLowerCase())
          )
        );

        renderCampaignView(engageAdsCampaigns);
      }

      // --- 🔹 Traffic Ads ---
      else if (view === "traffic_ads_goal") {
        const trafficAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            [
              "link_clicks",
              "landing_page_views",
            ].includes(adset.optimization_goal?.toLowerCase())
          )
        );
        renderCampaignView(trafficAdsCampaigns);
      }

      // --- 🔹 Sales/Conversions Ads ---
      else if (view === "sales_ads_goal") {
        const salesAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            [
              "offsite_conversions",
              "value",
              "conversions",
            ].includes(adset.optimization_goal?.toLowerCase())
          )
        );
        renderCampaignView(salesAdsCampaigns);
      }

      // --- 🔹 Video Views Ads ---
      else if (view === "video_ads_goal") {
        const videoAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            [
              "thruplay",
              "video_views",
            ].includes(adset.optimization_goal?.toLowerCase())
          )
        );
        renderCampaignView(videoAdsCampaigns);
      }

      // --- 🔹 App Promotion Ads ---
      else if (view === "app_ads_goal") {
        const appAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            [
              "app_installs",
              "app_events",
            ].includes(adset.optimization_goal?.toLowerCase())
          )
        );
        renderCampaignView(appAdsCampaigns);
      }

      // --- 🔹 High CTR (> 1%) ---
      else if (view === "high_ctr") {
        const highCtrCampaigns = window._ALL_CAMPAIGNS.filter((c) => {
          const clicks = +c.inline_link_clicks || +c.clicks || 0;
          const imps = +c.impressions || 0;
          if (imps === 0) return false;
          return (clicks / imps) * 100 >= 1;
        });
        renderCampaignView(highCtrCampaigns);
      }

      // --- 🔹 High ROAS (> 2) ---
      else if (view === "high_roas") {
        const highRoasCampaigns = window._ALL_CAMPAIGNS.filter((c) => {
          const roasArr = c.purchase_roas || [];
          const roasVal = roasArr.find(a =>
            a.action_type === "purchase" || a.action_type === "omni_purchase" ||
            a.action_type === "omni_purchase_roas" || a.action_type === "purchase_roas"
          );
          const val = roasVal ? +roasVal.value : 0;
          return val >= 2;
        });
        renderCampaignView(highRoasCampaigns);
      }

      // --- 🔹 Brand Awareness (Optimization Goal) ---
      else if (view === "ba_ads_goal") {
        const awarenessAdsCampaigns = window._ALL_CAMPAIGNS.filter((c) =>
          c.adsets?.some((adset) =>
            ["reach", "ad_recall_lift", "impressions"].includes(
              adset.optimization_goal?.toLowerCase()
            )
          )
        );

        renderCampaignView(awarenessAdsCampaigns);
      }

      // --- 🔹 Reset filter ---
      else if (view === "reset") {
        selectedText.textContent = "Quick filter";
        renderCampaignView(window._ALL_CAMPAIGNS);
      }

      // ✅ Đóng dropdown ngay lập tức
      quickFilterBox.classList.remove("active");
    });
  });

  // Toggle mở dropdown
  quickFilterBox.addEventListener("click", (e) => {
    if (
      e.target.closest(".flex") ||
      e.target.classList.contains("fa-angle-down")
    ) {
      quickFilterBox.classList.toggle("active");
    }
  });
}

// ⏳ Status Filter Logic (Ending soon / Ended)
const statusFilterBox = document.querySelector(".status_filter");
if (statusFilterBox) {
  const selectedText = statusFilterBox.querySelector(".dom_selected");
  const listItems = statusFilterBox.querySelectorAll(".dom_select_show li");
  const dropdown = statusFilterBox.querySelector(".dom_select_show");

  listItems.forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();

      // Xóa highlight cũ
      listItems.forEach((x) => x.classList.remove("active"));
      li.classList.add("active");

      const label = li.querySelector("span:last-child")?.innerHTML || "";
      const view = li.querySelector(".view_status")?.dataset.view || "";

      selectedText.innerHTML = label;

      if (view === "reset_status") {
        selectedText.textContent = "Sắp kết thúc";
        renderCampaignView(window._ALL_CAMPAIGNS);
      } else {
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;

        const filtered = window._ALL_CAMPAIGNS.filter(c => {
          // Lấy end_time gần nhất từ adsets của campaign
          const endTimes = (c.adsets || [])
            .map(as => as.end_time ? new Date(as.end_time) : null)
            .filter(d => d !== null);

          if (!endTimes.length) return false;

          // Đối với "Đã kết thúc", check xem có cái nào đã qua ngày hiện tại chưa
          if (view === "ended_ads") {
            return endTimes.some(d => d < now);
          }

          // Đối với "Sắp kết thúc x ngày"
          const days = view === "ending_1d" ? 1 : 3;
          return endTimes.some(d => {
            const diff = d - now;
            return diff > 0 && diff <= (days * oneDayMs);
          });
        });

        renderCampaignView(filtered);
      }

      statusFilterBox.classList.remove("active");
    });
  });

  statusFilterBox.addEventListener("click", (e) => {
    // Chỉ toggle khi click vào nút chứ không phải click vào li bên trong
    if (e.target.closest("li")) return;
    statusFilterBox.classList.toggle("active");
  });

  // Đóng khi click ngoài
  document.addEventListener("click", (e) => {
    if (!statusFilterBox.contains(e.target)) {
      statusFilterBox.classList.remove("active");
    }
  });
}

// 🧠 Click ra ngoài dropdown → tự đóng luôn
document.addEventListener("click", (e) => {
  if (quickFilterBox && !quickFilterBox.contains(e.target)) {
    quickFilterBox.classList.remove("active");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // --- 📅 Initialize Date Selector ---
  const defaultRange = getDateRange("last_7days");
  startDate = defaultRange.start;
  endDate = defaultRange.end;
  initDateSelector();

  const previewBtn = document.getElementById("preview_button");

  if (previewBtn) {
    previewBtn.addEventListener("click", () => {
      const header = previewBtn.closest(".dom_detail_header");
      if (header) {
        header.classList.toggle("active");

        // Option: đổi hướng icon cho có vibe animation
        previewBtn.classList.toggle("rotated");
      }
    });
  }
  // if (typeof fetchGoogleAdsData === 'function') fetchGoogleAdsData(false); // Đã chuyển vào main() khởi tạo song song

  const menuItems = document.querySelectorAll(".dom_menu li");
  const container = document.querySelector(".dom_container");
  const mobileMenu = document.querySelector("#mobile_menu");
  const domSidebar = document.querySelector(".dom_sidebar");

  const btnPlatform = document.querySelectorAll(".dom_title_button.platform");
  const btnRegion = document.querySelectorAll(".dom_title_button.region");
  const inner = document.querySelector(".dom_platform_inner");
  const region = document.querySelector(".dom_region_inner");

  if (btnPlatform && inner) {
    btnPlatform.forEach((btn) => {
      btn.addEventListener("click", () => {
        inner.classList.toggle("active");
      });
    });
  }
  if (btnRegion && region) {
    btnRegion.forEach((btn) => {
      btn.addEventListener("click", () => {
        region.classList.toggle("active");
      });
    });
  }

  // Global toggle function used by inline onclick on region buttons
  window.toggleRegionView = function () {
    const regionCard = document.getElementById("region_inner_card") || document.querySelector(".dom_region_inner");
    if (regionCard) regionCard.classList.toggle("active");
  };

  // Toggle Sidebar on mobile menu click
  mobileMenu.addEventListener("click", () => {
    domSidebar.classList.toggle("active");
  });

  // Handle menu item click to switch views
  menuItems.forEach((li) => {
    li.addEventListener("click", () => {
      const view = li.getAttribute("data-view");
      if (!view) return; // 💡 Only switch views if data-view is present (ignores Settings button)

      // Remove active class from all items
      menuItems.forEach((item) => item.classList.remove("active"));

      // Add active to the clicked item
      li.classList.add("active");

      // Remove old view classes from container
      container.classList.forEach((cls) => {
        if (["dashboard", "ad_detail", "account", "google_ads"].includes(cls)) {
          container.classList.remove(cls);
        }
      });

      // Add new view class based on the clicked item
      container.classList.add(view);

      // Clear any leftover inline style on the Google Ads container so CSS rule takes over
      const gAdsEl = document.getElementById("google_ads_container");
      if (gAdsEl) gAdsEl.style.removeProperty('display');

      if (view === "google_ads") {
        // Nếu data đã được load ngầm từ trước và date range không đổi → chỉ render lại, không fetch
        const currentRange = `${startDate}_${endDate}`;
        const dataAlreadyLoaded = Array.isArray(window.googleAdsRawData) && window.googleAdsRawData.length > 0;
        if (dataAlreadyLoaded && window._lastGAdsRange === currentRange) {
          if (typeof window.renderGoogleAdsView === 'function') window.renderGoogleAdsView();
        } else {
          if (typeof window.fetchGoogleAdsData === 'function') window.fetchGoogleAdsData(false);
        }
      }

      // 👉 Nếu là nút account thì mới fetch
      if (view === "account") {
        fetchAdAccountInfo();
        loadAccountActivities(true);
      }

      // Close the sidebar on mobile after a menu click
      domSidebar.classList.remove("active");
    });
  });

  // Handle account dropdown selection
  document.addEventListener("click", (e) => {
    const accountBox = e.target.closest(".dom_account_view");
    const option = e.target.closest(".dom_account_view ul li");

    if (accountBox && !option) {
      accountBox.classList.toggle("active");
      return;
    }

    if (option) {
      const parent = option.closest(".dom_account_view");
      if (!parent) return;

      const accId = option.dataset.acc;
      const imgEl = option.querySelector("img");
      const nameEl = option.querySelector("span");

      if (!accId || !imgEl || !nameEl) return;

      const avatar = parent.querySelector(".account_item_avatar");
      const accName = parent.querySelector(".account_item_name");
      const accIdEl = parent.querySelector(".account_item_id");

      if (avatar) avatar.src = imgEl.src;
      if (accName) accName.textContent = nameEl.textContent.trim();
      if (accIdEl) accIdEl.textContent = accId;

      // Update global variable and close dropdown
      ACCOUNT_ID = accId;
      parent.classList.remove("active");

      // Load dashboard data after account change
      loadDashboardData();
    }

    // Close dropdown if clicked outside
    if (!e.target.closest(".dom_account_view")) {
      document
        .querySelectorAll(".dom_account_view.active")
        .forEach((el) => el.classList.remove("active"));
    }
  });

  // Handle quick filter dropdown
  document.addEventListener("click", (e) => {
    const select = e.target.closest(".quick_filter_detail");
    const option = e.target.closest(".quick_filter_detail ul li");

    // Toggle dropdown
    if (select && !option) {
      select.classList.toggle("active");
      return;
    }

    if (option) {
      const parent = option.closest(".quick_filter_detail");
      if (!parent) return;

      const imgEl = option.querySelector("img");
      const nameEl = option.querySelector("span");
      const filterValue = option.dataset?.filter ?? null;
      const isReset = filterValue === null ? false : filterValue.trim() === "";

      if (!imgEl || !nameEl) return;

      const filter = isReset ? "" : filterValue.trim().toLowerCase();

      // Close dropdown
      parent.classList.remove("active");

      // Apply brand/campaign filter
      if (typeof applyCampaignFilter === "function") {
        applyCampaignFilter(isReset ? "RESET" : filter);
      }
    } else {
      // Click outside closes it
      const selector = document.querySelector(".quick_filter_detail");
      if (selector && !selector.contains(e.target)) {
        selector.classList.remove("active");
      }
    }
  });

  // Handle BRAND selector in performance modal
  document.addEventListener("click", async (e) => {
    const select = e.target.closest("#perf_brand_selector");
    const option = e.target.closest("#perf_brand_list li");

    if (select && !option) {
      select.classList.toggle("active");
      const ul = select.querySelector("ul");
      if (ul) ul.classList.toggle("show");
      return;
    }

    if (option) {
      const parent = option.closest("#perf_brand_selector");
      if (!parent) return;

      const nameEl = option.querySelector("span");
      const filterValue = option.dataset?.filter ?? null;
      const isReset = filterValue === null ? false : filterValue.trim() === "";

      if (!nameEl) return;

      const name = nameEl.textContent.trim();
      const filter = isReset ? "RESET" : filterValue.trim().toLowerCase();

      parent.classList.remove("active");
      const ul = parent.querySelector("ul");
      if (ul) ul.classList.remove("show");

      // Apply filter
      if (typeof applyCampaignFilter === "function") {
        await applyCampaignFilter(filter);

        // Refresh the performance table
        if (typeof refreshPerformanceComparison === "function") {
          refreshPerformanceComparison();
        }
      }
    } else {
      // Click outside closes it
      const selector = document.getElementById("perf_brand_selector");
      if (selector && !selector.contains(e.target)) {
        if (selector) {
          selector.classList.remove("active");
          const ul = selector.querySelector("ul");
          if (ul) ul.classList.remove("show");
        }
      }
    }
  });
});

async function fetchAdAccountInfo() {
  const url = `${BASE_URL}/act_${ACCOUNT_ID}?fields=id,funding_source_details,name,balance,amount_spent,business_name,business_street,business_street2,business_city,business_state,business_zip,business_country_code,tax_id&access_token=${META_TOKEN}`;

  try {
    const data = await fetchJSON(url);

    // Lấy thông tin cần thiết từ dữ liệu trả về
    const balance = data.balance || 0;
    const amountSpent = data.amount_spent || 0;
    const paymentMethod = data.funding_source_details
      ? data.funding_source_details.display_string
      : "No payment method available";

    // Tính toán VAT (10%) từ số dư
    const vat = (balance * 1.1).toFixed(0);

    // Kiểm tra phương thức thanh toán và thêm logo tương ứng
    let paymentMethodDisplay = paymentMethod;
    if (paymentMethod.includes("Mastercard")) {
      paymentMethodDisplay = `<img src="https://ampersand-reports-dom.netlify.app/DOM-img/mastercard.png" alt="Mastercard" style="width:20px; margin-right: 5px;"> ${paymentMethod}`;
    } else if (paymentMethod.includes("VISA")) {
      paymentMethodDisplay = `<img src="https://ampersand-reports-dom.netlify.app/DOM-img/visa.png" alt="Visa" style="width:20px; margin-right: 5px;"> ${paymentMethod}`;
    }

    // Cập nhật thông tin vào DOM
    document.getElementById("detail_balance").innerHTML = `${(
      balance * 1
    ).toLocaleString("vi-VN")}đ`;
    document.getElementById("detail_vat").innerHTML = `${(
      vat * 1
    ).toLocaleString("vi-VN")}đ`;
    document.getElementById("detail_method").innerHTML = paymentMethodDisplay;

    // Cập nhật Business Info
    const rawAddressParts = [
      data.business_street,
      data.business_street2,
      data.business_city,
      data.business_state,
      data.business_zip,
      data.business_country_code
    ].filter(p => p && p.trim().length > 0 && p.trim().toLowerCase() !== 'vn' && p.trim().toLowerCase() !== 'vietnam').map(p => p.trim());

    // Deduplicate address parts cleverly (favoring longer strings)
    const uniqueParts = [];
    rawAddressParts.forEach(p => {
      let skip = false;
      for (let i = 0; i < uniqueParts.length; i++) {
        const up = uniqueParts[i];
        if (up.toLowerCase().includes(p.toLowerCase())) {
          skip = true; // Current is shorter or same as existing, skip it
          break;
        }
        if (p.toLowerCase().includes(up.toLowerCase())) {
          uniqueParts[i] = p; // Current is longer, replace existing
          skip = true;
          break;
        }
      }
      if (!skip) uniqueParts.push(p);
    });

    const businessHtml = `
      <div class="business_info_box">
        <p class="b_name"><i class="fa-solid fa-building"></i> ${data.business_name || "N/A"}</p>
        <p class="b_addr"><i class="fa-solid fa-map-marker-alt"></i> ${uniqueParts.join(', ')}</p>
        <p class="b_tax"><i class="fa-solid fa-id-card"></i> Tax ID: ${data.tax_id || "N/A"}</p>
      </div>
    `;
    const businessLi = document.querySelector("#detail_total_report .dom_total_report.balance ul li:nth-child(3)");
    if (businessLi) {
      businessLi.innerHTML = `
        <span class="b_title"><i class="fa-solid fa-circle-info"></i> Business Info</span>
        ${businessHtml}
      `;
    }

    return data;
  } catch (error) {
    console.error("❌ Error fetching Ad Account info:", error);
    return null;
  }
}

function getYears() {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear];
}

/**
 * Render các năm vào dropdown #yearSelect.
 */
