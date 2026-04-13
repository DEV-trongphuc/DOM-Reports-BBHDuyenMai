
// =================== COLOR PALETTE ===================
const COLORS = {
    // Metric overview
    cpr:        '#fd7e14',
    cpm:        '#9C27B0',
    cpc:        '#3b82f6',
    results:    '#dc3545',
    leads:      '#4CAF50',
    messages:   '#00BCD4',
    follows:    '#E1306C',

    // Chart labels / datalabels
    chartLabel: '#555',
    chartTick:  '#666',

    // Goal chart grid
    gridLine:   'rgba(0,0,0,0.03)',

    // Goal chart gradient – gold (top goal)
    gradGoldStart: 'rgba(255,169,0,1)',
    gradGoldEnd:   'rgba(255,169,0,0.4)',

    // Goal chart gradient – gray (other goals)
    gradGrayStart: 'rgba(210,210,210,0.9)',
    gradGrayEnd:   'rgba(160,160,160,0.4)',

    // Platform list
    platformName:       '#333',
    platformSpend:      '#444',
    platformMoneyIcon:  '#aaa',
    platformBadgeBg:    '#fff8e1',
    platformBadgeText:  '#ff9800',

    // Top campaigns bar
    barGold:    'linear-gradient(90deg,#FFA900,#FFD000)',
    barGray:    'linear-gradient(90deg,#cbd5e1,#e2e8f0)',

    // Top campaigns text
    campNameColor:      '#1e293b',
    campSpendTop:       '#d97706',
    campSpendOther:     '#374151',
    campPctColor:       '#94a3b8',
    campBorderTop:      'rgba(255,169,0,0.25)',
    campBorderOther:    '#f1f5f9',
    campBgTop:          'linear-gradient(135deg,#fffbeb,#fff9f0)',
    campBgOther:        '#fff',
    campBarTrack:       '#f1f5f9',

    // Engagement mix
    engagementIcon:     '#94a3b8',
    engagementLabel:    '#374151',
    engagementVal:      '#1e293b',
    engagementPct:      '#94a3b8',
    engagementBarTrack: '#f1f5f9',
    engagementBarTop:   '#FFA900',
    engagementBarOther: '#cbd5e1',
    engagementNoData:   '#94a3b8',
    engagementIconBg:   '#f1f5f9',

    // Device chart
    devColors: ['#4267B2', '#E1306C', '#FFA900', '#10b981', '#6366f1'],
    deviceLabel:        '#555',
    deviceValue:        '#333',
    deviceCenterPct:    '#333',
    deviceCenterLabel:  '#666',
    deviceBorder:       '#f0f0f0',

    // Doughnut chart
    doughnutPrimary:        '#FFA900',
    doughnutOther:          '#E0E0E0',
    doughnutPrimaryHover:   '#FFB700',
    doughnutOtherHover:     '#D0D0D0',
    doughnutBorder:         '#fff',

    // No-data / info
    noData: '#94a3b8',

    // Overview metric text
    metricLabel:  '#777',
    metricValue:  '#333',
    metricDivider: '#f2f2f2',
};

// =================== EXTRA SHOW ALL DETAILS FEATURE ===================
function setupShowAllDetails() {
    const btn = document.getElementById("show_all_btn");
    const container = document.getElementById("extra_details_container");
    const chartsRow = document.getElementById("extra_charts_row");

    if (!btn || !container) return;

    // Default to open
    container.style.display = "flex";
    container.style.paddingBottom = "1rem";
    if (chartsRow) chartsRow.style.display = "flex";
    btn.classList.add("open");
    btn.innerHTML = 'Extra Details <i class="fa-solid fa-angle-up"></i>';

    btn.addEventListener("click", () => {
        const isHidden = container.style.display === "none";
        if (isHidden) {
            container.style.display = "flex";
            container.style.paddingBottom = "2rem";
            if (chartsRow) chartsRow.style.display = "flex";
            btn.classList.add("open");
            btn.innerHTML = 'Extra Details <i class="fa-solid fa-angle-up"></i>';
            loadExtraCharts();
        } else {
            container.style.display = "none";
            if (chartsRow) chartsRow.style.display = "none";
            btn.classList.remove("open");
            btn.innerHTML = 'Extra Details <i class="fa-solid fa-angle-down"></i>';
        }
    });
}

