console.log("Google Ads Script Loaded v2.0 - PRO DASHBOARD");

let googleAdsRawData = [];
let googleAdsFilteredData = [];
let googleAdsPrevData = [];
let googleAdsMonthlyData = [];
let gTrendMode = 'daily'; // 'daily' or 'monthly'
let isGAdsFetching = false;
let isMonthlyFetching = false;
let lastGAdsRange = "";

// Expose d? main.js c� th? check cache khi switch tab
Object.defineProperty(window, 'googleAdsRawData', { get: () => googleAdsRawData, configurable: true });

// Chart instances
const G_CHARTS = {};

// Color palette matching Meta style
const G_COLORS = [
    '#ffa900', '#4285F4', '#34A853', '#EA4335', '#FF6D00',
    '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#795548'
];

const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwEmgc4Q5aT7ldo98I3gBKZ3mafx0ybHIWbqdMbk8LQMONzkwz3zVQShHXeJcBDfbPY/exec";

window.fetchGoogleAdsData = async function (force = false) {
    if (window.GOOGLE_ADS_SETUP === false) return;

    const domContainer = document.querySelector(".dom_container");
    const containerView = document.getElementById("google_ads_container");

    // CSS (.dom_container.google_ads #google_ads_container) handles visibility
    // DO NOT set inline style here � it persists when switching away from google_ads tab

    const currentRange = `${startDate}_${endDate}`;
    if (isGAdsFetching) return;

    // ? Cache guard: n?u data d� c� v� date range kh�ng d?i ? ch? render l?i
    if (!force && googleAdsRawData.length > 0 && lastGAdsRange === currentRange) {
        console.log("? Google Ads: Using cached data, skipping API call.");
        renderGoogleAdsView();
        return;
    }

    lastGAdsRange = currentRange;
    window._lastGAdsRange = currentRange; // Expose for tab-switch check in main.js
    isGAdsFetching = true;

    // Ch? show skeleton khi user dang ? tab Google Ads (kh�ng ph?i preload background)
    const isOnGadsTab = document.querySelector(".dom_container")?.classList.contains("google_ads");
    if (isOnGadsTab) _showGoogleSkeletons();

    try {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = e - s;
        const pEnd = new Date(s.getTime() - 86400000);
        const pStart = new Date(pEnd.getTime() - diff);
        const ps = pStart.toISOString().split('T')[0];

        // MEGA FETCH: Fetch everything from prev-start to current-end in ONE request
        // This avoids 2 cold starts of Apps Script, saving ~2-4 seconds.
        const url = new URL(GOOGLE_SHEET_API_URL);
        url.searchParams.append("time_range", JSON.stringify({ since: ps, until: endDate }));

        console.log("?? Google Ads API: Mega Fetching all data in one go...");
        const response = await fetch(url.toString());
        const compactData = response.ok ? await response.json() : { h: [], d: [] };

        // Transform COMPACT JSON back to array of objects
        const allData = _fromCompact(compactData);

        // Show last sync time
        if (compactData.syncedAt) {
            const el = document.getElementById('g_last_sync');
            if (el) el.textContent = compactData.syncedAt;
        }

        // Split data into Current and Previous arrays
        googleAdsRawData = allData.filter(item => item.date >= startDate && item.date <= endDate);
        googleAdsPrevData = allData.filter(item => item.date >= ps && item.date <= pEnd.toISOString().split('T')[0]);

        // Background fetch monthly data if needed
        if ((!googleAdsMonthlyData || googleAdsMonthlyData.length === 0) && !isMonthlyFetching) {
            fetchGoogleAdsMonthlyData();
        }

        console.log("? Google Ads: Mega Pipeline complete.", googleAdsRawData.length, "current /", googleAdsPrevData.length, "prev rows");

        // Ch? render UI n?u user dang ? tab google_ads
        const _isOnTab = document.querySelector(".dom_container")?.classList.contains("google_ads");
        if (_isOnTab) {
            renderGoogleAdsView();
        } else {
            console.log("? [Preload] Google Ads data cached. Will render when tab is opened.");
        }

    } catch (error) {
        console.error("? Google Ads pipeline error:", error);
        if (typeof showToast === 'function' && document.querySelector(".dom_container")?.classList.contains("google_ads")) {
            showToast("? L?i d?ng b? d? li?u Google Ads.");
        }
    } finally {
        isGAdsFetching = false;
        const _isOnTabFinal = document.querySelector(".dom_container")?.classList.contains("google_ads");
        if (_isOnTabFinal) _hideGoogleSkeletons();
    }
}

/** Utility: Convert compact JSON {h:[], d:[[]]} to [{...}] */
function _fromCompact(json) {
    if (!json || !json.h || !json.d) return [];
    const headers = json.h;
    return json.d.map(row => {
        let obj = {};
        for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = row[i];
        }
        return obj;
    });
}

function _showGoogleSkeletons() {
    document.querySelectorAll("#google_ads_container .dom_inner").forEach(card => {
        card.classList.add("is-loading");
        if (!card.querySelector(".skeleton-container")) {
            const sk = document.createElement("div");
            sk.className = "skeleton-container";
            const hasCanvas = card.querySelector("canvas");
            sk.innerHTML = hasCanvas
                ? `<div class="skeleton skeleton-title" style="margin-bottom:2rem"></div><div class="skeleton skeleton-chart"></div>`
                : `<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:70%"></div>`;
            card.prepend(sk);
        }
        Array.from(card.children).forEach(c => {
            if (!c.classList.contains("skeleton-container")) c.classList.add("hide-on-load");
        });
    });
}

function _hideGoogleSkeletons() {
    document.querySelectorAll("#google_ads_container .dom_inner").forEach(card => {
        card.classList.remove("is-loading");
        card.querySelectorAll(".skeleton-container").forEach(s => s.remove());
        card.querySelectorAll(".hide-on-load").forEach(el => el.classList.remove("hide-on-load"));
    });
}

// ---------------------------------------------
// MANUAL SYNC
// ---------------------------------------------/** Manual sync trigger */
async function triggerGAdsSync() {
    const btn = document.getElementById('g_sync_btn');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    _showGoogleSkeletons();
    try {
        const url = `${GOOGLE_SHEET_API_URL}?action=sync`;
        const resp = await fetch(url);
        const result = resp.ok ? await resp.json() : null;
        if (result && result.syncedAt) {
            const el = document.getElementById('g_last_sync');
            if (el) el.textContent = result.syncedAt;
        }
        await fetchGoogleAdsData(true);
        if (typeof showToast === 'function') showToast('? �?ng b? th�nh c�ng!');
    } catch (e) {
        console.error('Sync error:', e);
        if (typeof showToast === 'function') showToast('? Sync th?t b?i!');
    } finally {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    }
}

