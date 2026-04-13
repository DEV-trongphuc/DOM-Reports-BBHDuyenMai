const quick_filter = [
  "Haagen Dazs",
  "Snowee",
  "Esta",
  "TRB",
  "BEAN",
  "Le Petit",
];
const brandData = {
  labels: ["Haagen Dazs", "Snowee", "Esta", "TRB", "BEAN", "Le Petit"],
  datasets: [
    {
      data: [],
      backgroundColor: [
        "#ffa900",
        "#ffa900",
        "#ffa900",
        "#ffa900",
        "#ffa900",
        "#ffa900",
      ],
      borderWidth: 1,
    },
  ],
};
let currentChart = null; // Biến lưu trữ đối tượng biểu đồ hiện tại
// Hàm để vẽ lại biểu đồ
function drawChart(data) {
  const ctx = document.getElementById("brandChart").getContext("2d");

  // Nếu biểu đồ hiện tại đã tồn tại, hủy bỏ nó
  if (currentChart !== null) {
    currentChart.destroy(); // Hủy biểu đồ cũ trước khi vẽ lại
  }

  // Tạo biểu đồ mới
  currentChart = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// ___________________
const accessToken =
  "EAAQwS9m6tIABO8ZCZCvO4TtPBXcbilAYn3nwZCZB739B8GtMfy2V2uJmgjHMtvsdKS6XMl7YiBuXqg3BxTdh37H7Vv5qYcsZA7IqVYMLqHX3FhQdxD8fSguISa0sDg1INzOfVtUCt8OoNqh0j6PXvu50rZCgMerGZAJ7NAYgLYuTsPw8NvdOEdF5kRX9C0ctu1ka7CS6VcbbXosWnMM"; // Token của bạn
const adAccountId = "676599667843841"; // ID tài khoản quảng cáo

const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights
  ?level=adset
  &fields=campaign_name,adset_name,spend,impressions,reach,actions
  &date_preset=last_7d
  &filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]
  &access_token=${accessToken}&limit=1000`;

let allData = [];
const query = localStorage.getItem("query");
async function fetchData(api) {
  if (!query) {
    localStorage.setItem("query", quick_filter[0]);
    localStorage.setItem("iview", 1);
  }
  allData = []; // Khởi tạo danh sách để chứa toàn bộ dữ liệu
  let nextUrl = api; // URL ban đầu
  const loadingElement = document.querySelector(".loading");
  if (loadingElement) loadingElement.classList.add("active");

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);

      // Kiểm tra xem phản hồi có thành công không
      if (!response.ok) {
        throw new Error(`Network error: ${response.statusText}`);
      }

      const data = await response.json();

      // Kiểm tra lỗi từ API
      if (data.error) {
        console.error("Error from API:", data.error.message);
        if (loadingElement) loadingElement.classList.remove("active");
        return;
      }

      // Debug: Log dữ liệu trả về

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...(data.data || [])];
      console.log("Fetched data:", allData);

      // Kiểm tra và cập nhật URL của trang tiếp theo
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Render dữ liệu vào giao diện
    if (typeof renderTopCampaigns === "function") {
      renderTopCampaigns(allData);
    }

    const totals = calculateTotals(allData);

    document.getElementById("total_spend").textContent = formatCurrency(
      Math.round(totals.spend)
    );
    document.getElementById("total_reach").textContent = formatNumber(
      Math.round(totals.reach)
    );
    document.getElementById("total_reaction").textContent = formatNumber(
      Math.round(totals.reaction)
    );
    document.getElementById("total_follows").textContent = formatNumber(
      Math.round(totals.follows)
    );

    const totalSpends = calculateBrandSpending(allData, brandData.labels);
    brandData.datasets[0].data = totalSpends;
    document.querySelector(".loading").classList.remove("active");
    drawChart(brandData); // Thay vì dùng new Chart, giờ gọi drawChart
    processData(allData); // Initial rendering
    const quickID = localStorage.getItem("quickID");
    if (quickID) {
      renderReportPerformance(localStorage.getItem("quickID") * 1);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}
const dom_reach_unit = document.getElementById("dom_reach_unit");
const dom_reaction_unit = document.getElementById("dom_reaction_unit");
const dom_mess_unit = document.getElementById("dom_mess_unit");
const dom_like_unit = document.getElementById("dom_like_unit");

function processData(data, performance) {
  let render = ``;
  const dom_detail_tbody = document.querySelector(".dom_detail_tbody ");

  // Hàm tính tổng và cập nhật tfoot
  function updateTotals(rows, selectedCount = 0) {
    let spend = 0;
    let reach = 0;
    let impressions = 0;
    let engagement = 0;
    let reactions = 0;
    let follows = 0;
    let lead = 0;
    let result = 0;
    let comments = 0;
    let linkClicks = 0;
    let messengerStart = 0;

    rows.forEach((row) => {
      spend += parseFloat(row.querySelector(".spend").dataset.value) || 0;
      reach += parseInt(row.querySelector(".reach").dataset.value) || 0;
      lead += parseInt(row.querySelector(".lead").dataset.value) || 0;
      result += parseInt(row.querySelector(".result").dataset.value) || 0;
      impressions +=
        parseInt(row.querySelector(".impressions").dataset.value) || 0;
      engagement +=
        parseInt(row.querySelector(".engagement").dataset.value) || 0;
      reactions +=
        parseInt(row.querySelector(".postReaction").dataset.value) || 0;
      follows += parseInt(row.querySelector(".follows").dataset.value) || 0;
      comments += parseInt(row.querySelector(".comments").dataset.value) || 0;
      linkClicks +=
        parseInt(row.querySelector(".linkClick").dataset.value) || 0;
      messengerStart +=
        parseInt(row.querySelector(".messengerStart").dataset.value) || 0;
    });

    // Cập nhật tfoot
    const tfootContent = `
        <tr>
          <td class="dom_selected_total" colspan="3">
            ${
              selectedCount > 0
                ? `Total selected ${selectedCount} adsets`
                : "Total all adsets"
            }
          </td>
          <td>${formatCurrency(spend)}</td>
          <td>${formatNumber(reach)}</td>
          <td>${formatNumber(impressions)}</td>
          <td>${formatNumber(result)}</td>
          <td>${formatNumber(lead)}</td>
          <td>${result ? formatCurrency(Math.floor(spend / result)) : "-"}</td>
          <td>-</td>
          <td>${formatNumber(engagement)}</td>
          <td>${formatNumber(reactions)}</td>
          <td>${formatNumber(comments)}</td>
          <td>${formatNumber(follows)}</td>
          <td>${formatNumber(messengerStart)}</td>
          <td>${formatNumber(linkClicks)}</td>
        </tr>
      `;
    document.querySelector("tfoot").innerHTML = tfootContent;
    const viewPerformance = document.querySelector(
      "#dom_contentarea.viewPerformance"
    );
    if (viewPerformance) {
      const total_spend_viewPerformance = document.getElementById(
        "total_spend_viewPerformance"
      );
      const total_reaction_viewPerformance = document.getElementById(
        "total_reaction_viewPerformance"
      );
      const total_engagement_viewPerformance = document.getElementById(
        "total_engagement_viewPerformance"
      );
      const total_reach_viewPerformance = document.getElementById(
        "total_reach_viewPerformance"
      );
      const total_messenger_viewPerformance = document.getElementById(
        "total_messenger_viewPerformance"
      );
      const total_follows_viewPerformance = document.getElementById(
        "total_follows_viewPerformance"
      );
      const total_comment_viewPerformance = document.getElementById(
        "total_comment_viewPerformance"
      );
      const total_link_viewPerformance = document.getElementById(
        "total_link_viewPerformance"
      );
      total_spend_viewPerformance.innerText = formatCurrency(spend);
      total_reach_viewPerformance.innerText = formatNumber(reach);
      total_messenger_viewPerformance.innerText = formatNumber(messengerStart);
      total_follows_viewPerformance.innerText = formatNumber(follows);
      total_reaction_viewPerformance.innerText = formatNumber(reactions);
      total_engagement_viewPerformance.innerText = formatNumber(engagement);
      total_comment_viewPerformance.innerText = formatNumber(comments);
      total_link_viewPerformance.innerText = formatNumber(linkClicks);
    }
  }

  // Lắng nghe sự kiện checkbox
  document.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      const row = e.target.closest("tr");

      // Thêm hoặc loại bỏ class 'checked'
      if (e.target.checked) {
        row.classList.add("checked");
      } else {
        row.classList.remove("checked");
      }

      // Lấy tất cả các hàng được check
      const checkedRows = Array.from(document.querySelectorAll("tr.checked"));

      if (checkedRows.length > 0) {
        updateTotals(checkedRows, checkedRows.length); // Gửi số hàng được chọn
      } else {
        // Nếu không có hàng nào được check, tính tổng toàn bộ
        const allRows = Array.from(document.querySelectorAll("tbody tr"));
        updateTotals(allRows);
      }
    }
  });

  // Render dữ liệu và thêm thuộc tính data-value cho các ô số liệu
  let awarenessSpend = 0;
  let awarenessReach = 0;
  let engagementSpend = 0;
  let engagementReaction = 0;
  let messageSpend = 0;
  let messageCount = 0;
  let likepageSpend = 0;
  let trafficSpend = 0;
  let likepageCount = 0;
  let leadSpend = 0;
  let leadCount = 0;

  data.forEach((item) => {
    const spend = parseFloat(item.spend) || 0;
    if (spend > 0) {
      const reach = item.reach || 0;
      const impressions = item.impressions || 0;
      const postEngagement =
        getValueFromActions(item.actions, "post_engagement") || 0;
      const postReaction =
        getValueFromActions(item.actions, "post_reaction") || 0;
      const follows = getValueFromActions(item.actions, "like") || 0;
      const lead = getValueFromActions(item.actions, "lead") || 0;
      const comments = getValueFromActions(item.actions, "comment") || 0;
      const linkClick = getValueFromActions(item.actions, "link_click") || 0;
      const messengerStart =
        getValueFromActions(
          item.actions,
          "onsite_conversion.messaging_conversation_started_7d"
        ) || 0;
      if (performance === "true") {
        if (item.campaign_name.toLowerCase().includes("awareness")) {
          awarenessSpend += parseFloat(item.spend) || 0;
          awarenessReach += parseInt(item.reach) || 0;
        }
        if (item.campaign_name.toLowerCase().includes("traffic")) {
          trafficSpend += parseFloat(item.spend) || 0;
        }
        if (item.campaign_name.toLowerCase().includes("engagement")) {
          engagementSpend += parseFloat(item.spend) || 0;
          engagementReaction +=
            getValueFromActions(item.actions, "post_reaction") || 0;
        }
        if (item.campaign_name.toLowerCase().includes("message")) {
          messageSpend += spend;
          messageCount +=
            getValueFromActions(
              item.actions,
              "onsite_conversion.messaging_conversation_started_7d"
            ) || 0;
        }
        if (item.campaign_name.toLowerCase().includes("likepage")) {
          likepageSpend += spend;
          likepageCount += getValueFromActions(item.actions, "like") || 0;
        }
        if (item.campaign_name.toLowerCase().includes("lead")) {
          leadSpend += spend;
          leadCount += getValueFromActions(item.actions, "lead") || 0;
        }
      }
      // Xác định resultType dựa trên campaign name
      let resultType = 0;
      if (item.campaign_name.toLowerCase().includes("engagement"))
        resultType = parseInt(postReaction);
      if (item.campaign_name.toLowerCase().includes("awareness"))
        resultType = parseInt(reach);
      if (item.campaign_name.toLowerCase().includes("traffic"))
        resultType = parseInt(linkClick);
      if (item.campaign_name.toLowerCase().includes("lead"))
        resultType = parseInt(lead);
      if (item.campaign_name.toLowerCase().includes("message"))
        resultType = parseInt(messengerStart);
      if (item.campaign_name.toLowerCase().includes("likepage"))
        resultType = parseInt(follows);

      // Tính CPR
      const costPerResult =
        resultType > 0 ? Math.round(spend / resultType) : "-";

      // Tính CPM
      const cpm =
        impressions > 0 ? Math.round((spend / impressions) * 1000) : 0;

      // Format tiền cho costPerResult và CPM
      const formattedCostPerResult = formatCurrency(costPerResult);
      const formattedCpm = formatCurrency(cpm);
      const formatpostEngagement = formatNumber(postEngagement);

      // Render hàng
      render += `
            <tr>
              <td><input type="checkbox"></td>
              <td>${item.campaign_name}</td>
              <td>${item.adset_name}</td>
              <td class="spend" data-value="${spend}">${formatCurrency(
        spend
      )}</td>
              <td class="reach" data-value="${reach}">${formatNumber(
        reach
      )}</td>
              <td class="impressions" data-value="${impressions}">${formatNumber(
        impressions
      )}</td>
              <td class="result" data-value="${resultType}">${
        resultType > 0 ? formatNumber(resultType) : "-"
      }</td>
              <td class="lead" data-value="${lead}">${formatNumber(lead)}</td>
  
              <td class="costPerResult" data-value="${costPerResult}">${formattedCostPerResult}</td>
              <td class="cpm" data-value="${cpm}">${formattedCpm}</td>
              <td class="engagement" data-value="${postEngagement}">${formatpostEngagement}</td>
              <td class="postReaction" data-value="${postReaction}">${formatNumber(
        postReaction
      )}</td>
              <td class="comments" data-value="${comments}">${formatNumber(
        comments
      )}</td>
              <td class="follows" data-value="${follows}">${formatNumber(
        follows
      )}</td>
              <td class="messengerStart" data-value="${messengerStart}">${formatNumber(
        messengerStart
      )}</td>
              <td class="linkClick" data-value="${linkClick}">${formatNumber(
        linkClick
      )}</td>
            </tr>
          `;
    }
  });
  if (performance === "true") {
    updateProgressBar(
      awarenessSpend,
      engagementSpend,
      likepageSpend,
      messageSpend,
      trafficSpend
    );

    dom_reach_unit.innerText =
      awarenessReach > 0
        ? formatCurrency((awarenessSpend / awarenessReach).toFixed(1))
        : "-";

    dom_reaction_unit.innerText =
      engagementReaction > 0
        ? formatCurrency((engagementSpend / engagementReaction).toFixed(0))
        : "-";
    console.log(messageCount);

    dom_mess_unit.innerText =
      messageCount > 0
        ? formatCurrency((messageSpend / messageCount).toFixed(0))
        : "-";

    dom_like_unit.innerText =
      likepageSpend > 0
        ? formatCurrency((likepageSpend / likepageCount).toFixed(0))
        : "-";
  }

  dom_detail_tbody.innerHTML = render;
  const allRows = Array.from(document.querySelectorAll("tbody tr"));
  updateTotals(allRows);
  const quickID = localStorage.getItem("quickID");
  const query = localStorage.getItem("query");
  if (quickID && query) {
    const filterItems = document.querySelectorAll(".dom_quick_filter a");
    filterItems[quickID].click();
  }
}
function sortTableBySpend() {
  const tbody = document.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Sắp xếp các hàng dựa trên giá trị spend (data-value)
  rows.sort((a, b) => {
    const spendA = parseFloat(a.querySelector(".spend").dataset.value) || 0;
    const spendB = parseFloat(b.querySelector(".spend").dataset.value) || 0;
    return spendB - spendA; // Sắp xếp giảm dần
  });

  // Xóa các hàng cũ và chèn lại theo thứ tự mới
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));
}

let impressionDoughnutChart;
// Gọi hàm sắp xếp sau khi render
const dom_main_menu_a = document.querySelectorAll(".dom_main_menu li a");
const dom_contentarea = document.querySelector("#dom_contentarea");
// Add event listener to the FIND button
document
  .getElementById("dom_detail_find")
  .addEventListener("click", function () {
    const keyword = document
      .getElementById("dom_detail_input")
      .value.toLowerCase()
      .trim();
    clearFilter();
    dom_contentarea.classList.remove("viewPerformance");
    filterData(keyword);
  });

function clearFilter() {
  const activeItem = document.querySelector(".dom_quick_filter a.active");
  if (activeItem) {
    activeItem.classList.remove("active");
  }
  localStorage.removeItem("quickID");
}
function filterData(keyword) {
  console.log(allData);
  const filteredData = allData.filter((item) => {
    const campaignMatch = item.campaign_name.toLowerCase().includes(keyword);
    return campaignMatch;
  });

  processData(filteredData, "true"); // Render filtered data
}
function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(); // Chỉ viết hoa chữ cái đầu tiên
}

function formatCurrency(value) {
  return value === "-"
    ? "-"
    : new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

function formatNumber(value) {
  if (value === "-") return "-";
  return new Intl.NumberFormat("de-DE").format(value); // Sử dụng định dạng tiếng Đức, dấu phân cách là "."
}

function getValueFromActions(actions, actionType) {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? action.value * 1 : 0;
}
// Hàm tính tổng spend cho từng brand

function calculateBrandSpending(allData, brandLabels) {
  // Khởi tạo mảng tổng spend cho từng brand
  const brandTotals = brandLabels.map(() => 0);

  // Lặp qua tất cả các adset
  allData.forEach((adset) => {
    const campaignName = adset.campaign_name?.toLowerCase() || ""; // Tên campaign từ adset
    const spend = parseFloat(adset.spend || 0); // Chi tiêu của adset

    // Gán tổng spend vào brand tương ứng
    brandLabels.forEach((brand, index) => {
      if (campaignName.includes(brand.toLowerCase())) {
        brandTotals[index] += spend;
      }
    });
  });
  console.log(brandTotals);

  return brandTotals;
}

// Tính toán tổng spend
function calculateTotals(allData) {
  // Khởi tạo biến lưu tổng
  const totals = {
    spend: 0,
    reach: 0,
    reaction: 0,
    follows: 0,
    lead: 0,
  };

  // Lặp qua tất cả các adset
  allData.forEach((adset) => {
    console.log(adset);

    // Cộng dồn các giá trị
    totals.spend += parseFloat(adset.spend || 0);
    totals.reach += parseInt(adset.reach || 0);
    totals.reaction += parseInt(
      getValueFromActions(adset.actions, "post_reaction") || 0
    );
    totals.follows += parseInt(getValueFromActions(adset.actions, "like") || 0);
    totals.lead += parseInt(getValueFromActions(adset.actions, "lead") || 0);
  });
  return totals;
}

function renderTopCampaigns(allData) {
  // Nhóm các adset theo tên campaign
  const campaignTotals = allData.reduce((totals, adset) => {
    const campaignName = adset.campaign_name || "Unknown Campaign"; // Lấy tên campaign hoặc gán mặc định nếu không có
    const spend = parseFloat(adset.spend) || 0; // Lấy spend hoặc gán 0 nếu không có

    // Kiểm tra campaign đã tồn tại trong danh sách chưa
    const existingCampaign = totals.find((item) => item.name === campaignName);

    if (existingCampaign) {
      // Nếu tồn tại, cộng thêm spend
      existingCampaign.spend += spend;
    } else {
      // Nếu chưa, thêm mới campaign vào danh sách
      totals.push({ name: campaignName, spend });
    }

    return totals;
  }, []);

  // Sắp xếp các campaign theo tổng spend giảm dần
  campaignTotals.sort((a, b) => b.spend - a.spend);

  // Render lên giao diện
  const ulElement = document.querySelector(".dom_chart_most_ul"); // Phần tử danh sách trên UI
  ulElement.innerHTML = ""; // Xóa nội dung cũ nếu có

  campaignTotals.forEach((campaign) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${campaign.name}</span> <span>${formatCurrency(
      campaign.spend
    )}</span>`;
    ulElement.appendChild(li);
  });
}