/**
 * Single-pass aggregation over the full campaign tree.
 * Replaces 4 independent forEach walks with 1, reducing iterations ~4×.
 */
function _aggregateExtraStats(campaigns) {
  const sVal = window.safeGetActionValue;
  const sumArr = (arr) => Array.isArray(arr)
    ? arr.reduce((s, a) => s + (+a.value || 0), 0)
    : (+arr?.value || 0);

  const stats = {
    totalSpend: 0, impressions: 0, linkClicks: 0,
    results: 0, follows: 0, messages: 0, leads: 0,
    plays: 0, vp25: 0, vp50: 0, vp75: 0, vp95: 0, thru: 0, vp100: 0,
    reactions: 0, comments: 0, saves: 0, shares: 0, clicks: 0,
    photoViews: 0, purchases: 0,
    goalSpend: {},
    campSpend: {},
    firstGoal: null,
  };

  campaigns.forEach((c) => {
    const campName = c.campaign_name || c.name || c.id || "Unknown";
    let campSpendTotal = 0;

    c.adsets?.forEach((as) => {
      const ac  = as.actions || [];
      const spend = parseFloat(as.spend || 0);
      const goal  = (as.optimization_goal || "UNKNOWN").replace(/_/g, " ");

      stats.totalSpend  += spend;
      stats.impressions += parseInt(as.impressions || 0);
      stats.results     += parseFloat(as.result || 0);
      stats.linkClicks  += sVal(ac, "link_click") || +as.inline_link_clicks || 0;
      stats.follows     += as.follow || (
        sVal(ac, "page_like") + sVal(ac, "like") +
        sVal(ac, "page_follow") + sVal(ac, "instagram_profile_follow") +
        sVal(ac, "onsite_conversion.page_like")
      );
      stats.messages    += sVal(ac, "onsite_conversion.messaging_conversation_started_7d")
                         || sVal(ac, "messaging_conversation_started_7d") || 0;
      stats.leads       += sVal(ac, "lead") || sVal(ac, "onsite_conversion.lead_grouped") || 0;
      stats.reactions   += sVal(ac, "post_reaction") + sVal(ac, "like");
      stats.comments    += sVal(ac, "comment");
      stats.saves       += sVal(ac, "onsite_conversion.post_save") || sVal(ac, "post_save");
      stats.shares      += sVal(ac, "post");
      stats.clicks      += sVal(ac, "link_click") || +as.inline_link_clicks || 0;
      stats.photoViews  += sVal(ac, "photo_view");
      stats.purchases   += sVal(ac, "purchase") || sVal(ac, "omni_purchase")
                        || sVal(ac, "onsite_conversion.purchase") || sVal(ac, "fb_pixel_purchase");
      stats.plays  += sumArr(as.video_play_actions);
      stats.vp25   += sumArr(as.video_p25_watched_actions);
      stats.vp50   += sumArr(as.video_p50_watched_actions);
      stats.vp75   += sumArr(as.video_p75_watched_actions);
      stats.vp95   += sumArr(as.video_p95_watched_actions);
      stats.thru   += sumArr(as.video_thruplay_watched_actions);
      stats.vp100  += sumArr(as.video_p100_watched_actions);

      if (goal !== "UNKNOWN" && goal !== "-") {
        stats.goalSpend[goal] = (stats.goalSpend[goal] || 0) + spend;
      }
      campSpendTotal += spend;

      if (!stats.firstGoal) stats.firstGoal = as.optimization_goal || null;
    });

    stats.campSpend[campName] = (stats.campSpend[campName] || 0) + campSpendTotal;
  });

  return stats;
}

async function loadExtraCharts() {
    const campaigns = window._ALL_CAMPAIGNS || [];
    if (!campaigns.length) return;

    // Guard: skip full re-render if date range and dataset haven't changed
    const _cacheKey = `${startDate}_${endDate}_${campaigns.length}`;
    if (window._extraChartsKey === _cacheKey) return;
    window._extraChartsKey = _cacheKey;

    // Single-pass aggregation — shared by all render functions below
    const stats = _aggregateExtraStats(campaigns);

    renderExtraOverview(stats);
    renderExtraGoalChart(stats.goalSpend);
    await loadDeviceChart();
    await loadExtraPlatformPositions();
    renderVideoFunnelChart(stats);
    renderTopCampaignsChart(stats.campSpend);
    renderEngagementMixChart(stats);
}


