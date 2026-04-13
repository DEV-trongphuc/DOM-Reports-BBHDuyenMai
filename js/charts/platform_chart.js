/**
 * @file platform_chart.js
 * @description Fetch batch insights cho dashboard (vị trí, tuổi, khu vực, daily).
 *
 * ============================================================
 * ⚠️  Tất cả fetch functions sau SAI CHỔ trong thư mục charts/
 *      Nên chuyển toàn bộ sang: js/api/meta_insights.js
 * ============================================================
 * • loadPlatformSummary(campaignIds)       → Nên ở charts/dashboard_charts.js
 * • fetchSpendByPlatform(campaignIds)      → Nên ở api/meta_insights.js
 * • fetchSpendByAgeGender(campaignIds)     → Nên ở api/meta_insights.js
 * • fetchSpendByRegion(campaignIds)        → Nên ở api/meta_insights.js
 * • fetchDailySpendByCampaignIDs(ids)      → Nên ở api/meta_insights.js
 * • fetchDashboardInsightsBatch(ids)       → Nên ở api/meta_insights.js
 *
 * @depends   ACCOUNT_ID, META_TOKEN, BASE_URL, startDate, endDate, fetchJSON
 */
async function loadPlatformSummary(campaignIds = []) {
  const data = await fetchPlatformStats(campaignIds);
  updatePlatformSummaryUI(data);
}
async function fetchSpendByPlatform(campaignIds = []) {
  try {
    if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

    const filtering = campaignIds.length
      ? `&filtering=${encodeURIComponent(
        JSON.stringify([
          { field: "campaign.id", operator: "IN", value: campaignIds },
        ])
      )}`
      : "";

    const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend&breakdowns=publisher_platform,platform_position&time_range={"since":"${startDate}","until":"${endDate}"}${filtering}&access_token=${META_TOKEN}`;
    const data = await fetchJSON(url);
    return data.data || [];
  } catch (err) {
    console.error("❌ Error fetching spend by platform:", err);
    return [];
  }
}
async function fetchSpendByAgeGender(campaignIds = []) {
  try {
    if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

    // Nếu có campaignIds thì filter, còn không thì query theo account
    const filtering = campaignIds.length
      ? `&filtering=${encodeURIComponent(
        JSON.stringify([
          { field: "campaign.id", operator: "IN", value: campaignIds },
        ])
      )}`
      : "";

    const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend&breakdowns=age,gender&time_range={"since":"${startDate}","until":"${endDate}"}${filtering}&access_token=${META_TOKEN}`;

    const data = await fetchJSON(url);
    const results = data.data || [];

    return results;
  } catch (err) {
    console.error("❌ Error fetching spend by age_gender:", err);
    return [];
  }
}
async function fetchSpendByRegion(campaignIds = []) {
  try {
    if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

    const filtering = campaignIds.length
      ? `&filtering=${encodeURIComponent(
        JSON.stringify([
          { field: "campaign.id", operator: "IN", value: campaignIds },
        ])
      )}`
      : "";

    const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend&breakdowns=region&time_range={"since":"${startDate}","until":"${endDate}"}${filtering}&access_token=${META_TOKEN}`;

    const data = await fetchJSON(url);
    const results = data.data || [];

    return results;
  } catch (err) {
    console.error("❌ Error fetching spend by region:", err);
    return [];
  }
}
async function fetchDailySpendByCampaignIDs(campaignIds = []) {
  const loading = document.querySelector(".loading");
  if (loading) loading.classList.add("active");
  try {
    if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

    const filtering = encodeURIComponent(
      JSON.stringify([
        { field: "campaign.id", operator: "IN", value: campaignIds },
      ])
    );

    const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions,campaign_name,campaign_id&time_increment=1&filtering=${filtering}&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}`;

    const data = await fetchJSON(url);
    const results = data.data || [];

    if (loading) loading.classList.remove("active");
    return results;
  } catch (err) {
    console.error("❌ Error fetching daily spend by campaign IDs", err);
    return [];
  }
}