fetchData(apiUrl);
const dom_choose_day = document.querySelector(".dom_choose_day");
const dom_choosed = document.querySelector(".dom_choosed");
const dom_choosed_day = document.querySelector(".dom_choosed_day");
dom_choose_day.addEventListener("click", function (event) {
  // Kiểm tra nếu phần tử được click không nằm trong <li> cuối cùng
  const lastLi = dom_choose_day.querySelector("li:last-child");
  if (!lastLi.contains(event.target)) {
    dom_choose_day.classList.toggle("active");
  }
});

let preset = "last%5f7d";
const itemDate = document.querySelectorAll(".dom_choose_day li"); // Select all li items in the dom_choose_day list
itemDate.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (index < itemDate.length - 1) {
      // Cập nhật nội dung của dom_choosed với nội dung của mục được chọn
      dom_choosed.innerText = item.innerText;
      // Lấy giá trị data-date
      const datePreset = item.getAttribute("data-date");

      // Lấy khoảng ngày phù hợp
      const formattedDate = getFormattedDateRange(datePreset);
      dom_choosed_day.innerText = formattedDate;

      // Gọi API với ngày đã chọn
      const apiUrl = `https://graph.facebook.com/v16.0/act_${adAccountId}/insights
        ?level=adset
        &fields=campaign_name,adset_name,spend,impressions,reach,actions
        &date_preset=${datePreset}
        &filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]
        &access_token=${accessToken}&limit=1000`;
      preset = datePreset;
      fetchData(apiUrl);
    }
  });
});