function renderExtraOverview(stats) {
    const wrap = document.getElementById("extra_overall_metrics");
    if (!wrap) return;

    const { totalSpend, impressions, linkClicks, results, leads, messages, follows } = stats;

    const cpm = impressions > 0 ? (totalSpend / impressions) * 1000 : 0;
    const cpc = linkClicks > 0 ? totalSpend / linkClicks : 0;
    let cpr = results > 0 ? totalSpend / results : 0;
    let cprLabel = "CPR";

    const campaigns = window._ALL_CAMPAIGNS || [];
    if (campaigns.length > 0) {
        const firstGoal = stats.firstGoal;
        if (firstGoal === "REACH" || firstGoal === "IMPRESSIONS") {
            cpr *= 1000;
            cprLabel = firstGoal === "REACH" ? "CPR (1k Reach)" : "CPR (1k Impress)";
        }
    }

    const createItem = (label, value, color) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 0.5rem;border-bottom:1px solid ${COLORS.metricDivider};">
            <div style="display:flex;align-items:center;">
                <i class="fa-solid fa-circle" style="color:${color};font-size:0.4rem;margin-right:12px;"></i>
                <span style="color:${COLORS.metricLabel};font-weight:500;font-size:1rem;">${label}</span>
            </div>
            <span style="font-weight:700;font-size:1.1rem;color:${COLORS.metricValue};">${value}</span>
        </div>`;

    wrap.style.maxHeight = "unset";
    wrap.style.overflowY = "unset";
    wrap.style.paddingRight = "0";

    const fmt  = (v) => Math.round(v).toLocaleString("vi-VN") + "đ";
    const fmtN = (v) => Math.round(v).toLocaleString("vi-VN");

    wrap.innerHTML = `
        ${createItem(cprLabel,    fmt(cpr),       COLORS.cpr)}
        ${createItem("CPM",       fmt(cpm),       COLORS.cpm)}
        ${createItem("CPC",       fmt(cpc),       COLORS.cpc)}
        ${createItem("Results",   fmtN(results),  COLORS.results)}
        ${createItem("Leads",     fmtN(leads),    COLORS.leads)}
        ${createItem("Messages",  fmtN(messages), COLORS.messages)}
        ${createItem("Follows",   fmtN(follows),  COLORS.follows)}
    `;

    if (wrap.lastElementChild) {
        wrap.lastElementChild.style.borderBottom = "none";
        wrap.lastElementChild.style.paddingBottom = "0";
    }
}


function renderExtraGoalChart(goalSpend) {
    const canvas = document.getElementById("extra_goal_chart");
    if (!canvas) return;
    if (!goalSpend || !Object.keys(goalSpend).length) return;
    const ctx = canvas.getContext("2d");

    if (window.extra_goal_chart_instance) window.extra_goal_chart_instance.destroy();

    const goals  = Object.keys(goalSpend).sort((a, b) => goalSpend[b] - goalSpend[a]);
    const values = goals.map((g) => Math.round(goalSpend[g]));
    if (!goals.length) return;

    const gradGold = ctx.createLinearGradient(0, 0, 0, 300);
    gradGold.addColorStop(0, COLORS.gradGoldStart);
    gradGold.addColorStop(1, COLORS.gradGoldEnd);
    const gradGray = ctx.createLinearGradient(0, 0, 0, 300);
    gradGray.addColorStop(0, COLORS.gradGrayStart);
    gradGray.addColorStop(1, COLORS.gradGrayEnd);

    const formatMoney = (v) => {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
        return v;
    };

    const SHORT_GOALS = {
        "TWO_SECOND_CONTINUOUS_VIDEO_VIEWS": "2S VIDEO VIEWS",
        "POST_ENGAGEMENT": "POST ENG.",
        "MESSAGING_CONVERSATION_STARTED": "MESSAGES",
        "THRUPLAY": "THRUPLAY",
        "OUTCOME_LEADS": "LEADS",
        "LINK_CLICKS": "CLICKS",
    };

    const isFew = goals.length < 3;
    window.extra_goal_chart_instance = new Chart(ctx, {
        type: "bar",
        plugins: [ChartDataLabels],
        data: {
            labels: goals.map((g) => {
                const short = SHORT_GOALS[g] || g.replace(/_/g, " ");
                return short.length > 16 ? short.substring(0, 14) + ".." : short.toUpperCase();
            }),
            datasets: [{
                label: "Spend",
                data: values,
                backgroundColor: values.map((_, i) => i === 0 ? gradGold : gradGray),
                borderRadius: 8, borderWidth: 0,
                ...(isFew && { barPercentage: 0.35, categoryPercentage: 0.65 }),
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { left: 10, right: 10 } },
            animation: { duration: 600, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => `Spend: ${formatMoney(c.raw)}` } },
                datalabels: {
                    anchor: "end", align: "end", offset: 2,
                    font: { size: 11, weight: "600", family: "'Roboto', sans-serif" },
                    color: COLORS.chartLabel,
                    formatter: (v) => v > 0 ? formatMoney(v) : ""
                }
            },
            scales: {
                x: {
                    grid: { color: COLORS.gridLine },
                    ticks: { color: COLORS.chartTick, font: { weight: "600", size: 9, family: "'Roboto', sans-serif" }, autoSkip: false, maxRotation: 45, minRotation: 0 },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: COLORS.gridLine },
                    ticks: { display: false }, border: { display: false },
                    suggestedMax: Math.max(...values) * 1.2
                }
            }
        }
    });
}

// ── Platform Positions helpers (khai báo ngoài forEach — tránh redeclare) ──
function _getPlatformLogo(pub) {
    if (pub.includes('facebook')) return 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png';
    if (pub.includes('instagram')) return 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg';
    return 'https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/social-medias/thread-block-logo-1-i73pfbwpt6bmcgvlcae3sc.png/thread-block-logo-1-14s5twxzakpdzka2bufeir.png';
}
function _formatPlatformName(pub, pos) {
    return `${pub} ${pos}`.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function loadExtraPlatformPositions() {
    try {
        if (window._DASHBOARD_BATCH_RESULTS?.spendByPlatform) {
            renderExtraPlatformPositions(window._DASHBOARD_BATCH_RESULTS.spendByPlatform);
            return;
        }
        if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");
        const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend&breakdowns=publisher_platform,platform_position&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}`;
        const data = await fetchJSON(url);
        renderExtraPlatformPositions(data.data || []);
    } catch (err) {
        console.error("Error fetching platform positions:", err);
    }
}

