
// ============================================================
//  TEMPLATE — Sao chép file này thành lib/token.js
//  lib/token.js đã được thêm vào .gitignore, KHÔNG commit lên GitHub
// ============================================================

// [BẮT BUỘC] Meta Access Token
// Lấy tại: https://developers.facebook.com/apps → Marketing API → Tools
// Cần quyền: ads_management, ads_read, read_insights
const META_TOKEN_STATIC = "";   // <-- dán token vào đây

// [BẮT BUỘC] Meta Ad Account ID (không có tiền tố "act_")
let ACCOUNT_ID = "";            // VD: "676599667843841"

// [TÙY CHỌN] Chỉ hiển thị các account này trong dropdown
window.ALLOWED_ACCOUNTS = [
  // "676599667843841",
];

// [TÙY CHỌN] Google OAuth Client ID
// Lấy tại: https://console.cloud.google.com/apis/credentials
window.GOOGLE_CLIENT_ID = "";

// [TÙY CHỌN] URL của Google Apps Script (Settings Sync)
// Deploy Apps Script → lấy Deployment URL dạng: https://script.google.com/macros/s/.../exec
window.SETTINGS_SHEET_URL = "";

// [TÙY CHỌN] Bật/tắt tích hợp Google Ads
window.GOOGLE_ADS_SETUP = false;

// ── Phần còn lại giữ nguyên — không sửa ────────────────────────
let META_TOKEN = META_TOKEN_STATIC;
// ... (copy toàn bộ nội dung token.js bên dưới đây)