// Hàm định dạng ngày thành dd/mm/yyyy
function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

// Hàm lấy khoảng ngày phù hợp theo preset
function getFormattedDateRange(preset) {
  const today = new Date();
  let startDate, endDate;

  switch (preset) {
    case "today":
      startDate = endDate = today;
      break;
    case "yesterday":
      startDate = new Date();
      startDate.setDate(today.getDate() - 1);
      endDate = startDate;
      break;
    case "last%5f3d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 3);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "last%5f7d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 7);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "last%5f30d":
      startDate = new Date();
      startDate.setDate(today.getDate() - 30);
      endDate = new Date();
      endDate.setDate(today.getDate() - 1);
      break;
    case "this%5fmonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
      break;
    case "last%5fmonth":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "this%5fweek%5fmon%5ftoday":
      const currentDay = today.getDay();
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Calculate days back to Monday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday);
      endDate = today;
      break;
    case "last%5fweek%5fmon%5fsun":
      const lastWeekMonday = new Date(today);
      lastWeekMonday.setDate(today.getDate() - (today.getDay() + 6)); // Last week's Monday
      startDate = lastWeekMonday;
      const lastWeekSunday = new Date(today);
      lastWeekSunday.setDate(today.getDate() - (today.getDay() + 0)); // Last week's Sunday
      endDate = lastWeekSunday;
      break;
    case "this%5fquarter":
      const currentQuarterStart = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3,
        1
      );
      startDate = currentQuarterStart;
      endDate = today;
      break;
    case "last%5fquarter":
      const lastQuarterEnd = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3,
        0
      );
      const lastQuarterStart = new Date(
        today.getFullYear(),
        Math.floor(today.getMonth() / 3) * 3 - 3,
        1
      );
      startDate = lastQuarterStart;
      endDate = lastQuarterEnd;
      break;
    default:
      return "";
  }

  return startDate.getTime() === endDate.getTime()
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