function renderExtraPlatformPositions(data) {
    const wrap = document.getElementById("extra_platform_list");
    if (!wrap || !Array.isArray(data)) return;
    wrap.innerHTML = "";

    const positionMap = {};
    let totalSpend = 0;

    data.forEach((item) => {
        const publisher = item.publisher_platform || "other";
        const position = item.platform_position || "unknown";
        const key = `${publisher}_${position}`;
        const spend = +item.spend || 0;
        totalSpend += spend;
        if (!positionMap[key]) positionMap[key] = { spend: 0, publisher, position };
        positionMap[key].spend += spend;
    });

    const positions = Object.entries(positionMap).sort((a, b) => b[1].spend - a[1].spend);
    const fragment = document.createDocumentFragment();

    positions.forEach(([, val]) => {
        const { publisher, position, spend } = val;
        const percent = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
        const li = document.createElement("li");
        li.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:1.5rem 2rem;margin-bottom:1rem;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.04);border:1px solid #f0f0f0;`;
        li.innerHTML = `
            <div style="display:flex;align-items:center;gap:1.2rem;flex:1;">
                <img src="${_getPlatformLogo(publisher)}" style="width:2.8rem;height:2.8rem;object-fit:contain;">
                <span style="font-size:1.1rem;font-weight:600;color:${COLORS.platformName};">${_formatPlatformName(publisher, position)}</span>
            </div>
            <div style="flex:1;text-align:center;">
                <span style="font-weight:600;font-size:1.1rem;color:${COLORS.platformSpend};"><i class="fa-solid fa-money-bill" style="color:${COLORS.platformMoneyIcon};margin-right:5px;font-size:0.9rem;"></i>${spend.toLocaleString("vi-VN")}đ</span>
            </div>
            <div style="flex:0 0 80px;text-align:right;">
                <span style="background:${COLORS.platformBadgeBg};color:${COLORS.platformBadgeText};padding:0.4rem 0.8rem;border-radius:20px;font-size:0.95rem;font-weight:700;">${percent.toFixed(1)}%</span>
            </div>`;
        fragment.appendChild(li);
    });

    if (!positions.length) {
        wrap.innerHTML = `<li><p>No data available.</p></li>`;
    } else {
        wrap.appendChild(fragment);
    }
}

