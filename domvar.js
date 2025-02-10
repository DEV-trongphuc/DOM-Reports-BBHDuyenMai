const quick_filter = [
  "Awareness",
  "Engagement",
  "Lead Form",
  "Message",
  "Pagelike",
  "Traffic",
];
const goalMapping = {
  Awareness: ["REACH", "AD_RECALL_LIFT", "IMPRESSIONS"],
  Engagement: ["POST_ENGAGEMENT", "THRUPLAY", "EVENT_RESPONSES"],
  "Lead Form": ["LEAD_GENERATION", "QUALITY_LEAD"],
  Message: ["REPLIES"],
  Pagelike: ["PAGE_LIKES"],
  Traffic: [
    "OFFSITE_CONVERSIONS",
    "LINK_CLICKS",
    "PROFILE_VISIT",
    "LADING_PAGE_VIEWS",
  ],
};


const accessToken =
  "EAAQwS9m6tIABO8ZCZCvO4TtPBXcbilAYn3nwZCZB739B8GtMfy2V2uJmgjHMtvsdKS6XMl7YiBuXqg3BxTdh37H7Vv5qYcsZA7IqVYMLqHX3FhQdxD8fSguISa0sDg1INzOfVtUCt8OoNqh0j6PXvu50rZCgMerGZAJ7NAYgLYuTsPw8NvdOEdF5kRX9C0ctu1ka7CS6VcbbXosWnMM"; // Token của bạn
const adAccountId = "1709508983236012"; // BBH DUYENMAI

let oodo_view = false;
