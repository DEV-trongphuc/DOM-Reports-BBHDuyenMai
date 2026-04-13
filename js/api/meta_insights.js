async function fetchAdsets() {
  const allData = [];
  let nextPageUrl = `${BASE_URL}/act_${ACCOUNT_ID}/insights?level=adset&fields=adset_id,adset_name,campaign_id,campaign_name,optimization_goal,spend,reach,impressions,actions,action_values,frequency,cpm,cpc,ctr,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}&limit=10000`;

  while (nextPageUrl) {
    const data = await fetchJSON(nextPageUrl);
    if (data.data) allData.push(...data.data);
    nextPageUrl = data.paging?.next || null;
  }

  return allData;
}

async function fetchCampaignInsights() {
  const allData = [];
  let nextPageUrl = `${BASE_URL}/act_${ACCOUNT_ID}/insights?level=campaign&fields=campaign_id,campaign_name,spend,reach,impressions,actions,action_values,frequency,cpm,cpc,ctr,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions&filtering=[{"field":"spend","operator":"GREATER_THAN","value":0}]&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}&limit=10000`;

  while (nextPageUrl) {
    const data = await fetchJSON(nextPageUrl);
    if (data.data) allData.push(...data.data);
    nextPageUrl = data.paging?.next || null;
  }
  return allData;
}

async function fetchAdsAndInsights(adsetIds, onBatchProcessedCallback) {
  if (!Array.isArray(adsetIds) || adsetIds.length === 0) return [];

  const headers = {
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  const now = Date.now();
  const results = [];
  let batchCount = 0;

  // Chia adsetIds thành các batch
  const adsetChunks = chunkArray(adsetIds, BATCH_SIZE);

  // Giảm số lượng batch song song để tối ưu hóa hiệu suất
  await runBatchesWithLimit(
    adsetChunks.map((batch) => async () => {
      const startTime = performance.now();

      // Xây dựng batch API
      const fbBatch = batch.map((adsetId) => ({
        method: "GET",
        relative_url:
          `${adsetId}/ads?fields=id,name,effective_status,adset_id,` +
          `adset{end_time,start_time,daily_budget,lifetime_budget},` +
          `creative{thumbnail_url,instagram_permalink_url,effective_object_story_id},` +
          `insights.time_range({since:'${startDate}',until:'${endDate}'}){spend,impressions,reach,actions,action_values,optimization_goal,clicks,inline_link_clicks,purchase_roas,account_id,account_name,account_currency,buying_type,objective,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions}`,
      }));

      // Gọi API
      let adsResp;
      try {
        adsResp = await fetchJSON(BASE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            access_token: META_TOKEN,
            batch: fbBatch,
            include_headers: false // 🚀 Optimize: Reduce response size by omitting headers for each sub-request
          }),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        return; // Nếu có lỗi, bỏ qua batch này
      }

      // Xử lý kết quả từ API
      const processed = [];
      for (const item of adsResp) {
        if (item?.code !== 200 || !item?.body) continue;

        let body;
        try {
          body = JSON.parse(item.body);
        } catch {
          continue;
        }

        const data = body.data;
        if (!Array.isArray(data) || data.length === 0) continue;
        // Duyệt qua từng ad trong dữ liệu trả về và xử lý
        for (const ad of data) {
          const adset = ad.adset ?? {};
          const creative = ad.creative ?? {};
          const insights = ad.insights?.data?.[0] ?? {};
          const endTime = adset.end_time ? Date.parse(adset.end_time) : 0;

          const effective_status =
            ad.effective_status === "ACTIVE" && endTime && endTime < now
              ? "COMPLETED"
              : ad.effective_status;

          // Chỉ lấy thông tin cần thiết từ insights
          processed.push({
            ad_id: ad.id,
            ad_name: ad.name,
            adset_id: ad.adset_id,
            effective_status,
            adset: {
              status: adset.status ?? null,
              daily_budget: adset.daily_budget || 0,
              lifetime_budget: adset.lifetime_budget ?? null,
              end_time: adset.end_time ?? null,
              start_time: adset.start_time ?? null,
            },
            creative: {
              thumbnail_url: creative.thumbnail_url ?? null,
              instagram_permalink_url: creative.instagram_permalink_url ?? null,
              facebook_post_url: creative.effective_object_story_id
                ? `https://facebook.com/${creative.effective_object_story_id}`
                : null,
            },
            insights: {
              spend: !isNaN(+insights.spend) ? +insights.spend : 0,
              impressions: +insights.impressions || 0,
              reach: +insights.reach || 0,
              clicks: +insights.clicks || 0,
              inline_link_clicks: +insights.inline_link_clicks || 0,
              purchase_roas: Array.isArray(insights.purchase_roas) ? insights.purchase_roas : [],
              account_id: insights.account_id || "",
              account_name: insights.account_name || "",
              account_currency: insights.account_currency || "",
              buying_type: insights.buying_type || "",
              objective: insights.objective || "",
              actions: Array.isArray(insights.actions) ? insights.actions : [],
              action_values: Array.isArray(insights.action_values) ? insights.action_values : [],
              // ⭐ Store dynamic video fields
              video_play_actions: insights.video_play_actions || [],
              video_thruplay_watched_actions: insights.video_thruplay_watched_actions || [],
              video_p25_watched_actions: insights.video_p25_watched_actions || [],
              video_p50_watched_actions: insights.video_p50_watched_actions || [],
              video_p75_watched_actions: insights.video_p75_watched_actions || [],
              video_p95_watched_actions: insights.video_p95_watched_actions || [],
              video_p100_watched_actions: insights.video_p100_watched_actions || [],
              optimization_goal: insights.optimization_goal || "",
            },
          });
        }
      }

      if (processed.length) {
        onBatchProcessedCallback?.(processed);
        results.push(...processed);
      }

      batchCount++;
    }),
    CONCURRENCY_LIMIT
  );

  return results;
}

async function fetchDailySpendByAccount() {
  const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions&time_increment=1&time_range[since]=${startDate}&time_range[until]=${endDate}&access_token=${META_TOKEN}`;
  const data = await fetchJSON(url);
  return data.data || [];
}

async function loadDailyChart() {
  try {
    const dailyData = await fetchDailySpendByAccount();
    DAILY_DATA = dailyData;
    renderDetailDailyChart2(DAILY_DATA);
  } catch (err) {
    console.error("Error in loadDailyChart:", err);
  }
}