// =================== 5. VIDEO FUNNEL (CSS-only, y hệt detail modal) ===================
function renderVideoFunnelChart(stats) {
    const content = document.getElementById("extra_video_funnel_content");
    if (!content) return;

    const { plays, vp25, vp50, vp75, vp95, thru, vp100 } = stats;

    if (!plays) {
        content.innerHTML = `<p style="text-align:center;padding:2rem;color:${COLORS.noData};font-size:1.3rem;">
          <i class="fa-solid fa-circle-info"></i> Không có dữ liệu video.
        </p>`;
        return;
    }

    // Dùng cùng logic và cùng CSS classes với renderVideoFunnel() trong main.js
    const steps = [
        { val: plays, label: "Video View (3s)", color: "gold" },
        { val: vp25, label: "Video 25%", color: "gold" },
        { val: vp50, label: "Video 50%", color: "amber" },
        { val: vp75, label: "Video 75%", color: "amber" },
        { val: vp95, label: "Video 95%", color: "orange" },
        { val: thru, label: "ThruPlay", color: "orange" },
        { val: vp100, label: "Video 100%", color: "gray" },
    ].filter(s => s.val > 0).sort((a, b) => b.val - a.val);

    const maxVal = steps[0]?.val || 1;
    const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
    const dropHtml = (cur, prev) => {
        if (!prev) return '';
        const d = ((prev - cur) / prev * 100).toFixed(0);
        return `<span class="vf_drop"><i class="fa-solid fa-arrow-down"></i> -${d}%</span>`;
    };

    let html = '';
    steps.forEach((step, i) => {
        const widthPct = Math.max(8, Math.round((step.val / maxVal) * 100));
        const retentionPct = i === 0 ? '100%' : ((step.val / maxVal) * 100).toFixed(1) + '%';
        const prevVal = i > 0 ? steps[i - 1].val : 0;
        const drop = i > 0 ? dropHtml(step.val, prevVal) : '';
        html += `
          ${i > 0 ? '<div class="vf_connector"></div>' : ''}
          <div class="vf_step">
            <div class="vf_meta">
              <div class="vf_name">${step.label}</div>
              ${drop}
            </div>
            <div class="vf_bar_wrap">
              <div class="vf_bar ${step.color}" style="width:${widthPct}%;">
                <span>${retentionPct}</span>
              </div>
            </div>
            <div class="vf_count">${fmt(step.val)}</div>
          </div>`;
    });

    content.innerHTML = html;
}

