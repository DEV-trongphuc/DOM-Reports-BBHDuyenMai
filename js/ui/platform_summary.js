/**
 * @file platform_summary.js
 * @description Cập nhật các thẻ tóm tắt số liệu trên header dashboard.
 *
 * updatePlatformSummaryUI(currentData, previousData, customDates)
 *   @renders  #spent (span.first + span.last = giá trị + % thay đổi)
 *             #[metric_id] với mọi mid trong SUMMARY_METRICS
 *             .dom_interaction_video_play, .dom_interaction_thruplay,
 *             .dom_interaction_link_click, .dom_interaction_post_engagement,
 *             .dom_interaction_reaction, .dom_interaction_follow
 *
 * ⚠️  fetchPlatformStats() (dòng ~256)
 *     → SAI CHỔ, nên ở: js/api/meta_insights.js
 *
 * @depends   SUMMARY_METRICS, METRIC_REGISTRY, formatMoney, formatNumber,
 *            startDate, endDate, ACCOUNT_ID, META_TOKEN, BASE_URL, fetchJSON
 */
// Cached references to summary metric DOM elements.
// Avoids repeated querySelector calls (2 per metric) on every dashboard update.
const _summaryElsCache = new Map();
function _getSummaryEls(id) {
  let els = _summaryElsCache.get(id);
  // Invalidate if element was removed from DOM
  if (els && !els.value?.isConnected) {
    _summaryElsCache.delete(id);
    els = null;
  }
  if (!els) {
    els = {
      value:  document.querySelector(`#${id} span:first-child`),
      change: document.querySelector(`#${id} span:last-child`),
    };
    if (els.value) _summaryElsCache.set(id, els);
  }
  return els;
}

