// =================== DATE PICKER STATE ===================
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let tempStartDate = null;
let tempEndDate = null;
let VIEW_GOAL;

// =================== CACHE ===================
const CACHE = new Map();
const CACHE_TTL = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
function clearFetchCache() { CACHE.clear(); CACHE_TTL.clear(); }

// =================== FILTER STATE ===================
let DAILY_DATA = [];
let CURRENT_CAMPAIGN_FILTER = "";
let GOAL_CHART_MODE = "keyword";
let GOAL_KEYWORDS = ["Reach", "Engagement", "View", "Message", "Traffic", "Lead"];

try {
  const saved = localStorage.getItem("goal_keywords");
  if (saved) GOAL_KEYWORDS = JSON.parse(saved);

  const savedMode = localStorage.getItem("goal_chart_mode");
  if (savedMode) GOAL_CHART_MODE = savedMode;
} catch (e) {
  console.warn("Lỗi load settings:", e);
}

document.addEventListener("DOMContentLoaded", () => {
  const modeLabel = document.getElementById("goal_mode_label");
  if (modeLabel) modeLabel.textContent = GOAL_CHART_MODE === "brand" ? "Keyword" : "Brand";
});

// =================== API CONFIG ===================
const BATCH_SIZE = 50;        // Meta Batch API max = 50 → ít roundtrips hơn
const CONCURRENCY_LIMIT = 5;  // Giảm từ 10 → 5 để tránh rate-limit khi batch lớn hơn
const API_VERSION = "v24.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// =================== GOAL MAPPINGS ===================
const goalMapping = {
  "Lead Form": ["LEAD_GENERATION", "QUALITY_LEAD"],
  Awareness:   ["REACH", "AD_RECALL_LIFT", "IMPRESSIONS"],
  Engagement:  ["POST_ENGAGEMENT", "THRUPLAY", "EVENT_RESPONSES"],
  Message:     ["REPLIES"],
  Traffic:     ["OFFSITE_CONVERSIONS", "LINK_CLICKS", "PROFILE_VISIT", "LANDING_PAGE_VIEWS"],
  Pagelike:    ["PAGE_LIKES"],
};

const resultMapping = {
  REACH:           "reach",
  LEAD_GENERATION: "onsite_conversion.lead_grouped",
  QUALITY_LEAD:    "onsite_conversion.lead_grouped",
  THRUPLAY:        "video_thruplay_watched_actions",
  POST_ENGAGEMENT: "post_engagement",
  PROFILE_VISIT:   "link_click",
  LINK_CLICKS:     "link_click",
  LANDING_PAGE_VIEWS: "link_click",
  REPLIES:         "onsite_conversion.messaging_conversation_started_7d",
  IMPRESSIONS:     "impressions",
  PAGE_LIKES:      "page_like",
  DEFAULT:         "reach",
};

const campaignIconMapping = {
  "Lead Form": "fa-solid fa-bullseye",
  Awareness:   "fa-solid fa-eye",
  Engagement:  "fa-solid fa-star",
  Message:     "fa-solid fa-comments",
  Traffic:     "fa-solid fa-mouse-pointer",
  Pagelike:    "fa-solid fa-thumbs-up",
  DEFAULT:     "fa-solid fa-crosshairs",
};

// Reverse lookup: { "LEAD_GENERATION": "Lead Form", "REACH": "Awareness", ... }
const GOAL_GROUP_LOOKUP = Object.create(null);
for (const group in goalMapping) {
  for (const goal of goalMapping[group]) {
    GOAL_GROUP_LOOKUP[goal] = group;
  }
}

// O(1) reverse lookup: action_type → label (built from METRIC_REGISTRY after it is defined)
// Populated in config.js after METRIC_REGISTRY is available.
let ACTION_TYPE_LABEL_MAP = null;
function getActionTypeLabel(type) {
  if (!ACTION_TYPE_LABEL_MAP) {
    ACTION_TYPE_LABEL_MAP = new Map(
      Object.values(METRIC_REGISTRY)
        .filter((m) => m.action_type)
        .map((m) => [m.action_type, m.label])
    );
  }
  return ACTION_TYPE_LABEL_MAP.get(type) || null;
}

// O(1) lookup: goal group key → primary result type
const GOAL_KEY_RESULT_MAP = Object.create(null);
for (const group in goalMapping) {
  const primaryGoal = goalMapping[group][0];
  GOAL_KEY_RESULT_MAP[group] = resultMapping[primaryGoal] || resultMapping.DEFAULT;
}

function getCampaignIcon(optimizationGoal) {
  if (!optimizationGoal) return campaignIconMapping.DEFAULT;
  const goalGroup = GOAL_GROUP_LOOKUP[optimizationGoal];
  return campaignIconMapping[goalGroup] || campaignIconMapping.DEFAULT;
}