// ---------------------------------------------
// MAIN RENDER
// ---------------------------------------------
function renderGoogleAdsView() {
    // Guard: don't re-render while keyword modal is open (avoid chart flicker)
    if (window._kwModalOpen) return;
    // Ensure dates
    if (!window.startDate || !window.endDate) {
        const dr = (typeof getDateRange === 'function') ? getDateRange("last_7days") : { start: "", end: "" };
        window.startDate = window.startDate || dr.start;
        window.endDate = window.endDate || dr.end;
    }

    // Filter by date
    const filteredByDate = (googleAdsRawData || []).filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        const s = new Date(startDate + "T00:00:00");
        const e = new Date(endDate + "T23:59:59");
        return d >= s && d <= e;
    });

    // Filter by brand
    const brandLabel = (typeof CURRENT_CAMPAIGN_FILTER !== 'undefined') ? CURRENT_CAMPAIGN_FILTER : "";
    googleAdsFilteredData = (brandLabel && brandLabel.toUpperCase() !== "RESET" && brandLabel !== "Ampersand Group")
        ? filteredByDate.filter(item => item.campaign && item.campaign.toLowerCase().includes(brandLabel.toLowerCase()))
        : filteredByDate;

    console.log(`?? Google Ads filtered: ${googleAdsFilteredData.length} rows (${startDate} ? ${endDate})`);

    // Reset to Daily if filter is active and we're currently in Monthly
    const hasActiveFilter = brandLabel && brandLabel.toUpperCase() !== "RESET" && brandLabel !== "Ampersand Group";
    if (hasActiveFilter && gTrendMode === 'monthly') {
        gTrendMode = 'daily';
        const dailyBtn = document.getElementById("g_daily_btn");
        const monthlyBtn = document.getElementById("g_monthly_btn");
        if (dailyBtn) dailyBtn.classList.add("active");
        if (monthlyBtn) monthlyBtn.classList.remove("active");
        document.getElementById("g_trend_title").textContent = 'Daily Spent';
    }

    // Calculate totals & derived metrics
    let totSpent = 0, totImp = 0, totClick = 0, totConv = 0, totStore = 0;
    let totDir = 0, totCalls = 0, totMenu = 0, totOrders = 0, totOther = 0;
    // device totals � all lowercase keys
    let devMob = { imp: 0, click: 0, conv: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0, spent: 0 };
    let devDesk = { imp: 0, click: 0, conv: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0, spent: 0 };
    let devTab = { imp: 0, click: 0, conv: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0, spent: 0 };

    googleAdsFilteredData.forEach(item => {
        totSpent += parseFloat(item.spent || 0);
        totImp += parseFloat(item.impression || 0);
        totClick += parseFloat(item.click || 0);
        totConv += parseFloat(item.all_conversions || 0);
        totStore += parseFloat(item.store_visits || 0);
        totDir += parseFloat(item.directions || 0);
        totCalls += parseFloat(item.calls || 0);
        totMenu += parseFloat(item.menu || 0);
        totOrders += parseFloat(item.orders || 0);
        totOther += parseFloat(item.other || 0);

        // Parse device JSON � keys: "Impression", "Click", "All Conversions", "Store Visits", "Directions", "Calls", "Menu", "Orders"
        const mob = _parseDeviceJson(item.mobile);
        const desk = _parseDeviceJson(item.desktop);
        const tab = _parseDeviceJson(item.tablet);
        const _add = (obj, src) => {
            obj.imp += src.Impression || 0;
            obj.click += src.Click || 0;
            obj.conv += src['All Conversions'] || 0;
            obj.visits += src['Store Visits'] || 0;
            obj.dir += src['Directions'] || 0;
            obj.calls += src['Calls'] || 0;
            obj.menu += src['Menu'] || 0;
            obj.orders += src['Orders'] || 0;
            obj.spent += src['Spent'] || src['spent'] || 0;
        };
        _add(devMob, mob); _add(devDesk, desk); _add(devTab, tab);
    });

    const avgCtr = totImp > 0 ? (totClick / totImp * 100) : 0;
    const avgCpc = totClick > 0 ? (totSpent / totClick) : 0;
    const avgCpa = totConv > 0 ? (totSpent / totConv) : 0;
    const avgCvr = totClick > 0 ? (totConv / totClick * 100) : 0;

    // Fetch monthly in parallel if not already loaded
    if ((!googleAdsMonthlyData || googleAdsMonthlyData.length === 0) && !isMonthlyFetching) {
        fetchGoogleAdsMonthlyData();
    }

    // -- Pre-filter Previous Data by Brand
    const prevFilteredByDate = googleAdsPrevData || [];
    const prevFiltered = (brandLabel && brandLabel.toUpperCase() !== "RESET" && brandLabel !== "Ampersand Group")
        ? prevFilteredByDate.filter(item => item.campaign && item.campaign.toLowerCase().includes(brandLabel.toLowerCase()))
        : prevFilteredByDate;

    const prevTotals = { spent: 0, imp: 0, click: 0, conv: 0, store: 0 };
    prevFiltered.forEach(item => {
        prevTotals.spent += parseFloat(item.spent || 0);
        prevTotals.imp += parseFloat(item.impression || 0);
        prevTotals.click += parseFloat(item.click || 0);
        prevTotals.conv += parseFloat(item.all_conversions || 0);
        prevTotals.store += parseFloat(item.store_visits || 0);
    });

    const metricsMap = [
        { id: "g_spent", cur: totSpent, prev: prevTotals.spent, fmt: _fmtMoney },
        { id: "g_impression", cur: totImp, prev: prevTotals.imp, fmt: _fmtNum },
        { id: "g_click", cur: totClick, prev: prevTotals.click, fmt: _fmtNum },
        { id: "g_conv", cur: totConv, prev: prevTotals.conv, fmt: _fmtNum },
        { id: "g_store", cur: totStore, prev: prevTotals.store, fmt: _fmtNum }
    ];

    // Determine previous date range string for tooltip
    let prevRangeStr = "";
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = e - s;
        const pEnd = new Date(s.getTime() - 86400000);
        const pStart = new Date(pEnd.getTime() - diff);
        const ps = pStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const pe = pEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        prevRangeStr = `${ps} - ${pe}`;
    }

    metricsMap.forEach(m => {
        let diffPct = null;
        if (m.prev > 0) {
            diffPct = ((m.cur - m.prev) / m.prev * 100).toFixed(1);
        } else if (m.cur > 0) {
            diffPct = "100";
        } else if (m.cur === 0 && m.prev === 0) {
            diffPct = "0";
        }
        _setHtml(m.id, m.fmt(m.cur), diffPct, prevRangeStr, m.fmt(m.prev));
    });

    // -- KPI mini cards
    const kpiEl = document.getElementById("g_kpi_cards");
    if (kpiEl) {
        kpiEl.innerHTML = `
            <p style="font-size:1.35rem;font-weight:700;color:var(--textClr);margin:1.5rem 0 1rem;">Performance</p>
            <div class="g_interaction_grid">
                <div class="g_ia_card"><span>Avg CTR</span><strong>${avgCtr.toFixed(2)}%</strong></div>
                <div class="g_ia_card"><span>Avg CPC</span><strong>${_fmtShort(avgCpc)}</strong></div>
                <div class="g_ia_card"><span>Avg CPA</span><strong>${_fmtShort(avgCpa)}</strong></div>
                <div class="g_ia_card"><span>CVR</span><strong>${avgCvr.toFixed(2)}%</strong></div>
            </div>`;
    }

    // -- Funnel derived metric labels
    _setHtml("g_cpc", _fmtMoney(avgCpc));
    _setHtml("g_cpa", _fmtMoney(avgCpa));
    _setHtml("g_cvr", avgCvr.toFixed(2) + "%");
    _setHtml("g_ctr", avgCtr.toFixed(2) + "%");

    // -- All charts
    const trendSel = _getGSelectVal("g_trend_select") || "spent";
    const barSel = _getGSelectVal("g_bar_select") || "spent";

    if (gTrendMode === 'monthly') {
        _renderMonthlyChart(googleAdsMonthlyData, trendSel);
    } else {
        _renderTrendChart(googleAdsFilteredData, trendSel);
    }

    // -- Pre-calculate grouped data once for all charts
    const groupedCampData = _groupByCampaign(googleAdsFilteredData);
    const sortedCampsBySpent = Object.values(groupedCampData).sort((a, b) => b.spent - a.spent);

    _renderBarChart(googleAdsFilteredData, barSel);
    _renderDonutChart(googleAdsFilteredData);
    _renderFunnelChart(totImp, totClick, totConv, totStore, totDir);
    _renderCPVisitChart(googleAdsFilteredData, groupedCampData);
    _renderDualAxisChart(googleAdsFilteredData);

    // -- Reset Campaign Insight filter khi brand/date thay d?i
    _gHourlyCamp = '__all__';
    _gHourlyMetric = _gHourlyMetric || 'click';
    // Reset dropdown label UI
    const _insightCampLbl = document.querySelector('#g_insight_camp_select .dom_selected');
    if (_insightCampLbl) _insightCampLbl.textContent = 'All Campaigns';
    // Reset active state in list
    document.querySelectorAll('#g_hourly_camp_list li').forEach(li => {
        li.classList.toggle('active', li.dataset.view === '__all__');
        const rb = li.querySelector('.radio_box');
        if (rb) rb.classList.toggle('active', li.dataset.view === '__all__');
    });

    _renderHourlyChart(googleAdsFilteredData, '__all__', _gHourlyMetric);
    _renderDeviceChart(devMob, devDesk, devTab);
    _renderTopCampaignCards(googleAdsFilteredData, sortedCampsBySpent);
    _renderCampaignTable(googleAdsFilteredData, "", groupedCampData);

    // -- NEW: Channel / Location / Distance charts
    _renderChannelChart(googleAdsFilteredData);
    _renderLocationChart(googleAdsFilteredData);
    _renderDistanceChart(googleAdsFilteredData);


    // -- Funnel stats: Menu / Calls / Orders / Other
    const _setStatEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = _fmtNum(v); };
    _setStatEl('g_stat_menu', totMenu);
    _setStatEl('g_stat_calls', totCalls);
    _setStatEl('g_stat_orders', totOrders);
    _setStatEl('g_stat_other', totOther);

    // -- Populate campaign dropdown for hourly chart (after brand filter)
    _populateHourlyCampDropdown(googleAdsFilteredData);

    // -- Filter listener
    const filterInput = document.getElementById("g_campaign_filter");
    if (filterInput && !filterInput._gBound) {
        filterInput._gBound = true;
        filterInput.addEventListener("input", () => _renderCampaignTable(googleAdsFilteredData, filterInput.value));
    }

    // -- Wire up custom dropdowns (only once)
    _initGoogleDropdowns();
}

// ---------------------------------------------
// DROPDOWN INIT � wire up Meta-style dom_select
// ---------------------------------------------
function _initGoogleDropdowns() {
    [
        {
            id: 'g_trend_select', onSelect: v => {
                if (gTrendMode === 'monthly') _renderMonthlyChart(googleAdsMonthlyData, v);
                else _renderTrendChart(googleAdsFilteredData, v);
            }
        },
        { id: 'g_bar_select', onSelect: v => _renderBarChart(googleAdsFilteredData, v) },
        {
            id: 'g_insight_metric_select', onSelect: v => {
                _gHourlyMetric = v;
                _renderHourlyChart(googleAdsFilteredData, _gHourlyCamp, v);
                _buildDeviceChart(v);
                // Sync 3 breakdown charts
                _gDevFilter = v;
                const brkData = _gHourlyCamp === '__all__' ? googleAdsFilteredData : googleAdsFilteredData.filter(d => d.campaign === _gHourlyCamp);
                _buildChannelChart(_dimData.channel, v);
                _buildLocationChart(_dimData.location, v);
                _buildDistanceChart(_dimData.distance, v);
            }
        },
        {
            id: 'g_insight_camp_select', onSelect: v => {
                _gHourlyCamp = v;
                _renderHourlyChart(googleAdsFilteredData, v, _gHourlyMetric);
                // Re-aggregate device data for selected campaign
                const { mob, desk, tab } = _aggregateDeviceData(googleAdsFilteredData, v);
                _renderDeviceChart(mob, desk, tab);
                // Sync 3 breakdown charts � filter by campaign if specific one selected
                const filteredForBreakdown = v === '__all__'
                    ? googleAdsFilteredData
                    : googleAdsFilteredData.filter(d => d.campaign === v);
                _renderChannelChart(filteredForBreakdown);
                _renderLocationChart(filteredForBreakdown);
                _renderDistanceChart(filteredForBreakdown);
            }
        },
    ].forEach(({ id, onSelect }) => {
        const wrap = document.getElementById(id);
        if (!wrap || wrap._gDropInit) return;
        wrap._gDropInit = true;

        // Toggle open/close
        wrap.addEventListener('click', e => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll('.dom_select.daily_total.active').forEach(el => {
                if (el !== wrap) {
                    el.classList.remove('active');
                    el.querySelector('.dom_select_show')?.classList.remove('active');
                }
            });
            wrap.classList.toggle('active');
            wrap.querySelector('.dom_select_show')?.classList.toggle('active');
        });

        // Item click � use delegation on the ul so dynamically added items work
        const listEl = wrap.querySelector('.dom_select_show');
        if (listEl) {
            listEl.addEventListener('click', e => {
                e.stopPropagation();
                const li = e.target.closest('li');
                if (!li) return;
                // Update radio state
                listEl.querySelectorAll('li').forEach(x => {
                    x.classList.remove('active');
                    x.querySelector('.radio_box')?.classList.remove('active');
                });
                li.classList.add('active');
                li.querySelector('.radio_box')?.classList.add('active');
                // Update label
                const lbl = wrap.querySelector('.dom_selected');
                if (lbl) lbl.textContent = li.querySelector('span:last-child')?.textContent || '';
                // Close
                wrap.classList.remove('active');
                listEl.classList.remove('active');
                // Trigger
                onSelect(li.dataset.view || li.dataset.metric);
            });
        }
    });

    // Close dropdowns on outside click
    if (!window._gDropOutsideBound) {
        window._gDropOutsideBound = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('#google_ads_container .dom_select.active').forEach(el => {
                el.classList.remove('active');
                el.querySelector('.dom_select_show')?.classList.remove('active');
            });
        });
    }
}

// Helper: get current chosen value from a dom_select
function _getGSelectVal(selectId) {
    const wrap = document.getElementById(selectId);
    if (!wrap) return null;
    return wrap.querySelector('.dom_select_show li.active')?.dataset.view || null;
}