dom_choosed_day.innerText = getFormattedDateRange("last%5f7d");

const dom_quick_filter = document.querySelector(".dom_quick_filter");
const dom_table_data = document.querySelector(".dom_table_data");

// Render danh sách
quick_filter.forEach((item) => {
  const li = document.createElement("li");
  li.innerHTML = `
      <a class="" data-quick="${item}">
        <i class="fa-solid fa-bolt"></i> <span>${item}</span>
      </a>
    `;
  dom_quick_filter.appendChild(li);
});

const filterItems = document.querySelectorAll(".dom_quick_filter a");
// Hàm tạo URL API
function createApiUrl(baseField, adAccountId, filtering, preset, accessToken) {
  return `https://graph.facebook.com/v16.0/act_${adAccountId}/insights?fields=${baseField}&filtering=${filtering}&date_preset=${preset}&access_token=${accessToken}`;
}

// Xử lý sự kiện click cho từng item
const daily_title = document.querySelector(".daily_title");
const dom_title_report = document.querySelector(".dom_title_report");
filterItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    const quickID = localStorage.getItem("quickID");
    if (quickID == index) {
      return;
    } else {
      renderReportPerformance(index);
    }
  });
});
function renderReportPerformance(index) {
  const iview = localStorage.getItem("iview");
  dom_main_menu_a[iview * 1].click();
  const activeItem = document.querySelector(".dom_quick_filter a.active");
  if (activeItem) {
    activeItem.classList.remove("active");
  }
  const dataset = filterItems[index].dataset.quick;
  dom_title_report.innerText = `Report for ${dataset}`;
  localStorage.setItem("quickID", index);
  localStorage.setItem("query", dataset);

  // Thêm class active cho item hiện tại
  filterItems[index].classList.add("active");

  // Chuẩn bị chuỗi lọc
  daily_title.innerText = `Daily Line Chart - ${dataset}`;
  const filtering = JSON.stringify([
    {
      field: "campaign.name",
      operator: "CONTAIN",
      value: dataset,
    },
    {
      field: "spend",
      operator: "GREATER_THAN",
      value: 0,
    },
  ]);

  const apiUrls = {
    platform: createApiUrl(
      "campaign_name,reach&breakdowns=publisher_platform",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
    age: createApiUrl(
      "campaign_name,reach&breakdowns=age,gender",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
    region: createApiUrl(
      "campaign_name,reach&breakdowns=region",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
    gender: createApiUrl(
      "campaign_name,reach&breakdowns=gender",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
    daily: createApiUrl(
      "spend,reach,actions,date_start&time_increment=1",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
    device: createApiUrl(
      "campaign_name,impressions&breakdowns=impression_device",
      adAccountId,
      filtering,
      preset,
      accessToken
    ),
  };

  // Gọi các API tương ứng
  fetchDataFlat(apiUrls.platform);
  fetchDataAge(apiUrls.age);
  fetchRegionData(apiUrls.region);
  fetchGenderData(apiUrls.gender);
  fetchDailyInsights(apiUrls.daily);
  fetchImpressionData(apiUrls.device);
  // Lọc dữ liệu hiển thị
  filterData(dataset.toLowerCase());
}

dom_main_menu_a.forEach((item, index) => {
  let iview = 0;
  item.addEventListener("click", () => {
    const activeItem = document.querySelector(".dom_main_menu li a.active");
    if (activeItem) {
      activeItem.classList.remove("active");
    }
    iview = index;
    item.classList.add("active");
    if (index == 0) {
      filterData("");
      dom_contentarea.classList.remove("viewPerformance");
      dom_contentarea.classList.remove("viewDemographic");
      localStorage.removeItem("iview");
    }
    if (index == 1) {
      const query = localStorage.getItem("query");
      viewPerformance();
      filterData(query.toLocaleLowerCase());
      localStorage.setItem("iview", iview);
    }
    if (index == 2) {
      viewDemographic();
      localStorage.setItem("iview", iview);
    }
  });
});
function viewDemographic() {
  dom_contentarea.classList.add("viewDemographic");
  dom_contentarea.classList.remove("viewPerformance");
  const ID = localStorage.getItem("quickID");
  if (!ID) {
    filterItems[0].click();
  }
}
function viewPerformance() {
  dom_contentarea.classList.add("viewPerformance");
  dom_contentarea.classList.remove("viewDemographic");
  const ID = localStorage.getItem("quickID");
  if (!ID) {
    filterItems[0].click();
  }
}

async function fetchDataAge(api) {
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let ageGenderReach = {};

    allData.forEach((entry) => {
      const ageRange = entry.age || "Unknown";
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;

      // Tạo key kết hợp tuổi và giới tính (ví dụ: "18-24_male")
      const key = `${ageRange}_${gender}`;
      if (!ageGenderReach[key]) {
        ageGenderReach[key] = 0;
      }
      ageGenderReach[key] += reach;
    });

    console.log("Tổng reach theo độ tuổi và giới tính:", ageGenderReach);

    // Chuyển đổi dữ liệu thành dạng phù hợp cho biểu đồ
    const ageLabels = [...new Set(allData.map((entry) => entry.age))].sort();
    const maleData = ageLabels.map((age) => ageGenderReach[`${age}_male`] || 0);
    const femaleData = ageLabels.map(
      (age) => ageGenderReach[`${age}_female`] || 0
    );

    // Gọi hàm vẽ biểu đồ
    drawAgeGenderChart(ageLabels, maleData, femaleData);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function fetchDataFlat(api) {
  try {
    let allData = []; // Mảng để lưu toàn bộ dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let platformReach = {};
    allData.forEach((entry) => {
      const platform = entry.publisher_platform || "Unknown";
      const reach = entry.reach || 0;
      if (!platformReach[platform]) {
        platformReach[platform] = 0;
      }
      platformReach[platform] += reach;
    });

    console.log("Tổng reach theo nền tảng:", platformReach);
    drawChart2(platformReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

let reachChartInstance = null; // Biến lưu trữ biểu đồ

function drawChart2(platformReach) {
  const ctx = document.getElementById("reachChart").getContext("2d");

  // Sắp xếp các nền tảng theo thứ tự mong muốn
  const platformOrder = [
    "audience_network",
    "facebook",
    "instagram",
    "messenger",
  ];

  // Sắp xếp lại dữ liệu platformReach theo đúng thứ tự yêu cầu
  const sortedPlatformReach = platformOrder.reduce((acc, platform) => {
    if (platformReach[platform]) {
      acc[platform] = platformReach[platform];
    }
    return acc;
  }, {});

  const platforms = Object.keys(sortedPlatformReach).map((platform) =>
    capitalizeFirstLetter(platform)
  );
  const reachValues = Object.values(sortedPlatformReach);

  // Kiểm tra và hủy biểu đồ cũ nếu đã tồn tại
  if (reachChartInstance) {
    reachChartInstance.destroy();
  }

  // Tạo biểu đồ mới
  reachChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: platforms,
      datasets: [
        {
          label: "Total Reach",
          data: reachValues,
          backgroundColor: [
            "#262a53", // Messenger
            "#ffab00", // Facebook
            "#cccccc", // Audience Network
            "#ffc756", // Instagram
          ],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
        title: {
          display: false, // Ẩn tiêu đề nếu không cần
        },
      },
    },
  });
}

async function fetchRegionData(api) {
  document.querySelector(".loading").classList.add("active");
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let regionReach = {};
    allData.forEach((entry) => {
      const region = entry.region || "Unknown";
      const reach = entry.reach || 0;
      if (!regionReach[region]) {
        regionReach[region] = 0;
      }
      regionReach[region] += reach;
    });

    console.log("Tổng reach theo khu vực:", regionReach);
    drawRegionChart(regionReach);
    document.querySelector(".loading").classList.remove("active");
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

let ageGenderChartInstance;
function drawAgeGenderChart(ageLabels, maleData, femaleData) {
  const ctx = document.getElementById("ageGenderChart").getContext("2d");
  if (ageGenderChartInstance) {
    ageGenderChartInstance.destroy();
  }
  ageGenderChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ageLabels,
      datasets: [
        {
          label: "Male",
          data: maleData,
          backgroundColor: "#202449ed", // Màu xanh dương
          borderColor: "#262a53",
          borderWidth: 1,
        },
        {
          label: "Female",
          data: femaleData,
          backgroundColor: "#ffab00e3", // Màu hồng
          borderColor: "#ffab00",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top", // Đặt chú thích ở dưới
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          stacked: false, // Hiển thị cột cạnh nhau
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

let regionChartInstance;
function drawRegionChart(regionReach) {
  const ctx = document.getElementById("regionChart").getContext("2d");

  // Tính tổng reach để lọc region có tỷ lệ quá thấp
  const totalReach = Object.values(regionReach).reduce(
    (sum, value) => sum + value * 1,
    0
  );
  console.log(totalReach);

  const minThreshold = totalReach * 0.015; // Ngưỡng tối thiểu là 5% tổng reach

  // Lọc bỏ các region có reach quá thấp
  const filteredRegions = Object.entries(regionReach).filter(
    ([, value]) => value >= minThreshold
  );

  if (filteredRegions.length === 0) {
    console.warn("Không có khu vực nào đủ điều kiện để hiển thị.");
    return;
  }

  const regions = filteredRegions.map(([region]) => region);
  const reachValues = filteredRegions.map(([, value]) => value);

  if (regionChartInstance) {
    regionChartInstance.destroy();
  }

  regionChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: regions,
      datasets: [
        {
          data: reachValues,
          backgroundColor: [
            "#ffab00",
            "#ffab00",
            "#ffab00",
            "#ffab00",
            "#ffab00",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

async function fetchGenderData(api) {
  try {
    let allData = []; // Mảng để lưu tất cả dữ liệu
    let nextUrl = api; // URL ban đầu

    // Hàm xử lý việc lấy dữ liệu và phân trang
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();

      if (data.error) {
        console.error("Error from API:", data.error.message);
        return;
      }

      // Gộp dữ liệu từ response vào allData
      allData = [...allData, ...data.data];

      // Kiểm tra xem có trang tiếp theo không
      nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }

    // Xử lý dữ liệu sau khi lấy xong tất cả các trang
    let genderReach = {};
    allData.forEach((entry) => {
      const gender = entry.gender || "Unknown";
      const reach = entry.reach || 0;
      if (!genderReach[gender]) {
        genderReach[gender] = 0;
      }
      genderReach[gender] += reach;
    });

    console.log("Tổng reach theo giới tính:", genderReach);

    // Gọi hàm vẽ biểu đồ tròn khi có dữ liệu
    drawGenderChart(genderReach);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

let genderChartInstance;
function drawGenderChart(genderReach) {
  const ctx = document.getElementById("genderChart").getContext("2d");

  // Chuyển đổi các giới tính và giá trị reach
  const genders = Object.keys(genderReach).map((gd) =>
    capitalizeFirstLetter(gd)
  );
  const reachValues = Object.values(genderReach);

  // Nếu biểu đồ đã tồn tại, hủy đi trước khi vẽ lại
  if (genderChartInstance) {
    genderChartInstance.destroy();
  }

  // Vẽ lại biểu đồ tròn
  genderChartInstance = new Chart(ctx, {
    type: "pie", // Biểu đồ tròn
    data: {
      labels: genders, // Các nhãn giới tính
      datasets: [
        {
          label: "Lượt Reach theo giới tính", // Tiêu đề cho dữ liệu
          data: reachValues, // Dữ liệu reach theo giới tính
          backgroundColor: [
            "#ffab00", // Màu cho Nữ
            "#262a53", // Màu cho Nam
            "#cccccc", // Màu cho Unknown nếu có
          ],
          hoverOffset: 4, // Hiệu ứng khi hover
        },
      ],
    },
    options: {
      responsive: true, // Đảm bảo biểu đồ linh hoạt với kích thước màn hình
      plugins: {
        legend: {
          position: "bottom", // Đặt chú thích ở dưới
          align: "center", // Căn giữa các mục chú thích
          labels: {
            boxWidth: 20, // Chiều rộng của hộp màu
            padding: 15, // Khoảng cách giữa tên chú thích
            maxWidth: 200, // Giới hạn chiều rộng tối đa của mỗi mục
            usePointStyle: true, // Hiển thị chú thích dưới dạng điểm (circle)
          },
        },
      },
    },
  });
}
let dailyChartInstance; // Declare globally
const view_selected = document.querySelector(".view_selected");
const dom_select_view = document.querySelector(".dom_select_view");
const dom_select_li = document.querySelectorAll(".dom_select_view ul li");
let allDatasets = []; // Store datasets globally

// Toggle dropdown visibility
dom_select_view.addEventListener("click", () => {
  dom_select_view.classList.toggle("active");
});

// Update the chart with selected view
function updateChart(selectedView) {
  if (dailyChartInstance) {
    // Filter the dataset based on the selected view
    const filteredDataset = allDatasets.filter(
      (dataset) => dataset.label === selectedView
    );

    if (filteredDataset.length > 0) {
      // Update chart with the selected dataset
      dailyChartInstance.data.datasets = filteredDataset;
      dailyChartInstance.update();
    } else {
      console.error("Dataset không tồn tại:", selectedView);
    }
  }
}

// Handle click events for dropdown list items
dom_select_li.forEach((li) => {
  li.addEventListener("click", function () {
    const selectedView = this.getAttribute("data-view");
    view_selected.innerText = selectedView; // Update displayed selected view
    // Call updateChart with the selected view
    updateChart(selectedView);
  });
});

// Draw the daily chart with given data
function drawDailyChart(
  dates,
  spendValues,
  reachValues,
  messagingConversations,
  postReactions,
  pageLikes,
  postEngagement,
  linkClicks
) {
  const ctx = document.getElementById("dailyChart").getContext("2d");

  // Destroy existing chart instance if any
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
  }

  // Save all datasets for future use
  allDatasets = [
    {
      label: "Post Engagement",
      data: postEngagement,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Link Click",
      data: linkClicks,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Spend",
      data: spendValues,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Reach",
      data: reachValues,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Messaging Conversations",
      data: messagingConversations,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Post Reactions",
      data: postReactions,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
    {
      label: "Page Likes",
      data: pageLikes,
      borderColor: "#FFCE56",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
      fill: true,
      tension: 0.2,
    },
  ];

  // Default chart view with "Spend"
  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: allDatasets.filter((dataset) => dataset.label === "Spend"),
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 8, // Limit Y-axis labels
          },
        },
      },
    },
  });
}

// Hàm fetch dữ liệu từ API
async function fetchImpressionData(api) {
  try {
    const response = await fetch(api); // Fetch dữ liệu từ API
    const result = await response.json(); // Chuyển dữ liệu thành JSON

    // Kiểm tra dữ liệu trả về
    if (!result.data || !Array.isArray(result.data)) {
      console.error("Dữ liệu không hợp lệ:", result);
      return;
    }

    console.log("Dữ liệu API:", result.data);

    // Tự động tổng hợp số lượt hiển thị cho từng loại thiết bị
    const impressionsData = result.data.reduce((acc, entry) => {
      const device = entry.impression_device; // Lấy loại thiết bị từ impression_device
      const impressions = parseInt(entry.impressions, 10); // Đảm bảo impressions là số
      acc[device] = (acc[device] || 0) + impressions; // Cộng dồn số liệu
      return acc;
    }, {});

    console.log("Dữ liệu xử lý:", impressionsData);

    // Vẽ biểu đồ với dữ liệu đã xử lý
    drawDoughnutChart(impressionsData);
  } catch (error) {
    console.error("Lỗi khi fetch dữ liệu từ API:", error);
  }
}

// Định nghĩa hàm formatLabel
const formatLabel = (label) => {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Định nghĩa màu sắc cố định cho từng loại thiết bị
const deviceColors = {
  android_smartphone: "#262a53",
  android_tablet: "#66b3ff",
  desktop: "#99ff99",
  ipad: "#ffcc99",
  iphone: "#ffab00",
  other: "#c2f0c2",
};

// Hàm vẽ biểu đồ Doughnut Chart
function drawDoughnutChart(impressionsData) {
  // Xóa biểu đồ cũ nếu đã tồn tại
  if (impressionDoughnutChart) {
    impressionDoughnutChart.destroy();
  }

  const ctx = document
    .getElementById("impressionDoughnutChart")
    ?.getContext("2d");

  if (!ctx) {
    console.error("Canvas context không hợp lệ");
    return; // Nếu ctx không hợp lệ, không thể vẽ biểu đồ
  }

  // Lấy danh sách màu dựa trên thiết bị
  const backgroundColors = Object.keys(impressionsData).map(
    (device) => deviceColors[device] || "#999999" // Mặc định là màu xám nếu không tìm thấy màu
  );

  // Vẽ biểu đồ Doughnut Chart
  impressionDoughnutChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(impressionsData).map(formatLabel), // Gắn nhãn từ dữ liệu
      datasets: [
        {
          label: "Impressions",
          data: Object.values(impressionsData), // Gắn giá trị từ dữ liệu
          backgroundColor: backgroundColors, // Sử dụng màu cố định
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          display: false,
        },
      },
    },
  });
}

async function fetchDailyInsights(api) {
  try {
    let allData = []; // Store all data
    let nextUrl = api; // Initial URL

    // Fetch data with pagination
    while (nextUrl) {
      console.log("Fetching data from:", nextUrl);

      const response = await fetch(nextUrl);

      // Check if response is valid
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // Validate response format
      if (!data || typeof data !== "object") {
        throw new Error("Invalid API response format");
      }

      // Check for 'data' property in response
      if (!data.hasOwnProperty("data")) {
        console.error("Missing 'data' property in response:", data);
        throw new Error("Response does not contain 'data'");
      }

      if (data.error) {
        console.error("API Error:", data.error.message);
        document.querySelector(".loading").classList.remove("active");
        return;
      }

      if (!Array.isArray(data.data)) {
        console.warn("API response 'data' is not an array:", data.data);
        break;
      }

      // Merge data into allData
      allData = [...allData, ...data.data];

      // Check if there's a next page
      nextUrl = data.paging?.next || null;
    }
    console.log(allData);

    // No data to process
    if (allData.length === 0) {
      console.warn("No data available to draw the chart.");
      return;
    }

    let dates = [];
    let spendValues = [];
    let reachValues = [];
    let messagingConversations = [];
    let postReactions = [];
    let pageLikes = [];
    let postEngagement = [];
    let linkClicks = [];

    allData.forEach((entry) => {
      const date = entry?.date_start || "Unknown Date";
      const spend = parseFloat(entry?.spend) || 0;
      const reach = parseFloat(entry?.reach) || 0;
      let messaging = 0;
      let reactions = 0;
      let likes = 0;
      let engagement = 0;
      let linkclick = 0;

      // Check if actions exists and is an array
      if (entry.actions && Array.isArray(entry.actions)) {
        entry.actions.forEach((action) => {
          if (
            action?.action_type ===
            "onsite_conversion.messaging_conversation_started_7d"
          ) {
            messaging = action?.value || 0;
          }
          if (action?.action_type === "post_reaction") {
            reactions = action?.value || 0;
          }
          if (action?.action_type === "like") {
            likes = action?.value || 0;
          }
          if (action?.action_type === "post_engagement") {
            engagement = action?.value || 0;
          }
          if (action?.action_type === "link_click") {
            linkclick = action?.value || 0;
          }
        });
      }

      dates.push(date);
      spendValues.push(spend);
      reachValues.push(reach);
      messagingConversations.push(messaging);
      postReactions.push(reactions);
      pageLikes.push(likes);
      postEngagement.push(engagement);
      linkClicks.push(linkclick);
    });

    if (dates.length === 0) {
      console.warn("No valid data to draw the chart.");
      document.querySelector(".loading").classList.remove("active");
      return;
    }

    drawDailyChart(
      dates,
      spendValues,
      reachValues,
      messagingConversations,
      postReactions,
      pageLikes,
      postEngagement,
      linkClicks
    );

    document.querySelector(".loading").classList.remove("active");
  } catch (error) {
    console.error("Fetch error:", error.message);
    document.querySelector(".loading").classList.remove("active");
  }
}

const downloadButtons = document.querySelectorAll(".download_btn");
downloadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("123");

    const elementId = button.getAttribute("data-id"); // Lấy data-id từ icon
    let fileName = button.getAttribute("data-name") || "screenshot.png"; // Lấy data-name làm tên file, nếu không có thì mặc định là "screenshot.png"
    const query = localStorage.getItem("query");
    if (query) {
      fileName = `${fileName} - ${query}`;
    }
    downloadElementAsPNG(elementId, `${fileName}.png`); // Gọi hàm download với id và tên file tương ứng
  });
});
function downloadElementAsPNG(elementId, filename) {
  const element = document.getElementById(elementId);

  html2canvas(element).then((canvas) => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  });
}
// _______________---
const segment_legend = document.querySelector(".segment_legend");
function updateProgressBar(reach, engagement, likePage, messages, traffic) {
  const total = reach + engagement + likePage + messages;
  const segments = [
    { name: "reach", value: (reach / total) * 100 },
    { name: "engagement", value: (engagement / total) * 100 },
    { name: "likepage", value: (likePage / total) * 100 },
    { name: "traffic", value: (traffic / total) * 100 },
    { name: "message", value: (messages / total) * 100 },
  ];

  let legendParts = [];

  segments.forEach(({ name, value }) => {
    const segmentElement = document.querySelector(`.segment.${name}`);
    if (value > 0) {
      legendParts.push(
        `${name.charAt(0).toUpperCase() + name.slice(1)}: <b>${value.toFixed(
          0
        )}%</b>`
      );
      segmentElement.style.width = `${value}%`;
    } else {
      segmentElement.style.width = "0";
    }
  });

  segment_legend.innerHTML = legendParts.join(" | ");

  // Tính tỷ lệ phần trăm
}

// Ví dụ gọi hàm update
const dom_bar = document.querySelector(".dom_bar");
const dom_bar_close = document.querySelector(".dom_bar_close");
const dom_zoom = document.querySelector(".dom_zoom");
const dom_sidebar = document.querySelector("#dom_sidebar");
dom_bar.addEventListener("click", () => {
  dom_sidebar.classList.add("active");
  console.log(123);
});
dom_bar_close.addEventListener("click", () => {
  dom_sidebar.classList.toggle("active");
  console.log(123);
});
dom_sidebar.addEventListener("click", () => {
  dom_sidebar.classList.remove("active");
});
dom_zoom.addEventListener("click", () => {
  dom_sidebar.classList.toggle("zoom");
  dom_contentarea.classList.toggle("zoom");
});
function updateProgressBar(reach, engagement, likePage, messages, traffic) {
  const total = reach + engagement + likePage + messages;
  const segments = [
    { name: "reach", value: (reach / total) * 100 },
    { name: "engagement", value: (engagement / total) * 100 },
    { name: "likepage", value: (likePage / total) * 100 },
    { name: "traffic", value: (traffic / total) * 100 },
    { name: "message", value: (messages / total) * 100 },
  ];

  let legendParts = [];

  segments.forEach(({ name, value }) => {
    const segmentElement = document.querySelector(`.segment.${name}`);
    if (value > 0) {
      legendParts.push(
        `${name.charAt(0).toUpperCase() + name.slice(1)}: <b>${value.toFixed(
          0
        )}%</b>`
      );
      segmentElement.style.width = `${value}%`;
    } else {
      segmentElement.style.width = "0";
    }
  });

  segment_legend.innerHTML = legendParts.join(" | ");

  // Tính tỷ lệ phần trăm
}
