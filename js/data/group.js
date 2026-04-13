function groupByCampaign(adsets, campaignsData = []) {
  if (!Array.isArray(adsets) || adsets.length === 0) return [];

  const campaigns    = Object.create(null);
  const campMetricsMap = new Map((campaignsData || []).map((c) => [c.campaign_id, c]));

  for (let i = 0; i < adsets.length; i++) {
    const as = adsets[i];
    if (!as) continue;

    const campId   = as.campaign_id   || as.campaignId   || "unknown_campaign";
    const campName = as.campaign_name || as.campaignName || "Unknown";
    const goal     = as.optimization_goal || as.optimizationGoal || "UNKNOWN";
    const asId     = as.id || as.adset_id || as.adsetId || `adset_${i}`;

    let campaign = campaigns[campId];
    if (!campaign) {
      const cMetrics = campMetricsMap.get(campId) || {};
      campaign = campaigns[campId] = {
        id:           campId,
        name:         campName,
        spend:        +cMetrics.spend       || 0,
        result:       getResults(cMetrics)  || 0,
        reach:        +cMetrics.reach       || 0,
        impressions:  +cMetrics.impressions || 0,
        reactions:    getReaction(cMetrics) || 0,
        clicks:       +cMetrics.clicks      || 0,
        inline_link_clicks: +cMetrics.inline_link_clicks || 0,
        purchase_roas:  cMetrics.purchase_roas  || [],
        account_id:     cMetrics.account_id     || "",
        account_name:   cMetrics.account_name   || "",
        account_currency: cMetrics.account_currency || "",
        buying_type:    cMetrics.buying_type    || "",
        objective:      cMetrics.objective      || "",
        actions:        cMetrics.actions        || [],
        action_values:  cMetrics.action_values  || [],
        video_play_actions:              cMetrics.video_play_actions              || [],
        video_thruplay_watched_actions:  cMetrics.video_thruplay_watched_actions  || [],
        video_p25_watched_actions:       cMetrics.video_p25_watched_actions       || [],
        video_p50_watched_actions:       cMetrics.video_p50_watched_actions       || [],
        video_p75_watched_actions:       cMetrics.video_p75_watched_actions       || [],
        video_p95_watched_actions:       cMetrics.video_p95_watched_actions       || [],
        video_p100_watched_actions:      cMetrics.video_p100_watched_actions      || [],
        adsets:     [],
        _adsetMap:  Object.create(null),
        _goals:     new Set(),
        _cMetrics:  cMetrics,
      };
    }

    campaign._goals.add(goal);

    let adset = campaign._adsetMap[asId];
    if (!adset) {
      adset = {
        id:   asId,
        name: as.name || as.adset_name || as.adsetName || "Unnamed Adset",
        optimization_goal: goal,
        spend:       +as.spend       || 0,
        result:      getResults(as)  || 0,
        reach:       +as.reach       || 0,
        impressions: +as.impressions || 0,
        reactions:   getReaction(as) || 0,
        clicks:      +as.clicks      || 0,
        inline_link_clicks: +as.inline_link_clicks || 0,
        link_clicks: window.safeGetActionValue(as.actions, "link_click") || +as.inline_link_clicks || 0,
        follow: (
          window.safeGetActionValue(as.actions, "page_like") +
          window.safeGetActionValue(as.actions, "page_follow") +
          window.safeGetActionValue(as.actions, "instagram_profile_follow") +
          window.safeGetActionValue(as.actions, "onsite_conversion.page_like")
        ),
        purchase_roas: as.purchase_roas || [],
        account_id:    as.account_id   || "",
        account_name:  as.account_name || "",
        actions:       as.actions      || [],
        video_play_actions:             as.video_play_actions             || [],
        video_thruplay_watched_actions: as.video_thruplay_watched_actions || [],
        video_p25_watched_actions:      as.video_p25_watched_actions      || [],
        video_p50_watched_actions:      as.video_p50_watched_actions      || [],
        video_p75_watched_actions:      as.video_p75_watched_actions      || [],
        video_p95_watched_actions:      as.video_p95_watched_actions      || [],
        video_p100_watched_actions:     as.video_p100_watched_actions     || [],
        ads:             [],
        end_time:        (as.ads?.[0]?.adset?.end_time        || as.end_time)        || null,
        start_time:      (as.ads?.[0]?.adset?.start_time      || as.start_time)      || null,
        daily_budget:    (as.ads?.[0]?.adset?.daily_budget    || as.daily_budget)    || 0,
        lifetime_budget: (as.ads?.[0]?.adset?.lifetime_budget || as.lifetime_budget) || 0,
      };
      campaign._adsetMap[asId] = adset;
      campaign.adsets.push(adset);
    }

    const ads = as.ads || [];
    for (let j = 0; j < ads.length; j++) {
      const ad = ads[j];
      if (!ad) continue;

      const ins = Array.isArray(ad.insights?.data)
        ? ad.insights.data[0]
        : Array.isArray(ad.insights)
          ? ad.insights[0]
          : ad.insights || {};

      const adActions = ins.actions;
      adset.ads.push({
        id:     ad.ad_id || ad.id || null,
        name:   ad.ad_name || ad.name || "Unnamed Ad",
        status: ad.effective_status?.toUpperCase() || ad.status || "UNKNOWN",
        optimization_goal: ad.optimization_goal || goal || "UNKNOWN",
        spend:              +ins.spend              || 0,
        result:             getResults(ins)         || 0,
        reach:              +ins.reach              || 0,
        impressions:        +ins.impressions        || 0,
        reactions:          getReaction(ins)        || 0,
        clicks:             +ins.clicks             || 0,
        inline_link_clicks: +ins.inline_link_clicks || 0,
        purchase_roas:      ins.purchase_roas       || [],
        account_id:         ins.account_id          || "",
        account_name:       ins.account_name        || "",
        account_currency:   ins.account_currency    || "",
        buying_type:        ins.buying_type         || "",
        objective:          ins.objective           || "",
        actions:            adActions               || [],
        action_values:      ins.action_values       || [],
        video_play_actions:             ins.video_play_actions             || [],
        video_thruplay_watched_actions: ins.video_thruplay_watched_actions || [],
        video_p25_watched_actions:      ins.video_p25_watched_actions      || [],
        video_p50_watched_actions:      ins.video_p50_watched_actions      || [],
        video_p75_watched_actions:      ins.video_p75_watched_actions      || [],
        video_p95_watched_actions:      ins.video_p95_watched_actions      || [],
        video_p100_watched_actions:     ins.video_p100_watched_actions     || [],
        thumbnail: ad.creative?.thumbnail_url || ad.creative?.full_picture || "https://via.placeholder.com/64",
        post_url:  ad.creative?.facebook_post_url || ad.creative?.instagram_permalink_url || "#",
      });
    }
  }

  return Object.values(campaigns).map((c) => {
    if (c._goals.size === 1) {
      const uniqueGoal     = Array.from(c._goals)[0];
      c.result             = getResults(c._cMetrics, uniqueGoal);
      c.optimization_goal  = uniqueGoal;
    } else {
      c.result       = 0;
      c.isMixedGoal  = true;
    }

    if (c.adsets.length > 0) c.optimization_goal = c.adsets[0].optimization_goal;

    delete c._adsetMap;
    delete c._goals;
    delete c._cMetrics;
    return c;
  });
}