// ---------------------------------------------
// 1. TREND CHART (Daily) � matches Meta line chart style exactly
// ---------------------------------------------
function _renderTrendChart(data, metric) {
    const ctx = document.getElementById("g_trend_chart")?.getContext("2d");
    if (!ctx) return;
    if (G_CHARTS.trend) G_CHARTS.trend.destroy();

    const metricLabels = {
        spent: "Spent (d)", click: "Click", total_conversions: "Conversions",
        impression: "Impression", store_visits: "Store Visit",
        all_conversions: "All Conversions",
        directions: "Directions", calls: "Calls", menu: "Menu", orders: "Orders"
    };

    // Aggregate by date
    const daily = {};
    data.forEach(item => {
        const d = (item.date || "").split("T")[0];
        if (!d) return;
        daily[d] = (daily[d] || 0) + parseFloat(item[metric] || 0);
    });

    const labels = Object.keys(daily).sort();
    const values = labels.map(l => daily[l]);
    const isMoney = metric === "spent";

    // Smart label indices (same as Meta's calculateIndicesToShow)
    function _indicesToShow(arr, max) {
        const len = arr.length;
        if (len <= 2) return new Set();
        const maxVal = Math.max(...arr);
        const maxIdx = arr.indexOf(maxVal);
        const midIdx = Array.from({ length: len - 2 }, (_, i) => i + 1);
        if (midIdx.length === 0) return new Set();
        const step = Math.max(1, Math.floor(midIdx.length / max));
        const picked = new Set();
        midIdx.filter((_, i) => i % step === 0).slice(0, max).forEach(i => picked.add(i));
        if (maxIdx > 0 && maxIdx < len - 1) picked.add(maxIdx);
        return picked;
    }
    const displayIndices = _indicesToShow(values, 5);

    // Gradient fill � Meta style: rgba(255,169,0,0.2) ? rgba(255,169,0,0.05)
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(255,169,0,0.2)");
    gradient.addColorStop(1, "rgba(255,169,0,0.05)");

    G_CHARTS.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => { const p = l.split('-'); return `${p[2]}/${p[1]}`; }),
            datasets: [{
                label: metricLabels[metric] || metric,
                data: values,
                borderColor: '#ffab00',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#ffab00',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            layout: { padding: { top: 26, left: 8, right: 12 } },
            plugins: {
                legend: { display: false },
                datalabels: {
                    displayIndices,
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    font: { size: 11, weight: '600' },
                    color: '#666',
                    formatter: (v, ctx) => {
                        if (v <= 0) return '';
                        const opts = ctx.chart.options.plugins.datalabels;
                        if (!opts.displayIndices.has(ctx.dataIndex)) return '';
                        return isMoney ? _fmtShort(v) : _fmtNum(v);
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleColor: '#333',
                    bodyColor: '#555',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: c => `  ${isMoney ? _fmtMoney(c.raw) : _fmtNum(c.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true },
                    border: { color: 'rgba(0,0,0,0.15)' },
                    ticks: { display: false },
                    suggestedMax: Math.max(...values, 1) * 1.15
                },
                x: {
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true },
                    border: { color: 'rgba(0,0,0,0.15)' },
                    ticks: {
                        color: '#444',
                        font: { size: 11 },
                        maxRotation: 0,
                        minRotation: 0
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

window.updateGoogleTrendChart = function () {
    const sel = document.getElementById("g_trend_metric");
    _renderTrendChart(googleAdsFilteredData, sel?.value || "spent");
};

// ---------------------------------------------
// 2. BAR CHART (Metric by Campaign)
// ---------------------------------------------
/** R�t g?n t�n campaign: gi? brand + lo?i k�nh */
function _shortCampName(name) {
    if (!name) return '';
    // B? suffix d�i sau brand: l?y 2 ph?n d?u tru?c _Google
    // VD: "TRB_Google_Search_KW" ? "TRB_Search"
    //     "BeAn_Google_Display_EN" ? "BeAn_Display"
    const parts = name.split('_');
    // T�m index c?a "Google"
    const gIdx = parts.findIndex(p => p.toLowerCase() === 'google');
    if (gIdx > 0) {
        const brand = parts.slice(0, gIdx).join('_');   // "TRB"
        const rest = parts[gIdx + 1] ? parts[gIdx + 1] : '';  // "Search"
        return rest ? `${brand}_${rest}` : brand;
    }
    // fallback: truncate
    return name.length > 14 ? name.slice(0, 13) + '�' : name;
}

function _renderBarChart(data, metric) {
    const ctx = document.getElementById("g_bar_chart")?.getContext("2d");
    if (!ctx) return;
    if (G_CHARTS.bar) G_CHARTS.bar.destroy();

    const campaigns = _groupByCampaign(data);
    const sorted = Object.values(campaigns).sort((a, b) => b.spent - a.spent).slice(0, 8);
    if (!sorted.length) return;

    const isMoney = ["spent", "cpc", "cpa"].includes(metric);
    const isPercent = metric === "ctr";

    const values = sorted.map(c => {
        if (metric === "cpv") return c.store > 0 ? +(c.spent / c.store).toFixed(0) : 0;
        if (metric === "ctr") return c.imp > 0 ? +(c.click / c.imp * 100).toFixed(2) : 0;
        if (metric === "cpc") return c.click > 0 ? +(c.spent / c.click).toFixed(0) : 0;
        if (metric === "cpa") return c.conv > 0 ? +(c.spent / c.conv).toFixed(0) : 0;
        if (metric === "total_conversions") return +(c.conv || 0);   // fix: grouped key is "conv"
        if (metric === "store_visits") return +(c.store || 0);   // fix: grouped key is "store"
        if (metric === "spent") return +(c.spent || 0);
        if (metric === "click") return +(c.click || 0);
        return +(c[metric] || 0);
    });

    // -- C�ng gradient style v?i Meta (Top bar = v�ng, c�n l?i = x�m)
    const maxVal = Math.max(...values, 1);
    const maxIdx = values.indexOf(maxVal);

    const gradGold = ctx.createLinearGradient(0, 0, 0, 300);
    gradGold.addColorStop(0, 'rgba(255,169,0,1)');
    gradGold.addColorStop(1, 'rgba(255,169,0,0.4)');

    const gradGray = ctx.createLinearGradient(0, 0, 0, 300);
    gradGray.addColorStop(0, 'rgba(210,210,210,0.9)');
    gradGray.addColorStop(1, 'rgba(160,160,160,0.4)');

    const bgColors = values.map((_, i) => i === maxIdx ? gradGold : gradGray);

    const isFew = sorted.length < 3;

    G_CHARTS.bar = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sorted.map(c => _shortCampName(c.name)),
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderRadius: 8,
                borderWidth: 0,
                ...(isFew && { barPercentage: 0.35, categoryPercentage: 0.65 })
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            layout: { padding: { left: 10, right: 10 } },
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end', align: 'end', offset: 2,
                    font: { size: 10, weight: '700' }, color: '#444',
                    formatter: v => {
                        if (!v) return '';
                        if (metric === "cpv") return _fmtShort(v);
                        if (isMoney) return _fmtShort(v);
                        if (isPercent) return v.toFixed(2) + '%';
                        return _fmtNum(v);
                    }
                },
                tooltip: {
                    callbacks: {
                        title: ctx2 => sorted[ctx2[0].dataIndex]?.name || ctx2[0].label,
                        label: c => {
                            if (isMoney) return _fmtMoney(c.raw);
                            if (isPercent) return c.raw.toFixed(2) + '%';
                            return _fmtNum(c.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#666', font: { weight: '600', size: 9 }, maxRotation: 0, minRotation: 0, autoSkip: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { display: false },
                    suggestedMax: maxVal * 1.25
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

window.updateGoogleBarChart = function () {
    const sel = document.getElementById("g_bar_metric");
    _renderBarChart(googleAdsFilteredData, sel?.value || "spent");
};

// ---------------------------------------------
// 3. DONUT CHART (Spent by Campaign)
// ---------------------------------------------
function _renderDonutChart(data) {
    const ctx = document.getElementById("g_donut_chart")?.getContext("2d");
    if (!ctx) return;
    if (G_CHARTS.donut) G_CHARTS.donut.destroy();

    const campaigns = _groupByCampaign(data);
    const sorted = Object.values(campaigns).sort((a, b) => b.spent - a.spent).slice(0, 8);
    const total = sorted.reduce((s, c) => s + c.spent, 0);

    // M�u gi?ng Meta: v�ng ch? d?o, sau d� navy, x�m
    const DONUT_COLORS = ['rgba(255,169,0,1)', 'rgba(0,30,165,0.9)', 'rgba(155,155,155,0.7)',
        '#34A853', '#EA4335', '#FF6D00', '#9C27B0', '#00BCD4'];

    // Plugin v? % ? gi?a gi?ng Meta
    const centerPlugin = {
        id: 'centerText',
        afterDraw(chart) {
            const { ctx: c, chartArea: { left, top, right, bottom } } = chart;
            const cx = (left + right) / 2, cy = (top + bottom) / 2;
            const pct = total > 0 ? ((sorted[0]?.spent || 0) / total * 100).toFixed(1) : '0';
            c.save();
            c.font = 'bold 2rem Roboto, sans-serif';
            c.fillStyle = '#1e293b';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(pct + '%', cx, cy - 8);
            c.font = '1.1rem Roboto, sans-serif';
            c.fillStyle = '#888';
            c.fillText(_truncate(sorted[0]?.name || '', 14), cx, cy + 12);
            c.restore();
        }
    };

    G_CHARTS.donut = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: sorted.map(c => _truncate(c.name, 10)),
            datasets: [{
                data: sorted.map(c => c.spent),
                backgroundColor: DONUT_COLORS.slice(0, sorted.length),
                borderWidth: 3, borderColor: '#fff', hoverOffset: 10
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 1, cutout: '70%',
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => `${_truncate(c.label, 18)}: ${_fmtShort(c.raw)} (${total > 0 ? (c.raw / total * 100).toFixed(1) : 0}%)`
                    }
                }
            }
        },
        plugins: [centerPlugin]
    });

    // Legend list
    const legendEl = document.getElementById("g_donut_legend");
    if (legendEl) {
        legendEl.style.cssText = '';
        legendEl.innerHTML = sorted.map((c, i) => `
            <div class="g_donut_legend_item">
                <span class="g_donut_dot" style="background:${DONUT_COLORS[i]}"></span>
                <span class="g_donut_name" title="${c.name}">${c.name}</span>
                <strong class="g_donut_pct">${total > 0 ? (c.spent / total * 100).toFixed(1) : 0}%</strong>
            </div>`).join("");
    }
}

// ---------------------------------------------
// 4. FUNNEL CHART
// ---------------------------------------------
function _renderFunnelChart(imp, click, conv, store, dir) {
    const container = document.getElementById("g_funnel_wrap");
    if (!container) return;

    // Click vs Conversion � ai l?n hon d?ng tru?c
    const clickFirst = click >= conv;
    const topPair = clickFirst
        ? [
            { label: "Click", value: click, icon: "fa-arrow-pointer", color: "#ffa900" },
            { label: "Conversion", value: conv, icon: "fa-bullseye", color: "#34A853" },
        ]
        : [
            { label: "Conversion", value: conv, icon: "fa-bullseye", color: "#34A853" },
            { label: "Click", value: click, icon: "fa-arrow-pointer", color: "#ffa900" },
        ];

    const steps = [
        ...topPair,
        { label: "Directions", value: dir, icon: "fa-map-location-dot", color: "#4285F4" },
        { label: "Store Visit", value: store, icon: "fa-store", color: "#EA4335" },
    ];

    const max = Math.max(...steps.map(s => s.value), 1);

    container.innerHTML = steps.map((step, i) => {
        const pct = Math.max((step.value / max * 100), 4);
        const dropPct = i > 0 && steps[i - 1].value > 0
            ? ((1 - step.value / steps[i - 1].value) * 100).toFixed(1)
            : null;

        return `
            <div style="margin-bottom:1.4rem;">
                ${dropPct !== null ? `<div style="text-align:center;font-size:1.1rem;color:#94a3b8;margin-bottom:0.4rem;">? Drop ${dropPct}%</div>` : ''}
                <div style="display:flex;align-items:center;gap:1.2rem;">
                    <div style="width:${pct}%;background:${step.color};border-radius:6px;height:3.6rem;display:flex;align-items:center;padding:0 1.2rem;transition:width .5s;min-width:3rem;">
                        <i class="fa-solid ${step.icon}" style="color:#fff;font-size:1.3rem;"></i>
                    </div>
                    <div>
                        <div style="font-size:1.1rem;color:#64748b;">${step.label}</div>
                        <div style="font-size:1.6rem;font-weight:700;color:#1e293b;">${_fmtNum(step.value)}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function _renderCPVisitChart(data, precalculatedGroup = null) {
    const container = document.getElementById("g_cpvisit_wrap");
    if (!container) return;

    const campaigns = precalculatedGroup || _groupByCampaign(data);
    const sorted = Object.values(campaigns)
        .filter(c => c.store > 0)
        .map(c => ({
            name: c.name,
            cpv: c.spent / c.store
        }))
        .sort((a, b) => a.cpv - b.cpv);

    if (!sorted.length) {
        container.innerHTML = `<p style="text-align:center;color:#999;padding-top:2rem;">Kh�ng c� d? li?u Store Visit</p>`;
        return;
    }

    const maxCPV = Math.max(...sorted.map(c => c.cpv), 1);

    container.innerHTML = sorted.map((c, i) => {
        const pct = Math.max((c.cpv / maxCPV * 100), 5);
        return `
            <div style="margin-bottom:2rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:0.8rem;">
                    <span style="font-size:1.2rem; color:#475569; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80%;" title="${c.name}">
                        ${c.name}
                    </span>
                    <span style="font-size:1.6rem; font-weight:800; color:#1e293b;">${_fmtShort(c.cpv)}</span>
                </div>
                <div style="width:100%; background:#f1f5f9; height:3.4rem; border-radius:6px; overflow:hidden; position:relative; display:flex; align-items:center;">
                    <div style="width:${pct}%; background:linear-gradient(90deg, #ffa900 0%, #ffcc33 100%); height:100%; border-radius:6px; transition:width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); display:flex; align-items:center; padding-left:1.2rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                        <i class="fa-solid fa-store" style="color:#fff; font-size:1.5rem;"></i>
                    </div>
                </div>
            </div>`;
    }).join("");
}

// ---------------------------------------------
// MONTHLY SWITCHER LOGIC
// ---------------------------------------------
window.setGoogleTrendMode = async function (mode) {
    if (gTrendMode === mode) return;

    const dailyBtn = document.getElementById("g_daily_btn");
    const monthlyBtn = document.getElementById("g_monthly_btn");
    const chartWrap = document.querySelector("#google_ads_container .trendline .g_chart_wrap");

    if (mode === 'monthly' && googleAdsMonthlyData.length === 0) {
        // Show local skeleton ONLY for chart area if not yet loaded
        if (chartWrap) {
            chartWrap.classList.add("is-loading");
            chartWrap.innerHTML = `
                <div class="skeleton-container" style="padding:2.5rem; height:100%; display:flex; flex-direction:column; gap:1.5rem;">
                    <div class="skeleton" style="height:2rem; width:40%; border-radius:6px;"></div>
                    <div class="skeleton" style="flex:1; width:100%; border-radius:12px;"></div>
                </div>
            `;
        }

        // If not already fetching, start it. If it is, this just waits.
        if (!isMonthlyFetching) fetchGoogleAdsMonthlyData();

        // Poll for data every 500ms until available or timeout
        let attempts = 0;
        const checkData = setInterval(() => {
            attempts++;
            if (googleAdsMonthlyData.length > 0 || attempts > 20) {
                clearInterval(checkData);
                finishSwitch();
            }
        }, 500);
        return;
    }

    function finishSwitch() {
        gTrendMode = mode;
        if (dailyBtn) dailyBtn.classList.toggle("active", mode === 'daily');
        if (monthlyBtn) monthlyBtn.classList.toggle("active", mode === 'monthly');
        document.getElementById("g_trend_title").textContent = mode === 'daily' ? 'Daily Spent' : 'Monthly Spent';

        if (chartWrap) {
            chartWrap.classList.remove("is-loading");
            chartWrap.innerHTML = `<canvas id="g_trend_chart"></canvas>`;
        }

        if (mode === 'monthly') {
            _renderMonthlyChart(googleAdsMonthlyData, _getGSelectVal("g_trend_select") || "spent");
        } else {
            _renderTrendChart(googleAdsFilteredData, _getGSelectVal("g_trend_select") || "spent");
        }
    }

    finishSwitch();
}

async function fetchGoogleAdsMonthlyData() {
    if (isMonthlyFetching) return;
    isMonthlyFetching = true;

    const now = new Date();
    const startOfYear = now.getUTCFullYear() + "-01-01";
    const todayStr = now.toISOString().split('T')[0];

    try {
        const url = new URL(GOOGLE_SHEET_API_URL);
        url.searchParams.append("time_range", JSON.stringify({ since: startOfYear, until: todayStr }));
        console.log("?? Google Ads: Fetching Monthly Data in background...");
        const response = await fetch(url.toString());
        if (response.ok) {
            const compactData = await response.json();
            googleAdsMonthlyData = _fromCompact(compactData);
            console.log("? Google Ads: Monthly Data cached.", googleAdsMonthlyData.length, "rows");

            // Only re-render if user is currently looking at the monthly chart
            if (gTrendMode === 'monthly') {
                const trendSel = _getGSelectVal("g_trend_select") || "spent";
                _renderMonthlyChart(googleAdsMonthlyData, trendSel);
            }
        }
    } catch (e) {
        console.error("? Monthly fetch failed:", e);
    } finally {
        isMonthlyFetching = false;
        // Optimization: remove any specific monthly skeletons if any
        const chartWrap = document.querySelector("#google_ads_container .trendline .g_chart_wrap");
        if (chartWrap) chartWrap.classList.remove("is-loading");
    }
}

function _renderMonthlyChart(data, metric) {
    const ctx = document.getElementById("g_trend_chart")?.getContext("2d");
    if (!ctx) return;
    if (G_CHARTS.trend) G_CHARTS.trend.destroy();

    // Aggregate by month (0-11)
    const monthlySum = new Array(12).fill(0);
    const monthsFound = new Set();

    // Filter monthly data by brand if active
    const brandLabel = (typeof CURRENT_CAMPAIGN_FILTER !== 'undefined') ? CURRENT_CAMPAIGN_FILTER : "";
    const sourceData = Array.isArray(data) ? data : [];
    const filtered = (brandLabel && brandLabel.toUpperCase() !== "RESET" && brandLabel !== "Ampersand Group")
        ? sourceData.filter(item => item.campaign && item.campaign.toLowerCase().includes(brandLabel.toLowerCase()))
        : sourceData;

    filtered.forEach(item => {
        const d = new Date(item.date);
        if (isNaN(d.getTime())) return;
        const m = d.getMonth();
        monthlySum[m] += parseFloat(item[metric] || 0);
        monthsFound.add(m);
    });

    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const values = monthlySum;
    const isMoney = metric === "spent";

    const maxVal = Math.max(...values, 1);
    const maxIdx = values.indexOf(maxVal);

    const gradGold = ctx.createLinearGradient(0, 0, 0, 300);
    gradGold.addColorStop(0, 'rgba(255,169,0,1)');
    gradGold.addColorStop(1, 'rgba(255,169,0,0.4)');

    const gradGray = ctx.createLinearGradient(0, 0, 0, 300);
    gradGray.addColorStop(0, 'rgba(210,210,210,0.9)');
    gradGray.addColorStop(1, 'rgba(160,160,160,0.4)');

    const bgColors = values.map((v, i) => (v === maxVal && v > 0) ? gradGold : gradGray);

    G_CHARTS.trend = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end', align: 'end', offset: -2,
                    font: { size: 9, weight: '700' }, color: '#888',
                    formatter: v => v > 0 ? (isMoney ? _fmtShort(v) : _fmtNum(v)) : ''
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#888', font: { size: 8, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { display: false },
                    suggestedMax: maxVal * 1.2
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// ---------------------------------------------
// 6. DUAL AXIS CHART (CTR & Conversion by Day)
// ---------------------------------------------
function _renderDualAxisChart(data) {
    const ctx = document.getElementById("g_dual_chart")?.getContext("2d");
    if (!ctx) return;
    if (G_CHARTS.dual) G_CHARTS.dual.destroy();

    const daily = {};
    data.forEach(item => {
        const d = (item.date || "").split("T")[0];
        if (!d) return;
        if (!daily[d]) daily[d] = { imp: 0, click: 0, conv: 0 };
        daily[d].imp += parseFloat(item.impression || 0);
        daily[d].click += parseFloat(item.click || 0);
        daily[d].conv += parseFloat(item.all_conversions || 0);
    });

    const labels = Object.keys(daily).sort();
    const ctrData = labels.map(l => daily[l].imp > 0 ? +(daily[l].click / daily[l].imp * 100).toFixed(3) : 0);
    const convData = labels.map(l => daily[l].conv);

    // Gradient CTR = v�ng, Conv = navy (gi?ng Meta)
    const ctxEl = ctx.canvas;
    const gradCtr = ctxEl.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradCtr.addColorStop(0, 'rgba(255,169,0,0.25)');
    gradCtr.addColorStop(1, 'rgba(255,169,0,0.0)');

    const gradConv = ctxEl.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradConv.addColorStop(0, 'rgba(0,30,165,0.2)');
    gradConv.addColorStop(1, 'rgba(0,30,165,0.0)');

    G_CHARTS.dual = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels.map(l => { const p = l.split('-'); return `${p[2]}/${p[1]}`; }),
            datasets: [
                {
                    label: "CTR (%)",
                    data: ctrData,
                    borderColor: '#ffa900',
                    backgroundColor: gradCtr,
                    yAxisID: "y",
                    fill: true, tension: 0.4,
                    pointRadius: 4, pointBackgroundColor: '#ffa900',
                    pointBorderColor: '#fff', pointBorderWidth: 1.5,
                    borderWidth: 2.5
                },
                {
                    label: "Conversions",
                    data: convData,
                    borderColor: 'rgba(0,30,165,0.9)',
                    backgroundColor: gradConv,
                    yAxisID: "y2",
                    fill: true, tension: 0.4,
                    pointRadius: 4, pointBackgroundColor: 'rgba(0,30,165,0.9)',
                    pointBorderColor: '#fff', pointBorderWidth: 1.5,
                    borderWidth: 2.5
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
            plugins: {
                datalabels: { display: false },
                legend: { position: "top", labels: { font: { size: 11, weight: '600' }, usePointStyle: true, pointStyleWidth: 10 } },
                tooltip: { mode: "index", intersect: false }
            },
            scales: {
                y: {
                    type: "linear", position: "left",
                    ticks: { callback: v => v.toFixed(2) + "%", color: '#ffa900', font: { size: 9 } },
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }
                },
                y2: {
                    type: "linear", position: "right",
                    ticks: { color: 'rgba(0,30,165,0.8)', font: { size: 9 } },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#666', font: { size: 9 }, maxRotation: 0, minRotation: 0 }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// ---------------------------------------------
// 7. TOP / WORST CAMPAIGN INSIGHTS CARDS
// ---------------------------------------------
function _renderTopCampaignCards(data, precalculatedList = null) {
    const el = document.getElementById("g_top_campaigns");
    if (!el) return;

    const list = precalculatedList || Object.values(_groupByCampaign(data));

    if (list.length === 0) {
        el.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:2rem;font-size:1.3rem;">Kh�ng c� d? li?u</div>`;
        return;
    }

    const byConv = [...list].sort((a, b) => b.conv - a.conv).slice(0, 3);
    const byCpa = list.filter(c => c.conv > 0).map(c => ({ ...c, cpa: c.spent / c.conv })).sort((a, b) => a.cpa - b.cpa).slice(0, 3);
    const worstCpa = list.filter(c => c.conv > 0).map(c => ({ ...c, cpa: c.spent / c.conv })).sort((a, b) => b.cpa - a.cpa).slice(0, 2);

    const renderCard = (camp, badge, badgeColor, metric, metricVal) => `
        <div style="display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;background:#f8fafc;border-radius:10px;border-left:4px solid ${badgeColor};">
            <div style="flex:1;min-width:0;">
                <div style="font-size:1.15rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${camp.name}">${_truncate(camp.name, 26)}</div>
                <div style="font-size:1.1rem;color:#64748b;margin-top:0.2rem;">${metric}: <strong style="color:${badgeColor};">${metricVal}</strong></div>
            </div>
            <span style="background:${badgeColor}22;color:${badgeColor};font-size:1rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:6px;white-space:nowrap;">${badge}</span>
        </div>`;

    let html = `<div style="font-size:1.1rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:0.5rem 0;border-bottom:1px solid #e2e8f0;margin-bottom:0.6rem;">?? Top Conversion</div>`;
    html += byConv.map(c => renderCard(c, "TOP CONV", "#34A853", "Conv", _fmtNum(c.conv))).join("");

    if (byCpa.length > 0) {
        html += `<div style="font-size:1.1rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:0.5rem 0;border-bottom:1px solid #e2e8f0;margin:1rem 0 0.6rem;">? Scale du?c (CPA th?p)</div>`;
        html += byCpa.map(c => renderCard(c, "SCALE", "#4285F4", "CPA", _fmtMoney(c.cpa))).join("");
    }

    if (worstCpa.length > 0) {
        html += `<div style="font-size:1.1rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:0.5rem 0;border-bottom:1px solid #e2e8f0;margin:1rem 0 0.6rem;">?? L? (CPA cao)</div>`;
        html += worstCpa.map(c => renderCard(c, "HIGH CPA", "#EA4335", "CPA", _fmtMoney(c.cpa))).join("");
    }

    el.innerHTML = html;
}

// ---------------------------------------------
// 8. DETAIL TABLE (like Meta Campaign Details)
// ---------------------------------------------
function _renderCampaignTable(data, filterText = "", precalculatedGroup = null) {
    const wrap = document.getElementById("g_campaign_table");
    if (!wrap) return;

    const campaigns = precalculatedGroup || _groupByCampaign(data);
    let list = Object.values(campaigns).sort((a, b) => b.spent - a.spent);

    if (filterText) {
        const kw = filterText.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(kw));
    }

    if (list.length === 0) {
        wrap.innerHTML = `<div style="text-align:center;padding:4rem;color:#94a3b8;font-size:1.4rem;"><i class="fa-solid fa-folder-open" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>Kh�ng t�m th?y campaign n�o.</div>`;
        return;
    }

    // Each row � pure Google Ads classes, matching Meta row style
    const GOOGLE_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/3840px-Google_%22G%22_logo.svg.png';

    const rowsHtml = list.map(c => {
        const ctr = c.imp > 0 ? (c.click / c.imp * 100) : 0;
        const cpc = c.click > 0 ? c.spent / c.click : 0;
        const cpa = c.conv > 0 ? c.spent / c.conv : 0;
        const safeId = String(c.id || '').replace(/'/g, '');
        const safeName = (c.name || '').replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '&quot;');

        return `
        <div class="g_tbl_row">
          <div class="ads_name">
            <div class="g_thumb_wrap">
              <img src="${GOOGLE_LOGO}" alt="G" class="g_logo_img" />
            </div>
            <p class="g_camp_name" title="${c.name}">${_truncate(c.name, 50)}</p>
          </div>
          <div class="ad_metric g_col_center">
            <button onclick="event.stopPropagation();window._openKeywordPopup('${safeId}','${safeName}')" title="Xem Keywords &amp; Search Terms"
              style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;width:3.2rem;height:3.2rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#4285F4;font-size:1.1rem;transition:all .15s;"
              onmouseover="this.style.background='#4285F4';this.style.color='#fff';this.style.borderColor='#4285F4'"
              onmouseout="this.style.background='#f1f5f9';this.style.color='#4285F4';this.style.borderColor='#e2e8f0'">
              <i class="fa-solid fa-key"></i>
            </button>
          </div>
          <div class="ad_metric g_bold_val">${_fmtMoney(c.spent)}</div>
          <div class="ad_metric">${_fmtNum(c.imp)}</div>
          <div class="ad_metric">${_fmtNum(c.click)}</div>
          <div class="ad_metric">${_fmtNum(c.conv)}</div>
          <div class="ad_metric">${cpc > 0 ? _fmtMoney(cpc) : '-'}</div>
          <div class="ad_metric">${cpa > 0 ? _fmtMoney(cpa) : '-'}</div>
          <div class="ad_metric">${ctr.toFixed(2)}%</div>
          <div class="ad_metric g_bold_val">${_fmtNum(c.store)}</div>
        </div>`;
    }).join('');

    wrap.innerHTML = `<div class="g_tbl_body">${rowsHtml}</div>
        <div class="g_tbl_count">${list.length} campaign${list.length !== 1 ? 's' : ''}</div>`;
}

// ---------------------------------------------
// KEYWORD POPUP
// ---------------------------------------------
window._openKeywordPopup = function (campaignId, campaignName) {
    const modal = document.getElementById('g_keyword_modal');
    if (!modal) return;
    window._kwModalOpen = true;  // guard: prevent background re-render
    const sd = window.startDate || startDate || '';
    const ed = window.endDate || endDate || '';
    document.getElementById('g_kw_camp_name').textContent = campaignName;
    document.getElementById('g_kw_date_range').innerHTML = sd
        ? '<span style="display:inline-flex;align-items:center;gap:0.6rem;padding:0.45rem 1.2rem;background:#fffbeb;border:1.5px solid #fde68a;border-radius:20px;font-size:1.15rem;font-weight:600;color:#92400e;"><i class="fa-regular fa-calendar" style="color:#f59e0b;"></i>&nbsp;' + sd + '&nbsp;\u2192&nbsp;' + ed + '</span>'
        + '<span style="font-size:1.05rem;color:#94a3b8;font-style:italic;margin-left:0.8rem;">Top 50 keyword theo Impressions</span>'
        : '';
    modal.classList.add('active');
    // Do NOT set body overflow:hidden — it changes viewport width and triggers Chart.js resize
    // Reset to Keywords tab
    window._switchKwTab('keywords', modal.querySelector('[data-tab="keywords"]'));
    _loadKeywords(campaignId);
};

window._closeKeywordModal = function () {
    const modal = document.getElementById('g_keyword_modal');
    if (modal) modal.classList.remove('active');
    window._kwModalOpen = false;  // allow re-render again
};



let _kwActiveTab = 'keywords';
// ── In-memory keyword cache (session-scoped, key = campaignId|since|until) ──
const _kwCache = {};
window._switchKwTab = function (tab, el) {
    _kwActiveTab = tab;
    document.querySelectorAll('.g_kw_tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.classList.toggle('active', isActive);
        t.style.color = isActive ? '#1e293b' : '#94a3b8';
        t.style.fontWeight = isActive ? '700' : '600';
        t.style.borderBottomColor = isActive ? 'var(--mainClr)' : 'transparent';
    });
    document.getElementById('g_kw_tab_keywords').style.display = tab === 'keywords' ? '' : 'none';
    document.getElementById('g_kw_tab_terms').style.display = tab === 'terms' ? '' : 'none';
};

function _loadKeywords(campaignId) {
    const kwBody = document.getElementById('g_kw_body');
    const stBody = document.getElementById('g_st_body');
    if (!kwBody) return;

    const since = (typeof startDate !== 'undefined' && startDate) || window.startDate || '';
    const until = (typeof endDate !== 'undefined' && endDate) || window.endDate || '';

    // ── Check in-memory cache first ──────────────────────────────────────────
    const cacheKey = `${campaignId}|${since}|${until}`;
    if (_kwCache[cacheKey]) {
        const cached = _kwCache[cacheKey];
        _renderKeywordsTable(cached.keywords, cached.searchTerms);
        if (typeof showToast === 'function') showToast('⚡ Từ khóa từ cache – không cần tải lại', 'success');
        return;
    }

    // ── Show skeleton shimmer while fetching ─────────────────────────────────
    const shimCSS = '<style>@keyframes g_kw_shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}</style>';
    const skCell = '<td style="padding:0.85rem 1rem;"><div style="height:13px;border-radius:6px;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:400px 100%;animation:g_kw_shimmer 1.3s ease-in-out infinite;"></div></td>';
    const skRow8 = '<tr>' + skCell.repeat(8) + '</tr>';
    const skRow7 = '<tr>' + skCell.repeat(7) + '</tr>';
    kwBody.innerHTML = shimCSS + skRow8.repeat(6);
    if (stBody) stBody.innerHTML = skRow7.repeat(4);

    if (!GOOGLE_SHEET_API_URL) {
        kwBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ea4335;padding:2rem;">GOOGLE_SHEET_API_URL ch&#432;a &#273;&#432;&#7907;c c&#7845;u h&#236;nh</td></tr>';
        return;
    }

    const url = GOOGLE_SHEET_API_URL + '?type=keywords&campaignId=' + encodeURIComponent(campaignId) + '&since=' + since + '&until=' + until;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (!data.ok) throw new Error(data.error || 'API error');
            const kws = data.keywords || [];
            const sts = data.searchTerms || [];
            // Store in in-memory cache (top 50 already enforced server-side)
            _kwCache[cacheKey] = { keywords: kws, searchTerms: sts };
            _renderKeywordsTable(kws, sts);
        })
        .catch(err => {
            kwBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ea4335;padding:2rem;">' + err.message + '</td></tr>';
        });
}

function _renderKeywordsTable(keywords, searchTerms) {
    const kwBody = document.getElementById('g_kw_body');
    const stBody = document.getElementById('g_st_body');
    if (!kwBody) return;

    const MATCH_BADGE = { EXACT: '#4285F4', PHRASE: '#34A853', BROAD: '#ffa900', BROAD_MATCH: '#ffa900' };
    const MATCH_LABEL = { EXACT: 'Exact', PHRASE: 'Phrase', BROAD: 'Broad', BROAD_MATCH: 'Broad' };

    const hasKw = keywords.length > 0;
    const hasSt = searchTerms.length > 0;

    // Show/hide tabs based on data availability
    const tabKw = document.querySelector('.g_kw_tab[data-tab="keywords"]');
    const tabSt = document.querySelector('.g_kw_tab[data-tab="terms"]');
    if (tabKw) tabKw.style.display = hasKw ? '' : 'none';
    if (tabSt) tabSt.style.display = hasSt ? '' : 'none';

    // Auto-switch to the tab that has data
    if (!hasKw && hasSt) window._switchKwTab('terms', tabSt);
    else if (hasKw) window._switchKwTab('keywords', tabKw);

    // --- Keywords table ---
    if (!hasKw) {
        kwBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#94a3b8;">Không có dữ liệu keyword</td></tr>';
    } else {
        const totImp = keywords.reduce((a, k) => a + k.imp, 0);
        kwBody.innerHTML = keywords.map(k => {
            const ctr = k.imp > 0 ? (k.click / k.imp * 100).toFixed(2) : '0.00';
            const impPct = totImp > 0 ? (k.imp / totImp * 100).toFixed(1) : 0;
            const badge = MATCH_BADGE[k.matchType] || '#9e9e9e';
            const bLabel = MATCH_LABEL[k.matchType] || (k.matchType || '-');
            return `<tr class="g_kw_row" style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:0.85rem 1rem;">
                <div style="font-weight:600;color:#1e293b;">${k.keyword}</div>
                <div style="font-size:1rem;color:#94a3b8;margin-top:2px;">${k.adGroup || ''}</div>
              </td>
              <td style="padding:0.85rem 1rem;text-align:center;"><span style="padding:3px 10px;border-radius:10px;background:${badge}22;color:${badge};font-size:1rem;font-weight:700;">${bLabel}</span></td>
              <td style="padding:0.85rem 1rem;text-align:right;">
                <div>${k.imp.toLocaleString('vi-VN')}</div>
                <div style="font-size:0.9rem;color:#94a3b8;">${impPct}%</div>
              </td>
              <td style="padding:0.85rem 1rem;text-align:right;">${k.click.toLocaleString('vi-VN')}</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${ctr}%</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${k.conv ? k.conv.toLocaleString('vi-VN') : '-'}</td>
              <td style="padding:0.85rem 1rem;text-align:right;font-weight:600;">${_fmtMoney(k.cost)}</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${k.impShare != null && k.impShare !== '' ? k.impShare + '%' : '-'}</td>
            </tr>`;
        }).join('');
    }

    // --- Search Terms table ---
    if (!hasSt) {
        stBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#94a3b8;">Không có dữ liệu search term</td></tr>';
    } else {
        stBody.innerHTML = searchTerms.map(s => {
            const ctr = s.imp > 0 ? (s.click / s.imp * 100).toFixed(2) : '0.00';
            const cpc = s.click > 0 ? _fmtMoney(s.cost / s.click) : '-';
            const statusColor = s.status === 'ADDED' ? '#34A853' : (s.status === 'EXCLUDED' ? '#ea4335' : (s.status === 'SMART' ? '#4285F4' : '#94a3b8'));
            return `<tr class="g_kw_row" style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:0.85rem 1rem;font-weight:500;color:#1e293b;">${s.term}</td>
              <td style="padding:0.85rem 1rem;text-align:center;"><span style="padding:3px 10px;border-radius:10px;background:${statusColor}22;color:${statusColor};font-size:1rem;font-weight:600;">${s.status || '-'}</span></td>
              <td style="padding:0.85rem 1rem;text-align:right;">${s.imp.toLocaleString('vi-VN')}</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${s.click.toLocaleString('vi-VN')}</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${ctr}%</td>
              <td style="padding:0.85rem 1rem;text-align:right;">${cpc}</td>
              <td style="padding:0.85rem 1rem;text-align:right;font-weight:600;">${_fmtMoney(s.cost)}</td>
            </tr>`;
        }).join('');
    }
}

// ---------------------------------------------
// EXPORT CSV
// ---------------------------------------------
window.exportGoogleCsv = function () {
    const campaigns = _groupByCampaign(googleAdsFilteredData);
    const list = Object.values(campaigns).sort((a, b) => b.spent - a.spent);

    const headers = ["Campaign", "Spent", "Impression", "Click", "CTR(%)", "CPC", "Conversions", "CPA", "Store Visit"];
    const rows = list.map(c => {
        const ctr = c.imp > 0 ? (c.click / c.imp * 100).toFixed(2) : 0;
        const cpc = c.click > 0 ? (c.spent / c.click).toFixed(0) : 0;
        const cpa = c.conv > 0 ? (c.spent / c.conv).toFixed(0) : 0;
        return [c.name, c.spent.toFixed(0), c.imp, c.click, ctr, cpc, c.conv, cpa, c.store].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `google_ads_${startDate}_${endDate}.csv`;
    a.click();
    if (typeof showToast === 'function') showToast("Xuất CSV thành công!");
};

// ---------------------------------------------
// HELPERS
// ---------------------------------------------
function _groupByCampaign(data) {
    const map = {};
    data.forEach(item => {
        const name = item.campaign || "Unknown";
        if (!map[name]) map[name] = {
            name, id: item.campaign_id || '',
            spent: 0, imp: 0, click: 0, conv: 0, store: 0, dir: 0, calls: 0, menu: 0, orders: 0, other: 0
        };
        // Keep first non-empty campaign_id found
        if (!map[name].id && item.campaign_id) map[name].id = item.campaign_id;
        map[name].spent += parseFloat(item.spent || 0);
        map[name].imp += parseFloat(item.impression || 0);
        map[name].click += parseFloat(item.click || 0);
        map[name].conv += parseFloat(item.all_conversions || 0);
        map[name].store += parseFloat(item.store_visits || 0);
        map[name].dir += parseFloat(item.directions || 0);
        map[name].calls += parseFloat(item.calls || 0);
        map[name].menu += parseFloat(item.menu || 0);
        map[name].orders += parseFloat(item.orders || 0);
        map[name].other += parseFloat(item.other || 0);
    });
    return map;
}

/** Parse JSON device column safely */
function _parseDeviceJson(str) {
    if (!str) return {};
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch (e) { return {}; }
}

/** Local Actions � exact Funnel Performance style with icon inside bar */
function _renderLocalActionsChart(dir, calls, menu, orders, other, visits) {
    const container = document.getElementById("g_local_actions_wrap");
    if (!container) return;

    const all = [
        { label: "Directions", value: dir, color: "#4285F4", icon: "fa-map-location-dot" },
        { label: "Menu", value: menu, color: "#FF6D00", icon: "fa-utensils" },
        { label: "Store Visits", value: visits, color: "#EA4335", icon: "fa-store" },
        { label: "Calls", value: calls, color: "#34A853", icon: "fa-phone" },
        { label: "Orders", value: orders, color: "#9C27B0", icon: "fa-bag-shopping" },
    ].filter(i => i.value > 0).sort((a, b) => b.value - a.value);

    if (!all.length) {
        container.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:2rem;">Kh�ng c� Local Actions data</p>`;
        return;
    }

    const max = Math.max(...all.map(i => i.value), 1);
    container.innerHTML = all.map(item => {
        const pct = Math.max((item.value / max * 100), 4);
        return `
        <div style="margin-bottom:1.4rem;">
          <div style="display:flex;align-items:center;gap:1.2rem;">
            <div style="width:${pct}%;background:${item.color};border-radius:6px;height:3.6rem;
                        display:flex;align-items:center;padding:0 1.2rem;
                        transition:width .6s ease;min-width:4rem;">
              <i class="fa-solid ${item.icon}" style="color:#fff;font-size:1.3rem;"></i>
            </div>
            <div>
              <div style="font-size:1.1rem;color:#64748b;">${item.label}</div>
              <div style="font-size:1.6rem;font-weight:700;color:#1e293b;">${_fmtNum(item.value)}</div>
            </div>
          </div>
        </div>`;
    }).join("");
}

// -- Device breakdown state ----------------------------------
let _gDevData = { mob: {}, desk: {}, tab: {} };
let _gDevFilter = 'click';

/** Device Breakdown � list left + donut right */
function _aggregateDeviceData(data, campFilter) {
    const rows = campFilter === '__all__' ? data : data.filter(d => d.campaign === campFilter);
    const mk = () => ({ imp: 0, click: 0, conv: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0, spent: 0 });
    const mob = mk(), desk = mk(), tab = mk();
    const _add = (obj, src) => {
        obj.imp += src.Impression || 0;
        obj.click += src.Click || 0;
        obj.conv += src['All Conversions'] || 0;
        obj.visits += src['Store Visits'] || 0;
        obj.dir += src['Directions'] || 0;
        obj.calls += src['Calls'] || 0;
        obj.menu += src['Menu'] || 0;
        obj.orders += src['Orders'] || 0;
        obj.spent += src['Spent'] || src['spent'] || 0;
    };
    rows.forEach(item => {
        _add(mob, _parseDeviceJson(item.mobile));
        _add(desk, _parseDeviceJson(item.desktop));
        _add(tab, _parseDeviceJson(item.tablet));
    });
    return { mob, desk, tab };
}

function _renderDeviceChart(mob, desk, tab) {
    _gDevData = { mob, desk, tab };
    _buildDeviceChart(_gDevFilter);
}

window.setGDeviceFilter = function (metric, el) {
    _gDevFilter = metric;
    // Update dom_select radio boxes
    const wrap = document.getElementById('g_dev_select');
    if (wrap) {
        wrap.querySelectorAll('li').forEach(li => {
            const isActive = li.dataset.metric === metric;
            li.classList.toggle('active', isActive);
            const rb = li.querySelector('.radio_box');
            if (rb) rb.classList.toggle('active', isActive);
        });
        // Update label
        const lbl = wrap.querySelector('.dom_selected');
        if (lbl && el) lbl.textContent = el.querySelector('span:last-child')?.textContent || '';
        wrap.classList.remove('active');
        wrap.querySelector('.dom_select_show')?.classList.remove('active');
    }
    _buildDeviceChart(metric);
    // Sync 3 breakdown charts with same metric
    _buildChannelChart(_dimData.channel, metric);
    _buildLocationChart(_dimData.location, metric);
    _buildDistanceChart(_dimData.distance, metric);
};

function _buildDeviceChart(metric) {
    const { mob, desk, tab } = _gDevData;
    const wrap = document.getElementById('g_device_card_wrap');
    if (!wrap) return;

    const COLORS = ['#FFA900', '#001ea5', '#34A853'];
    const BG_DONUT = ['#FFA900', '#001ea5', '#E0E0E0'];
    const ICONS = ['fa-mobile-screen', 'fa-desktop', 'fa-tablet-screen-button'];
    const LABELS = ['Mobile', 'Desktop', 'Tablet'];
    const devs = [mob, desk, tab];

    // All keys lowercase: imp, click, conv, visits, dir, calls, menu, orders
    const FIELD = { click: 'click', imp: 'imp', conv: 'conv', visits: 'visits', dir: 'dir', calls: 'calls', menu: 'menu', orders: 'orders' };
    const LABELS_F = { click: 'Clicks', imp: 'Impressions', conv: 'All Conversions', visits: 'Store Visits', dir: 'Directions', calls: 'Calls', menu: 'Menu', orders: 'Orders' };
    const key = FIELD[metric] || 'click';
    // Sub-stat: always show spent

    const values = devs.map(d => parseFloat(d[key] || 0));
    const total = values.reduce((a, b) => a + b, 0);
    const topPct = total > 0 ? ((values[0] / total) * 100).toFixed(1) : '0';

    wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:2rem;">
      <div id="g_dev_list" style="flex:1.4;display:flex;flex-direction:column;gap:1rem;"></div>
      <div style="flex:0 0 160px;">
        <div style="position:relative;width:160px;height:160px;">
          <canvas id="g_device_chart" width="160" height="160"
                  style="width:160px!important;height:160px!important;display:block;"></canvas>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                      text-align:center;pointer-events:none;">
            <div style="font-size:1.8rem;font-weight:800;color:#1e293b;line-height:1;">${topPct}%</div>
            <div style="font-size:0.95rem;color:#888;margin-top:0.2rem;">${LABELS[0]}</div>
          </div>
        </div>
      </div>
    </div>`;

    // List cards
    const listEl = document.getElementById('g_dev_list');
    if (listEl) {
        listEl.innerHTML = devs.map((d, i) => {
            const v = values[i];
            const pct = total > 0 ? (v / total * 100).toFixed(1) : '0';
            const sub = _fmtMoney(d['spent'] || 0);
            return `
            <div style="padding:1rem 1.2rem;border-radius:12px;border:1px solid #f0f0f0;
                        background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
              <div style="display:flex;align-items:center;gap:0.7rem;font-weight:600;
                          color:#555;font-size:1rem;margin-bottom:0.3rem;">
                <i class="fa-solid ${ICONS[i]}" style="color:${COLORS[i]};font-size:1.1rem;"></i>
                <span>${LABELS[i]}</span>
              </div>
              <div style="font-weight:800;font-size:1.5rem;color:#1e293b;padding-left:1.8rem;">
                ${_fmtNum(v)}
              </div>
              <div style="font-size:1rem;color:#94a3b8;padding-left:1.8rem;">
                ${pct}% — ${sub}
              </div>
            </div>`;
        }).join('');
    }

    // Draw donut � fixed 200�200 canvas, not responsive (prevents squish)
    const ctxEl = document.getElementById('g_device_chart');
    if (!ctxEl) return;
    if (G_CHARTS.device) G_CHARTS.device.destroy();
    G_CHARTS.device = new Chart(ctxEl, {
        type: 'doughnut',
        data: {
            labels: LABELS,
            datasets: [{
                data: values,
                backgroundColor: BG_DONUT,
                borderWidth: 4,
                borderColor: '#fff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: false,        // fixed size = perfect circle
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => `${c.label}: ${_fmtNum(c.raw)} (${total > 0 ? (c.raw / total * 100).toFixed(1) : 0}%)`
                    }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// HOURLY ACTIVITY CHART
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let _gHourlyCamp = '__all__';
let _gHourlyMetric = 'click';

/** Populate campaign dropdown from current data */
function _populateHourlyCampDropdown(data) {
    const listEl = document.getElementById('g_hourly_camp_list');
    if (!listEl) return;
    const camps = [...new Set(data.map(d => d.campaign).filter(Boolean))].sort();
    // Reset list � delegation listener on ul still works for new LIs
    listEl.innerHTML = `<li data-view="__all__" class="active"><span class="radio_box active"></span><span>All Campaigns</span></li>`;
    camps.forEach(name => {
        const li = document.createElement('li');
        li.dataset.view = name;
        li.innerHTML = `<span class="radio_box"></span><span>${name}</span>`;
        li.title = name;
        listEl.appendChild(li);
    });
    // DO NOT reset _gDropInit or re-call _initGoogleDropdowns here �
    // delegation on the <ul> handles new <li>s, re-init would add duplicate listeners.
}

/** Hourly bar chart \u2014 aggregates hourly JSON from all filtered rows */
function _renderHourlyChart(data, campFilter, metric) {
    const ctx = document.getElementById('g_hourly_chart');
    if (!ctx) return;
    if (G_CHARTS.hourly) { G_CHARTS.hourly.destroy(); G_CHARTS.hourly = null; }

    // 24-slot accumulator
    const slots = Array.from({ length: 24 }, (_, h) => ({
        h, imp: 0, click: 0, spent: 0, conv: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0
    }));

    const rows = campFilter === '__all__' ? data : data.filter(d => d.campaign === campFilter);
    for (const item of rows) {
        if (!item.hourly) continue;
        let parsed = item.hourly;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { continue; } }
        if (!Array.isArray(parsed)) continue;
        for (const h of parsed) {
            const s = slots[h.h];
            if (!s) continue;
            s.imp += h.imp || 0;
            s.click += h.click || 0;
            s.spent += h.spent || 0;
            s.conv += h.conv || 0;
            s.visits += h.visits || 0;
            s.dir += h.dir || 0;
            s.calls += h.calls || 0;
            s.menu += h.menu || 0;
            s.orders += h.orders || 0;
        }
    }

    const METRIC_LABELS = {
        click: 'Clicks', imp: 'Impressions', spent: 'Spent', conv: 'All Conversions',
        visits: 'Store Visits', dir: 'Directions', calls: 'Calls', menu: 'Menu', orders: 'Orders'
    };
    const METRIC_COLORS = {
        click: '#ffa900', imp: '#4285F4', spent: '#EA4335',
        conv: '#34A853', visits: '#FF6D00', dir: '#4285F4',
        calls: '#34A853', menu: '#FF6D00', orders: '#9C27B0'
    };

    const labels = slots.map(s => `${s.h}h`);
    const values = slots.map(s => s[metric] || 0);
    const color = METRIC_COLORS[metric] || '#ffa900';
    const isMoney = metric === 'spent';

    // â”€â”€ Update in-place for smooth animation, create on first load â”€â”€
    if (G_CHARTS.hourly && G_CHARTS.hourly.canvas === ctx) {
        const c = G_CHARTS.hourly;
        c.data.datasets[0].data = values;
        c.data.datasets[0].backgroundColor = values.map(v => v > 0 ? color + 'cc' : '#e2e8f0');
        c.data.datasets[0].label = METRIC_LABELS[metric] || metric;
        c.options.plugins.datalabels.formatter = v => isMoney ? _fmtShort(v) : _fmtNum(v);
        c.options.plugins.tooltip.callbacks.label = ctx2 => isMoney ? _fmtMoney(ctx2.raw) : _fmtNum(ctx2.raw) + ' ' + METRIC_LABELS[metric];
        c.options.scales.y.ticks.callback = v => isMoney ? _fmtShort(v) : _fmtNum(v);
        c.options.animation = { duration: 500, easing: 'easeOutQuart' };
        c.update();
        return;
    }
    _destroyChart('g_hourly_chart', 'hourly');
    G_CHARTS.hourly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: METRIC_LABELS[metric] || metric,
                data: values,
                backgroundColor: values.map(v => v > 0 ? color + 'cc' : '#e2e8f0'),
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 500, easing: 'easeOutQuart' },
            animations: { y: { from: (ctx) => ctx.chart.scales.y.getPixelForValue(0), duration: 500, easing: 'easeOutQuart' } },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: ctx2 => ctx2.dataset.data[ctx2.dataIndex] > 0,
                    anchor: 'end', align: 'end', offset: 2,
                    font: { size: 9, weight: '700' }, color: '#444',
                    formatter: v => isMoney ? _fmtShort(v) : _fmtNum(v)
                },
                tooltip: {
                    callbacks: {
                        label: c => isMoney ? _fmtMoney(c.raw) : _fmtNum(c.raw) + ' ' + METRIC_LABELS[metric]
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
                y: {
                    beginAtZero: true,
                    grace: '20%',
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: {
                        font: { size: 9 }, color: '#94a3b8',
                        callback: v => isMoney ? _fmtShort(v) : _fmtNum(v)
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function _fmtMoney(v) {
    if (!v || isNaN(v)) return "0d";
    return Math.round(v).toLocaleString("vi-VN") + "d";
}

function _fmtNum(v) {
    if (!v || isNaN(v)) return "0";
    return Math.round(v).toLocaleString("vi-VN");
}

function _fmtShort(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v;
}

function _truncate(str, n) {
    return str && str.length > n ? str.slice(0, n) + "�" : (str || "");
}

function _setHtml(id, val, diffPct = null, prevRange = "", prevVal = null) {
    const el = document.getElementById(id);
    if (!el) return;

    // First span for the main value
    const valSpan = el.querySelector("span:first-child");
    const target = valSpan || el;
    target.textContent = val;

    if (diffPct !== null) {
        const valNum = parseFloat(diffPct);
        if (valNum > 0) target.style.color = "#10b981";
        else if (valNum < 0) target.style.color = "#ef4444";
        else target.style.color = "";
    }

    // Second span for the percentage change
    const diffSpan = el.querySelector("span:nth-child(2)");
    if (diffSpan && diffPct !== null) {
        const valNum = parseFloat(diffPct);
        const isUp = valNum > 0;
        const isDown = valNum < 0;

        diffSpan.textContent = (isUp ? "+" : "") + diffPct + "%";
        diffSpan.className = isUp ? "increase" : (isDown ? "decrease" : "");

        let tooltipText = "";
        if (prevRange) tooltipText += `K? tru?c: ${prevRange}`;
        if (prevVal !== null) {
            tooltipText += (tooltipText ? ` (${prevVal})` : `K? tru?c: ${prevVal}`);
        }
        if (tooltipText) diffSpan.setAttribute("data-tooltip", tooltipText);
    }
}

window.refreshGoogleAds = renderGoogleAdsView;

// -------------------------------------------------------------
// SHARED HELPERS cho Channel / Location / Distance breakdowns
// Metric d�ng chung _gDevFilter (c�ng selector v?i Device chart)
// -------------------------------------------------------------
const DIM_METRICS = {
    imp: { label: 'Impressions', fmt: v => (v ?? 0).toLocaleString() },
    click: { label: 'Clicks', fmt: v => (v ?? 0).toLocaleString() },
    conv: { label: 'All Conv.', fmt: v => (v ?? 0).toLocaleString() },
    cost: { label: 'Spent', fmt: v => _fmtShort(v ?? 0) },
    visits: { label: 'Store Visits', fmt: v => (v ?? 0).toLocaleString() },
    dir: { label: 'Directions', fmt: v => (v ?? 0).toLocaleString() },
    calls: { label: 'Calls', fmt: v => (v ?? 0).toLocaleString() },
    menu: { label: 'Menu', fmt: v => (v ?? 0).toLocaleString() },
    orders: { label: 'Orders', fmt: v => (v ?? 0).toLocaleString() },
};
const DIM_METRIC_KEYS = Object.keys(DIM_METRICS);

/** Safely destroy any Chart.js instance tied to a canvas, even if our G_CHARTS ref is stale */
function _destroyChart(canvasId, storeKey) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const existing = Chart.getChart(canvas);
        if (existing) { try { existing.destroy(); } catch (_) { } }
    }
    if (storeKey && G_CHARTS[storeKey]) {
        try { G_CHARTS[storeKey].destroy(); } catch (_) { }
        G_CHARTS[storeKey] = null;
    }
}

/** Parse JSON column safely */
function _parseJsonCol(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val) || []; } catch { return []; }
}

/** Aggregate dimension data across filtered rows */
function _aggDim(data, colKey, idFn) {
    const agg = {};
    for (const item of data) {
        const arr = _parseJsonCol(item[colKey]);
        for (const entry of arr) {
            const id = idFn(entry);
            if (!agg[id]) agg[id] = { imp: 0, click: 0, conv: 0, cost: 0, visits: 0, dir: 0, calls: 0, menu: 0, orders: 0 };
            DIM_METRIC_KEYS.forEach(k => { agg[id][k] += (entry[k] || 0); });
        }
    }
    return agg;
}

// Cached aggregated data � rebuilt on campaign/date filter change
let _dimData = { channel: null, location: null, distance: null };

// -------------------------------------------------------------
// CHANNEL BREAKDOWN � card list + donut, d�ng _gDevFilter
// -------------------------------------------------------------
function _renderChannelChart(data) {
    const wrap = document.getElementById('g_channel_chart')?.closest('.dom_inner');
    if (!wrap) return;
    const agg = _aggDim(data, 'channels', e => e.ch);
    _dimData.channel = agg;
    _buildChannelChart(agg, _gDevFilter || 'cost');
}

function _buildChannelChart(agg, metric) {
    if (!agg) return;
    const CH_COLORS = { 'Search': '#4285F4', 'Display': '#34A853', 'YouTube': '#EA4335', 'PMAX': '#ffa900', 'Search Partners': '#00BCD4', 'TV': '#9C27B0', 'Unknown': '#9e9e9e' };
    const CH_ICONS = { 'Search': 'fa-magnifying-glass', 'Display': 'fa-display', 'YouTube': 'fa-youtube', 'PMAX': 'fa-rocket', 'Search Partners': 'fa-handshake', 'TV': 'fa-tv', 'Unknown': 'fa-circle-question' };
    const metInfo = DIM_METRICS[metric] || DIM_METRICS.cost;
    const fmt = metInfo.fmt;

    const entries = Object.entries(agg).sort((a, b) => b[1][metric] - a[1][metric]);
    if (!entries.length) return;

    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v[metric]);
    const colors = labels.map(l => CH_COLORS[l] || '#607D8B');
    const total = values.reduce((a, b) => a + b, 0);
    const topPct = total > 0 ? (values[0] / total * 100).toFixed(1) : '0';

    const wrap = document.getElementById('g_channel_chart')?.closest('.dom_inner');
    const body = wrap?.querySelector('.g_channel_body');
    if (!body) return;

    body.innerHTML = `
    <div style="font-size:0.82rem;color:#94a3b8;margin:-0.2rem 0 1rem;font-weight:500;">Theo: <strong style="color:#475569;">${metInfo.label}</strong></div>
    <div style="display:flex;align-items:flex-start;gap:1.2rem;">
      <div id="g_ch_list" style="flex:1.4;display:flex;flex-direction:column;gap:1rem;"></div>
      <div style="flex:0 0 160px;">
        <div style="position:relative;width:160px;height:160px;">
          <canvas id="g_channel_donut" width="160" height="160"
                  style="width:160px!important;height:160px!important;display:block;"></canvas>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
            <div style="font-size:1.8rem;font-weight:800;color:#1e293b;line-height:1;">${topPct}%</div>
            <div style="font-size:0.95rem;color:#888;margin-top:0.2rem;">${labels[0] || ''}</div>
          </div>
        </div>
      </div>
    </div>`;

    // Match Device Breakdown card sizes exactly
    document.getElementById('g_ch_list').innerHTML = entries.map(([k, v], i) => {
        const pct = total > 0 ? (v[metric] / total * 100).toFixed(1) : '0';
        const sub = metric === 'cost' ? _fmtShort(v.cost) : _fmtShort(v.cost);
        return `
        <div style="padding:1rem 1.2rem;border-radius:12px;border:1px solid #f0f0f0;
                    background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
          <div style="display:flex;align-items:center;gap:0.7rem;font-weight:600;
                      color:#555;font-size:1rem;margin-bottom:0.3rem;">
            <i class="fa-solid ${CH_ICONS[k] || 'fa-circle'}" style="color:${colors[i]};font-size:1.1rem;"></i>
            <span>${k}</span>
          </div>
          <div style="font-weight:800;font-size:1.5rem;color:#1e293b;padding-left:1.8rem;">
            ${fmt(v[metric])}
          </div>
          <div style="font-size:1rem;color:#94a3b8;padding-left:1.8rem;">
            ${pct}% — ${_fmtShort(v.cost)}
          </div>
        </div>`;
    }).join('');

    if (G_CHARTS.channel) G_CHARTS.channel.destroy();
    _destroyChart('g_channel_donut', 'channel');
    const ctxEl = document.getElementById('g_channel_donut');
    if (!ctxEl) return;
    G_CHARTS.channel = new Chart(ctxEl, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 4, borderColor: '#fff', hoverOffset: 6 }] },
        options: {
            responsive: false, maintainAspectRatio: true, cutout: '70%',
            plugins: {
                legend: { display: false }, datalabels: { display: false },
                tooltip: { backgroundColor: '#1e293b', callbacks: { label: c => `${c.label}: ${total > 0 ? (c.raw / total * 100).toFixed(1) : 0}% (${fmt(c.raw)})` } }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// -------------------------------------------------------------
// LOCATION PERFORMANCE � horizontal bar, d?ng b? _gDevFilter
// -------------------------------------------------------------
function _renderLocationChart(data) {
    const ctx = document.getElementById('g_location_chart');
    if (!ctx) return;
    const agg = _aggDim(data, 'locations', e => e.name || `Loc_${e.id}`);
    const hasProv = Object.keys(agg).some(k => k !== 'Vi?t Nam (T?ng)');
    if (hasProv) delete agg['Vi?t Nam (T?ng)'];
    _dimData.location = agg;
    _buildLocationChart(agg, _gDevFilter || 'imp');
}

function _buildLocationChart(agg, metric) {
    if (!agg) return;
    const ctx = document.getElementById('g_location_chart');
    if (!ctx) return;
    if (G_CHARTS.location) { G_CHARTS.location.destroy(); G_CHARTS.location = null; }
    _destroyChart('g_location_chart', 'location');
    const metInfo = DIM_METRICS[metric] || DIM_METRICS.imp;

    // Update metric subtitle in the card
    const locCard = ctx.closest('.dom_inner');
    if (locCard) {
        let subEl = locCard.querySelector('.g_loc_metric_sub');
        if (!subEl) {
            subEl = document.createElement('p');
            subEl.className = 'g_loc_metric_sub';
            subEl.style.cssText = 'font-size:0.82rem;color:#94a3b8;margin:-0.3rem 0 0.8rem;font-weight:500;';
            const fixedP = locCard.querySelector('p:not(.g_loc_metric_sub)');
            const h2 = locCard.querySelector('h2');
            if (fixedP) fixedP.after(subEl); else if (h2) h2.after(subEl);
        }
        subEl.innerHTML = `Theo: <strong style="color:#475569;">${metInfo.label}</strong>`;
    }

    const sorted = Object.entries(agg).sort((a, b) => b[1][metric] - a[1][metric]).slice(0, 10);
    if (!sorted.length) return;
    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => v[metric]);
    const maxVal = Math.max(...values, 1);
    const maxIdx = values.indexOf(maxVal);
    const ctxObj = ctx.getContext('2d');
    const gradGold = ctxObj.createLinearGradient(300, 0, 0, 0);
    gradGold.addColorStop(0, 'rgba(255,169,0,1)');
    gradGold.addColorStop(1, 'rgba(255,169,0,0.4)');
    const gradGray = ctxObj.createLinearGradient(300, 0, 0, 0);
    gradGray.addColorStop(0, 'rgba(210,210,210,0.9)');
    gradGray.addColorStop(1, 'rgba(160,160,160,0.4)');
    const bgColors = values.map((_, i) => i === maxIdx ? gradGold : gradGray);
    ctx.parentElement.style.height = Math.max(200, sorted.length * 40 + 40) + 'px';
    // â”€â”€ Update in-place for smooth animation â”€â”€
    if (G_CHARTS.location && G_CHARTS.location.canvas === ctx) {
        const c = G_CHARTS.location;
        c.data.labels = labels;
        c.data.datasets[0].data = values;
        c.data.datasets[0].backgroundColor = bgColors;
        c.options.scales.x.suggestedMax = maxVal * 1.3;
        c.options.plugins.datalabels.formatter = v => metInfo.fmt(v);
        c.options.plugins.tooltip.callbacks.label = ci => ` ${metInfo.label}: ${metInfo.fmt(ci.parsed.x)}`;
        c.options.animation = { duration: 600, easing: 'easeOutQuart' };
        c.update();
        return;
    }
    G_CHARTS.location = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 8, borderWidth: 0, barPercentage: 0.65, categoryPercentage: 0.8 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            animations: { x: { from: 0, duration: 600, easing: 'easeOutQuart' } },
            layout: { padding: { left: 0, right: 28 } },
            plugins: {
                legend: { display: false },
                datalabels: { anchor: 'end', align: 'end', offset: 4, font: { size: 10, weight: '700' }, color: '#444', formatter: v => metInfo.fmt(v) },
                tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8, callbacks: { title: items => items[0].label, label: c => ` ${metInfo.label}: ${metInfo.fmt(c.parsed.x)}` } }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { display: false }, suggestedMax: maxVal * 1.3 },
                y: { grid: { display: false }, ticks: { color: '#555', font: { weight: '600', size: 11 }, maxRotation: 0 } }
            }
        },
        plugins: [ChartDataLabels]
    });
}

const _DIST_ORDER = ['WITHIN_700M', 'WITHIN_1KM', 'WITHIN_5KM', 'WITHIN_10KM', 'WITHIN_15KM', 'WITHIN_20KM', 'WITHIN_25KM', 'WITHIN_30KM', 'WITHIN_35KM', 'WITHIN_40KM', 'WITHIN_45KM', 'WITHIN_50KM', 'WITHIN_55KM', 'WITHIN_60KM', 'WITHIN_65KM', 'BEYOND_65KM'];
const _DIST_LABEL = { 'WITHIN_700M': '0-700m', 'WITHIN_1KM': '700m-1km', 'WITHIN_5KM': '1-5km', 'WITHIN_10KM': '5-10km', 'WITHIN_15KM': '10-15km', 'WITHIN_20KM': '15-20km', 'WITHIN_25KM': '20-25km', 'WITHIN_30KM': '25-30km', 'WITHIN_35KM': '30-35km', 'WITHIN_40KM': '35-40km', 'WITHIN_45KM': '40-45km', 'WITHIN_50KM': '45-50km', 'WITHIN_55KM': '50-55km', 'WITHIN_60KM': '55-60km', 'WITHIN_65KM': '60-65km', 'BEYOND_65KM': '> 65km' };
// -------------------------------------------------------------
// DISTANCE RADIUS
// -------------------------------------------------------------
function _renderDistanceChart(data) {
    const ctx = document.getElementById('g_distance_chart');
    if (!ctx) return;
    const cumAgg = _aggDim(data, 'distances', e => e.d);
    _dimData.distance = cumAgg;
    _buildDistanceChart(cumAgg, _gDevFilter || 'conv');
}
function _buildDistanceChart(cumAgg, metric) {
    if (!cumAgg) return;
    const ctx = document.getElementById('g_distance_chart');
    if (!ctx) return;
    if (G_CHARTS.distance) { G_CHARTS.distance.destroy(); G_CHARTS.distance = null; }
    _destroyChart('g_distance_chart', 'distance');
    const metInfo = DIM_METRICS[metric] || DIM_METRICS.conv;

    // Update metric subtitle in the card
    const distCard = ctx.closest('.dom_inner');
    if (distCard) {
        let subEl = distCard.querySelector('.g_dist_metric_sub');
        if (!subEl) {
            subEl = document.createElement('p');
            subEl.className = 'g_dist_metric_sub';
            subEl.style.cssText = 'font-size:0.82rem;color:#94a3b8;margin:-0.3rem 0 0.8rem;font-weight:500;';
            const h2 = distCard.querySelector('h2');
            const fixedP = distCard.querySelector('p:not(.g_dist_metric_sub)');
            if (fixedP) fixedP.after(subEl); else if (h2) h2.after(subEl);
        }
        subEl.innerHTML = `Theo: <strong style="color:#475569;">${metInfo.label}</strong>`;
    }

    const buckets = _DIST_ORDER.filter(d => cumAgg[d]);
    const allIncr = buckets.map((b, i) => {
        const cur = cumAgg[b];
        const prev = i > 0 ? cumAgg[buckets[i - 1]] : null;
        return { label: _DIST_LABEL[b] || b, val: Math.max(0, cur[metric] - (prev ? prev[metric] : 0)) };
    }).filter(d => d.val > 0);
    if (!allIncr.length) return;

    // Sort descending, keep top 7 highest
    const top7 = [...allIncr].sort((a, b) => b.val - a.val).slice(0, 7);
    // Re-sort by natural distance order for display
    const orderMap = {};
    allIncr.forEach((d, i) => { orderMap[d.label] = i; });
    top7.sort((a, b) => (orderMap[a.label] ?? 99) - (orderMap[b.label] ?? 99));

    const labels = top7.map(d => d.label);
    const values = top7.map(d => d.val);
    const maxVal = Math.max(...values, 1);
    const maxIdx = values.indexOf(maxVal);

    // Vertical gradient (top-to-bottom) — same direction as Campaign bar chart
    const ctxObj = ctx.getContext('2d');
    const gradGold = ctxObj.createLinearGradient(0, 0, 0, 300);
    gradGold.addColorStop(0, 'rgba(255,169,0,1)');
    gradGold.addColorStop(1, 'rgba(255,169,0,0.4)');
    const gradGray = ctxObj.createLinearGradient(0, 0, 0, 300);
    gradGray.addColorStop(0, 'rgba(210,210,210,0.9)');
    gradGray.addColorStop(1, 'rgba(160,160,160,0.4)');
    const bgColors = values.map((_, i) => i === maxIdx ? gradGold : gradGray);

    const isMoney = metric === 'cost';
    const isFew = labels.length < 3;

    // â”€â”€ Update in-place for smooth animation â”€â”€
    if (G_CHARTS.distance && G_CHARTS.distance.canvas === ctx) {
        const c = G_CHARTS.distance;
        c.data.labels = labels;
        c.data.datasets[0].data = values;
        c.data.datasets[0].backgroundColor = bgColors;
        c.options.scales.y.suggestedMax = maxVal * 1.3;
        c.options.plugins.datalabels.formatter = v => metInfo.fmt(v);
        c.options.plugins.tooltip.callbacks.label = ci => ` ${metInfo.label}: ${metInfo.fmt(ci.parsed.y)}`;
        c.options.animation = { duration: 600, easing: 'easeOutQuart' };
        c.update();
        return;
    }
    G_CHARTS.distance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderRadius: 8,
                borderWidth: 0,
                ...(isFew && { barPercentage: 0.35, categoryPercentage: 0.65 })
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            animations: { y: { from: (ctx) => ctx.chart.scales.y.getPixelForValue(0), duration: 600, easing: 'easeOutQuart' } },
            layout: { padding: { left: 10, right: 10, top: 24 } },
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end', align: 'end', offset: 2,
                    font: { size: 10, weight: '700' }, color: '#444',
                    formatter: v => isMoney ? _fmtShort(v) : _fmtNum(v)
                },
                tooltip: {
                    backgroundColor: '#1e293b', padding: 10, cornerRadius: 8,
                    callbacks: {
                        title: items => items[0].label,
                        label: c => ` ${metInfo.label}: ${metInfo.fmt(c.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#666', font: { weight: '600', size: 9 }, maxRotation: 0, minRotation: 0, autoSkip: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: true, borderColor: 'rgba(0,0,0,0.05)' },
                    ticks: { display: false },
                    suggestedMax: maxVal * 1.25
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}