// =================== 6. TOP 5 CAMPAIGNS BY SPEND ===================
function renderTopCampaignsChart(campSpend) {
    const wrap = document.getElementById("extra_top_campaigns_list");
    if (!wrap) return;
    wrap.innerHTML = "";

    const sorted = Object.entries(campSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!sorted.length) return;

    const total  = sorted.reduce((s, [, v]) => s + v, 0);
    const maxVal = sorted[0][1];
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    const barColors = [
        COLORS.barGold,
        COLORS.barGray,
        COLORS.barGray,
        COLORS.barGray,
        COLORS.barGray,
    ];

    sorted.forEach(([name, spend], i) => {
        const pct = total > 0 ? ((spend / total) * 100).toFixed(1) : 0;
        const barW = maxVal > 0 ? ((spend / maxVal) * 100).toFixed(1) : 0;
        const spendFmt = parseInt(spend).toLocaleString('vi-VN');
        const isTop = i === 0;

        const item = document.createElement('div');
        item.style.cssText = `
            padding: 1rem 1.4rem;
            border-radius: 12px;
            border: 1.5px solid ${isTop ? COLORS.campBorderTop : COLORS.campBorderOther};
            background: ${isTop ? COLORS.campBgTop : COLORS.campBgOther};
            transition: box-shadow .15s;
            cursor: default;
        `;
        item.onmouseover = () => item.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        item.onmouseout = () => item.style.boxShadow = '';

        item.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;gap:1rem;">
                <div style="display:flex;align-items:center;gap:0.8rem;flex:1;min-width:0;">
                    <span style="font-size:${i < 3 ? '1.6rem' : '1.1rem'};flex-shrink:0;line-height:1;
                        ${i >= 3 ? `width:2rem;height:2rem;border-radius:50%;background:${COLORS.campBarTrack};display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:${COLORS.campPctColor};font-size:1rem;` : ''}
                    ">${medals[i]}</span>
                    <span style="font-size:1.15rem;font-weight:600;color:${COLORS.campNameColor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${name}">${name}</span>
                </div>
                <div style="flex-shrink:0;text-align:right;">
                    <span style="font-size:1.25rem;font-weight:700;color:${isTop ? COLORS.campSpendTop : COLORS.campSpendOther}">${spendFmt}đ</span>
                    <span style="display:block;font-size:1rem;color:${COLORS.campPctColor};font-weight:500;">${pct}%</span>
                </div>
            </div>
            <div style="height:6px;border-radius:99px;background:${COLORS.campBarTrack};overflow:hidden;">
                <div style="height:100%;width:${barW}%;border-radius:99px;background:${barColors[i]};transition:width .6s ease;"></div>
            </div>
        `;
        wrap.appendChild(item);
    });
}

// =================== 7. ENGAGEMENT MIX (CSS list) ===================
function renderEngagementMixChart(stats) {
    const wrap = document.getElementById("extra_engagement_list");
    if (!wrap) return;
    wrap.innerHTML = "";
    wrap.style.paddingBottom = "4rem";
    wrap.style.overflowY = "auto";
    wrap.style.maxHeight = "38rem";

    const { reactions, clicks, follows, comments, saves, shares, photoViews, thru: thruPlays, purchases } = stats;

    const metrics = [
        { label: "Reaction",    val: reactions,  icon: "fa-thumbs-up" },
        { label: "Click",       val: clicks,     icon: "fa-arrow-pointer" },
        { label: "Follow",      val: follows,    icon: "fa-user-plus" },
        { label: "Comment",     val: comments,   icon: "fa-comment" },
        { label: "Save",        val: saves,      icon: "fa-bookmark" },
        { label: "Share",       val: shares,     icon: "fa-share-nodes" },
        { label: "Photo View",  val: photoViews, icon: "fa-image" },
        { label: "Purchase",    val: purchases,  icon: "fa-bag-shopping" },
    ].filter((m) => m.val > 0).sort((a, b) => b.val - a.val);

    if (!metrics.length) {
        wrap.innerHTML = `<p style="text-align:center;color:${COLORS.engagementNoData};padding:2rem;font-size:1.2rem;">Không có dữ liệu tương tác.</p>`;
        return;
    }

    const total = metrics.reduce((s, m) => s + m.val, 0);
    const maxVal = metrics[0].val;

    metrics.forEach((m, idx) => {
        const pct = total > 0 ? ((m.val / total) * 100).toFixed(1) : 0;
        const barW = maxVal > 0 ? ((m.val / maxVal) * 100).toFixed(1) : 0;
        const valFmt = m.val >= 1000 ? (m.val / 1000).toFixed(1) + 'k' : m.val.toLocaleString('vi-VN');
        const barColor = idx === 0 ? COLORS.engagementBarTop : COLORS.engagementBarOther;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;';
        row.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:0.9rem;">
                    <span style="width:3rem;height:3rem;border-radius:50%;background:${COLORS.engagementIconBg};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${m.icon}" style="color:${COLORS.engagementIcon};font-size:1.2rem;"></i>
                    </span>
                    <span style="font-size:1.15rem;font-weight:600;color:${COLORS.engagementLabel};">${m.label}</span>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:1.25rem;font-weight:700;color:${COLORS.engagementVal};">${valFmt}</span>
                    <span style="font-size:1rem;color:${COLORS.engagementPct};font-weight:500;margin-left:0.5rem;">${pct}%</span>
                </div>
            </div>
            <div style="height:5px;border-radius:99px;background:${COLORS.engagementBarTrack};overflow:hidden;">
                <div style="height:100%;width:${barW}%;border-radius:99px;background:${barColor};transition:width .5s ease;"></div>
            </div>
        `;
        wrap.appendChild(row);
    });
}

