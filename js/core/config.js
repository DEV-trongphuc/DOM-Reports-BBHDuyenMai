// URL lấy từ lib/token.js (window.SETTINGS_SHEET_URL) — không hardcode ở đây
const GOOGLE_SHEET_API_URL = window.SETTINGS_SHEET_URL || "";

let monthlyChartInstance = null;
let startDate, endDate;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

window.safeGetActionValue = (actions, type) => {
  if (!Array.isArray(actions) || !actions.length) return 0;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a.action_type === type) return +a.value || 0;
  }
  return 0;
};

// =================== METRIC REGISTRY ===================
const METRIC_REGISTRY = {
  spend:              { id: "spend",              label: "Spent",            icon: "fa-solid fa-circle-dollar-to-slot",  type: "field",   format: "money" },
  reach:              { id: "reach",              label: "Reach",            icon: "fa-solid fa-street-view",            type: "field",   format: "number" },
  impressions:        { id: "impressions",        label: "Impressions",      icon: "fa-solid fa-eye",                    type: "field",   format: "number" },
  frequency:          { id: "frequency",          label: "Frequency",        icon: "fa-solid fa-wave-square",            type: "special", format: "decimal" },
  cpm:                { id: "cpm",                label: "CPM",              icon: "fa-solid fa-receipt",                type: "special", format: "money" },
  cpc:                { id: "cpc",                label: "CPC",              icon: "fa-solid fa-mouse-pointer",          type: "field",   format: "money" },
  ctr:                { id: "ctr",                label: "CTR",              icon: "fa-solid fa-percent",                type: "special", format: "percent" },
  result:             { id: "result",             label: "Result",           icon: "fa-solid fa-square-poll-vertical",   type: "special", format: "number" },
  cpr:                { id: "cpr",                label: "CPR",              icon: "fa-solid fa-tags",                   type: "special", format: "money" },
  reaction:           { id: "reaction",           label: "Reactions",        icon: "fa-solid fa-thumbs-up",              type: "action",  action_type: "post_reaction",                                format: "number" },
  comment:            { id: "comment",            label: "Comments",         icon: "fa-solid fa-comment",                type: "action",  action_type: "comment",                                      format: "number" },
  share:              { id: "share",              label: "Shares",           icon: "fa-solid fa-share-nodes",            type: "action",  action_type: "post",                                         format: "number" },
  link_click:         { id: "link_click",         label: "Link Clicks",      icon: "fa-solid fa-link",                   type: "action",  action_type: "link_click",                                   format: "number" },
  message_started:    { id: "message_started",    label: "Mess. Started",    icon: "fa-brands fa-facebook-messenger",    type: "action",  action_type: "onsite_conversion.messaging_conversation_started_7d", format: "number" },
  message_connection: { id: "message_connection", label: "Mess. Connection", icon: "fa-solid fa-comments",               type: "action",  action_type: "onsite_conversion.total_messaging_connection", format: "number" },
  purchase:           { id: "purchase",           label: "Purchases",        icon: "fa-solid fa-cart-shopping",          type: "action",  action_type: "purchase",                                     format: "number" },
  roas:               { id: "roas",               label: "ROAS (Purchase)",  icon: "fa-solid fa-money-bill-trend-up",    type: "action",  action_type: "purchase_roas",                                format: "decimal" },
  page_engagement:    { id: "page_engagement",    label: "Page Engaged",     icon: "fa-solid fa-hand-pointer",           type: "action",  action_type: "page_engagement",                              format: "number" },
  post_engagement:    { id: "post_engagement",    label: "Post Engagement",  icon: "fa-solid fa-plus-square",            type: "action",  action_type: "post_engagement",                              format: "number" },
  video_play:         { id: "video_play",         label: "Video Plays",      icon: "fa-solid fa-play",                   type: "action",  action_type: "video_play",       field_name: "video_play_actions",                format: "number" },
  video_view:         { id: "video_view",         label: "Video View (3s)",  icon: "fa-solid fa-video",                  type: "action",  action_type: "video_view",                                   format: "number" },
  thruplay:           { id: "thruplay",           label: "ThruPlays",        icon: "fa-solid fa-forward",                type: "action",  action_type: "video_thruplay_watched_actions", field_name: "video_thruplay_watched_actions", format: "number" },
  video_p25:          { id: "video_p25",          label: "Video 25%",        icon: "fa-solid fa-hourglass-start",        type: "action",  action_type: "video_p25_watched_actions",  field_name: "video_p25_watched_actions",  format: "number" },
  video_p50:          { id: "video_p50",          label: "Video 50%",        icon: "fa-solid fa-hourglass-half",         type: "action",  action_type: "video_p50_watched_actions",  field_name: "video_p50_watched_actions",  format: "number" },
  video_p75:          { id: "video_p75",          label: "Video 75%",        icon: "fa-solid fa-hourglass-end",          type: "action",  action_type: "video_p75_watched_actions",  field_name: "video_p75_watched_actions",  format: "number" },
  video_p95:          { id: "video_p95",          label: "Video 95%",        icon: "fa-solid fa-clock",                  type: "action",  action_type: "video_p95_watched_actions",  field_name: "video_p95_watched_actions",  format: "number" },
  video_p100:         { id: "video_p100",         label: "Video 100%",       icon: "fa-solid fa-circle-check",           type: "action",  action_type: "video_p100_watched_actions", field_name: "video_p100_watched_actions", format: "number" },
  photo_view:         { id: "photo_view",         label: "Photo View",       icon: "fa-solid fa-image",                  type: "action",  action_type: "photo_view",                                   format: "number" },
  lead:               { id: "lead",               label: "Leads",            icon: "fa-solid fa-bullseye",               type: "action",  action_type: "onsite_conversion.lead_grouped",               format: "number" },
  follow:             { id: "follow",             label: "Follows",          icon: "fa-solid fa-user-plus",              type: "action",  action_type: "page_like",                                    format: "number" },
  like:               { id: "like",               label: "Likes",            icon: "fa-solid fa-heart",                  type: "action",  action_type: "post_net_like",                                format: "number" },
  save:               { id: "save",               label: "Saves",            icon: "fa-solid fa-bookmark",               type: "action",  action_type: "onsite_conversion.post_save",                  format: "number" },
};