//  batch
async function fetchDashboardInsightsBatch(campaignIds = []) {
  if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

  // --- 1. TÍNH KHOẢNG THỜI GIAN TRƯỚC ---
  const currentStartDate = new Date(startDate + "T00:00:00");
  const currentEndDate = new Date(endDate + "T00:00:00");
  const durationMillis = currentEndDate.getTime() - currentStartDate.getTime();
  const durationDays = durationMillis / (1000 * 60 * 60 * 24) + 1;

  const previousEndDate = new Date(currentStartDate);
  previousEndDate.setDate(previousEndDate.getDate());

  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - durationDays + 1);

  const formatDate = (date) => date.toISOString().slice(0, 10);
  const prevStartDateStr = formatDate(previousStartDate);
  const prevEndDateStr = formatDate(previousEndDate);

  // --- KẾT THÚC BƯỚC 1 ---

  const filtering = campaignIds.length
    ? `&filtering=${encodeURIComponent(
      JSON.stringify([
        { field: "campaign.id", operator: "IN", value: campaignIds },
      ])
    )}`
    : "";
  const commonEndpoint = `act_${ACCOUNT_ID}/insights`;

  // Time range strings
  const currentTimeRange = `&time_range={"since":"${startDate}","until":"${endDate}"}`;
  const previousTimeRange = `&time_range={"since":"${prevStartDateStr}","until":"${prevEndDateStr}"}`; // <<< DÙNG NGÀY TRƯỚC

  // --- 2. ĐỊNH NGHĨA REQUESTS (Chỉ thêm platformStats_previous) ---
  const batchRequests = [
    // --- Dữ liệu kỳ hiện tại (Giữ nguyên) ---
    {
      method: "GET",
      name: "platformStats",
      relative_url: `${commonEndpoint}?fields=spend,impressions,reach,actions,inline_link_clicks,purchase_roas,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions${currentTimeRange}${filtering}`,
    },
    {
      method: "GET",
      name: "spendByPlatform",
      relative_url: `${commonEndpoint}?fields=spend&breakdowns=publisher_platform,platform_position${currentTimeRange}${filtering}`,
    },
    {
      method: "GET",
      name: "spendByAgeGender",
      relative_url: `${commonEndpoint}?fields=spend&breakdowns=age,gender${currentTimeRange}${filtering}`,
    },
    {
      method: "GET",
      name: "spendByRegion",
      relative_url: `${commonEndpoint}?fields=spend&breakdowns=region${currentTimeRange}${filtering}`,
    },
    {
      method: "GET",
      name: "spendByDevice",
      relative_url: `${commonEndpoint}?fields=spend,impressions&breakdowns=impression_device${currentTimeRange}${filtering}`,
    },
    {
      method: "GET",
      name: "dailySpend",
      relative_url: `${commonEndpoint}?fields=spend,impressions,reach,actions,campaign_name,campaign_id&time_increment=1${currentTimeRange}${filtering}`,
    },

    // --- Dữ liệu kỳ trước (Chỉ thêm platformStats) ---
    {
      method: "GET",
      name: "platformStats_previous",
      relative_url: `${commonEndpoint}?fields=spend,impressions,reach,actions,inline_link_clicks,purchase_roas,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions${previousTimeRange}${filtering}`,
    }, // <<< CHỈ THÊM CÁI NÀY
  ];
  // --- KẾT THÚC BƯỚC 2 ---

  const fbBatchBody = {
    access_token: META_TOKEN,
    batch: batchRequests,
    include_headers: false,
  };
  const headers = { "Content-Type": "application/json" };

  try {
    const batchResponse = await fetchJSON(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(fbBatchBody),
    });

    if (!Array.isArray(batchResponse)) {
      throw new Error(
        "Batch response (insights + prev stats) was not an array"
      );
    }

    // --- 3. XỬ LÝ KẾT QUẢ ---
    const results = {};
    batchResponse.forEach((item, index) => {
      const requestName = batchRequests[index].name;
      if (item && item.code === 200) {
        try {
          const body = JSON.parse(item.body);
          results[requestName] = body.data || [];
        } catch (e) {
          console.warn(
            `⚠️ Failed to parse batch response for ${requestName}`,
            e
          );
          results[requestName] = [];
        }
      } else {
        console.warn(
          `⚠️ Batch request for ${requestName} failed with code ${item?.code}`
        );
        results[requestName] = [];
      }
    });
    // --- KẾT THÚC BƯỚC 3 ---
    return results;
  } catch (err) {
    console.error(
      "❌ Fatal error during dashboard insights batch fetch (with prev stats):",
      err
    );
    // Trả về cấu trúc rỗng
    return {
      platformStats: [],
      spendByPlatform: [],
      spendByAgeGender: [],
      spendByRegion: [],
      spendByDevice: [],
      dailySpend: [],
      platformStats_previous: [], // << Thêm key rỗng cho trường hợp lỗi
    };
  }
}
/**
 * Hàm workflow mới:
 * 1. Gọi fetchDashboardInsightsBatch MỘT LẦN.
 * 2. Phân phối kết quả cho các hàm RENDER (thay vì các hàm load... riêng lẻ).
 */