// =================== DEVICE CHART ===================
async function fetchSpendByDevice() {
    try {
        if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");
        const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions&breakdowns=impression_device&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${META_TOKEN}`;
        const data = await fetchJSON(url);
        return data.data || [];
    } catch (err) {
        console.error("Error fetching device data:", err);
        return [];
    }
}

async function loadDeviceChart() {
    let data = [];
    if (window._DASHBOARD_BATCH_RESULTS?.spendByDevice) {
        data = window._DASHBOARD_BATCH_RESULTS.spendByDevice;
    } else {
        data = await fetchSpendByDevice();
    }
    if (!data?.length) return;

    const deviceStats = {};
    let totalSpend = 0;
    data.forEach(item => {
        const device = item.impression_device;
        const spend = parseFloat(item.spend || 0);
        deviceStats[device] = (deviceStats[device] || 0) + spend;
        totalSpend += spend;
    });

    const labels = Object.keys(deviceStats).sort((a, b) => deviceStats[b] - deviceStats[a]);
    const values = labels.map(l => deviceStats[l]);

    const chartContainer = document.getElementById("device_chart").closest(".dom_inner");
    if (!chartContainer) return;

    chartContainer.innerHTML = `
        <h2 style="margin-bottom: 2rem;"><i class="fa-solid fa-mobile-screen main_clr"></i> Device Breakdown</h2>
        <div class="dom_platform" style="display:flex;justify-content:space-between;align-items:center;gap:2rem;">
            <div id="device_list_left" style="flex:1;display:flex;flex-direction:column;gap:1.2rem;"></div>
            <div style="flex:1;position:relative;display:flex;justify-content:center;align-items:center;">
                <div class="chart-wrapper circular" style="max-width:300px;">
                    <canvas id="device_chart_canvas"></canvas>
                    <div style="position:absolute;text-align:center;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;">
                        <p style="font-size:1.8rem;font-weight:800;color:${COLORS.deviceCenterPct};margin:0;line-height:1;">
                            ${totalSpend > 0 ? ((values[0] / totalSpend) * 100).toFixed(1) + '%' : '0%'}
                        </p>
                        <p style="font-size:0.9rem;color:${COLORS.deviceCenterLabel};margin:0.3rem 0 0;padding:0 20%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${labels[0]?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || ""}
                        </p>
                    </div>
                </div>
            </div>
        </div>`;

    const listContainer = document.getElementById("device_list_left");

    labels.forEach((label, i) => {
        if (i > 4) return;
        const spend = deviceStats[label];
        let icon = 'fa-mobile-screen';
        if (label.includes('desktop')) icon = 'fa-desktop';
        if (label.includes('tablet') || label.includes('ipad')) icon = 'fa-tablet-screen-button';

        const item = document.createElement("div");
        item.style.cssText = `display:flex;flex-direction:column;padding:1rem 1.25rem;border-radius:12px;gap:0.5rem;box-shadow:0 2px 5px rgba(0,0,0,0.05);border:1px solid ${COLORS.deviceBorder};background:#fff;`;
        item.innerHTML = `
            <p style="display:flex;align-items:center;gap:0.8rem;font-weight:600;color:${COLORS.deviceLabel};font-size:1rem;">
                <i class="fa-solid ${icon}" style="color:${COLORS.devColors[i]};font-size:1.2rem;"></i>
                <span>${label.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
            </p>
            <p style="font-weight:700;font-size:1.4rem;color:${COLORS.deviceValue};padding-left:2rem;">${parseInt(spend).toLocaleString('vi-VN')}₫</p>`;
        listContainer.appendChild(item);
    });

    window.device_chart_instance = new Chart(document.getElementById("device_chart_canvas"), {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => i === 0 ? COLORS.doughnutPrimary : COLORS.doughnutOther),
                borderWidth: 2, borderColor: COLORS.doughnutBorder,
                hoverBackgroundColor: labels.map((_, i) => i === 0 ? COLORS.doughnutPrimaryHover : COLORS.doughnutOtherHover),
                hoverBorderColor: COLORS.doughnutBorder, hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 1, cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            layout: { padding: 10 },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// Run immediately when loaded
setupShowAllDetails();