function updatePlatformSummaryUI(currentData, previousData = [], customDates = null) {
  // Thêm previousData và giá trị mặc định
  // --- Helper function để xử lý một object/array data ---

  const processData = (data) => {
    const insights = Array.isArray(data) ? data[0] || {} : data || {};
    const acts = {};
    (insights.actions || []).forEach(a => acts[a.action_type] = (acts[a.action_type] || 0) + (+a.value || 0));

    // Bổ sung từ các trường action chuyên biệt (video, engagement, v.v.)
    const parseSpecial = (field) => {
      if (!insights[field]) return;
      if (Array.isArray(insights[field])) {
        insights[field].forEach(({ action_type, value }) => {
          acts[action_type] = (acts[action_type] || 0) + (+value || 0);
        });
      } else if (typeof insights[field] === "number" || typeof insights[field] === "string") {
        const base = field.replace("_actions", "");
        acts[base] = (acts[base] || 0) + (+insights[field] || 0);
      }
    };
    ["video_play_actions", "video_thruplay_watched_actions", "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions", "video_p95_watched_actions", "video_p100_watched_actions"].forEach(parseSpecial);

    const getAct = (types) => {
      let s = 0;
      const doneBase = new Set();
      types.forEach(t => {
        const base = t.startsWith("onsite_conversion.") ? t.replace("onsite_conversion.", "") : t;
        if (doneBase.has(base)) return;
        doneBase.add(base);

        const onsite = "onsite_conversion." + base;
        if (acts[onsite]) {
          s += acts[onsite];
        } else if (acts[base]) {
          s += acts[base];
        }
      });
      return s;
    };

    const sumArr = (arr) => {
      if (!arr) return 0;
      if (Array.isArray(arr)) {
        return arr.reduce((acc, a) => acc + (+a.value || 0), 0);
      }
      return +arr.value || 0;
    };

    const res = { spend: +insights.spend || 0 };
    SUMMARY_METRICS.forEach(mid => {
      const meta = METRIC_REGISTRY[mid];
      if (!meta) return;
      if (meta.type === "field") {
        res[mid] = +insights[meta.field_name || mid] || 0;
      } else if (meta.type === "action") {
        res[mid] = getAct([meta.action_type]);
      } else if (meta.type === "special") {
        if (mid === "result") {
          res[mid] = getAct(["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.lead_grouped"]);
        }
      }
    });

    res.reach = +insights.reach || 0;
    res.impressions = +insights.impressions || 0;
    res.video_play = sumArr(insights.video_play_actions) || getAct(["video_play", "video_view"]);
    res.thruplay = sumArr(insights.video_thruplay_watched_actions) || getAct(["thruplay", "video_thruplay_watched_actions"]);
    res.link_click = getAct(["link_click", "inline_link_clicks", "outbound_click"]) || +insights.clicks || 0;
    res.post_engagement = getAct(["post_engagement", "page_engagement", "post_interaction"]);
    res.reaction = getAct(["post_reaction", "reaction", "like"]);
    res.follow = getAct(["page_like", "page_follow", "instagram_profile_follow", "onsite_conversion.page_like", "onsite_conversion.instagram_profile_follow", "like"]);

    return res;
  };

  const aggregateAll = (campArray) => {
    const res = { spend: 0 };
    SUMMARY_METRICS.forEach(mid => res[mid] = 0);

    // Add base metrics
    ["reach", "impressions", "video_play", "thruplay", "link_click", "post_engagement", "reaction", "follow"].forEach(m => res[m] = 0);

    campArray.forEach(c => {
      c.adsets?.forEach(as => {
        const acts = as.actions || [];
        res.spend += (as.spend || 0);
        res.reach += (as.reach || 0);
        res.impressions += (as.impressions || 0);

        SUMMARY_METRICS.forEach(mid => {
          const meta = METRIC_REGISTRY[mid];
          if (!meta) return;
          if (meta.type === "field") {
            res[mid] += (+as[meta.field_name || mid] || 0);
          } else if (meta.type === "action") {
            res[mid] += (window.safeGetActionValue(acts, meta.action_type) || window.safeGetActionValue(acts, "onsite_conversion." + meta.action_type) || 0);
          } else if (mid === "result") {
            res[mid] += (window.safeGetActionValue(acts, "onsite_conversion.messaging_conversation_started_7d") || window.safeGetActionValue(acts, "onsite_conversion.lead_grouped") || 0);
          }
        });

        // Base actions
        res.video_play += (window.safeGetActionValue(acts, "video_play") || 0);
        res.thruplay += (window.safeGetActionValue(acts, "video_thruplay_watched_actions") || 0);
        res.link_click += (window.safeGetActionValue(acts, "link_click") || as.inline_link_clicks || 0);
        res.post_engagement += (window.safeGetActionValue(acts, "post_engagement") || window.safeGetActionValue(acts, "page_engagement") || 0);
        res.reaction += (window.safeGetActionValue(acts, "post_reaction") || window.safeGetActionValue(acts, "reaction") || 0);
        res.follow += (as.follow || window.safeGetActionValue(acts, "page_like") || window.safeGetActionValue(acts, "onsite_conversion.page_like") || 0);
      });
    });
    return res;
  };

  // Ưu tiên dùng currentData từ API (Results của fetchDashboardInsightsBatch)
  // Chỉ fallback aggregateAll nếu currentData rỗng/lỗi
  const currentMetrics = (currentData && (Array.isArray(currentData) ? currentData.length > 0 : !!currentData.spend))
    ? processData(currentData)
    : (window._ALL_CAMPAIGNS && window._ALL_CAMPAIGNS.length > 0
      ? aggregateAll(window._FILTERED_CAMPAIGNS || window._ALL_CAMPAIGNS)
      : processData(currentData)
    );

  const previousMetrics = processData(previousData);

  // --- Helper function tính toán % thay đổi và xác định trạng thái ---
  const calculateChange = (current, previous) => {
    const change = ((current - previous) / previous) * 100;
    let type = "equal";
    let icon = "fa-solid fa-equals";
    let colorClass = "equal";

    if (change > 0) {
      type = "increase";
      icon = "fa-solid fa-caret-up";
      colorClass = "increase";
    } else if (change < 0) {
      type = "decrease";
      icon = "fa-solid fa-caret-down";
      colorClass = "decrease";
    }

    return { percentage: change, type, icon, colorClass };
  };

  // --- Helper function để render một chỉ số và % thay đổi ---
  const renderMetric = (
    id,
    currentValue,
    previousValue,
    isCurrency = false
  ) => {

    const fmtDate = (d) => {
      if (!d) return "??/??";
      const parts = d.split("-");
      return `${parts[2]}/${parts[1]}`;
    };

    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    const durationDays = Math.round((e - s) / 86400000) + 1;

    let dFrom = customDates ? customDates.start : previousData?.[0]?.date_start;
    let dTo = customDates ? customDates.end : previousData?.[0]?.date_stop;

    let compDuration = durationDays;
    if (dFrom && dTo) {
      const cs = new Date(dFrom + "T00:00:00");
      const ce = new Date(dTo + "T00:00:00");
      compDuration = Math.round((ce - cs) / 86400000) + 1;
    }

    let titleText = `${customDates ? 'Kỳ so sánh' : 'Kỳ trước'}: ${isCurrency ? formatMoney(previousValue) : previousValue.toLocaleString("vi-VN")} (${fmtDate(dFrom)} - ${fmtDate(dTo)}) • ${compDuration} ngày`;
    const { value: valueEl, change: changeEl } = _getSummaryEls(id);

    if (!valueEl || !changeEl) {
      console.warn(`Không tìm thấy element cho ID: ${id}`);
      return;
    }

    changeEl.removeAttribute("title");
    changeEl.setAttribute("data-tooltip", titleText);

    // Định dạng giá trị hiện tại
    valueEl.textContent = isCurrency
      ? formatMoney(currentValue)
      : formatNumber(currentValue);

    // Tính toán và hiển thị thay đổi
    const changeInfo = calculateChange(currentValue, previousValue);

    changeEl.textContent = ""; // Xóa nội dung cũ
    changeEl.className = ""; // Xóa class cũ

    let percentageText = "";
    if (changeInfo.type === "new") {
      percentageText = "Mới"; // Hoặc để trống nếu muốn
    } else if (changeInfo.percentage !== null) {
      percentageText = `${changeInfo.percentage >= 0 ? "+" : ""
        }${changeInfo.percentage.toFixed(1)}%`;
    } else {
      percentageText = "N/A"; // Trường hợp cả 2 là 0
    }

    changeEl.appendChild(document.createTextNode(` ${percentageText}`)); // Thêm khoảng trắng

    // Thêm class màu sắc
    changeEl.classList.add(changeInfo.colorClass);
  };

  // --- Render các chỉ số chính với so sánh ---
  renderMetric("spent", currentMetrics.spend, previousMetrics.spend, true);

  SUMMARY_METRICS.forEach(mid => {
    const valCur = currentMetrics[mid] || currentMetrics.actionsObj?.[mid] || 0;
    const valPrev = previousMetrics[mid] || previousMetrics.actionsObj?.[mid] || 0;
    renderMetric(mid, valCur, valPrev, METRIC_REGISTRY[mid]?.format === "money");
  });

  // --- Render các chỉ số phụ (không cần so sánh theo UI mới) ---
  const updateText = (cls, val) => {
    const el = document.querySelector(cls);
    if (el) el.textContent = formatNumber(val);
  };

  updateText(".dom_interaction_video_play", currentMetrics.video_play);
  updateText(".dom_interaction_thruplay", currentMetrics.thruplay);
  updateText(".dom_interaction_link_click", currentMetrics.link_click);
  updateText(".dom_interaction_post_engagement", currentMetrics.post_engagement);
  updateText(".dom_interaction_reaction", currentMetrics.reaction);
  updateText(".dom_interaction_follow", currentMetrics.follow);
}

// --- Các hàm format cũ (giữ nguyên hoặc đảm bảo chúng tồn tại) ---
async function fetchPlatformStats(campaignIds = []) {
  try {
    if (!ACCOUNT_ID) throw new Error("ACCOUNT_ID is required");

    const filtering = campaignIds.length
      ? `&filtering=${encodeURIComponent(
        JSON.stringify([
          { field: "campaign.id", operator: "IN", value: campaignIds },
        ])
      )}`
      : "";
    const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions&time_range={"since":"${startDate}","until":"${endDate}"}${filtering}&access_token=${META_TOKEN}`;

    const data = await fetchJSON(url);

    return data.data || [];
  } catch (err) {
    console.error("❌ Error fetching platform stats:", err);
    return [];
  }
}
