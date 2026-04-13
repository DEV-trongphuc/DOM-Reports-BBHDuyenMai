# DOM META — Báo Cáo Quảng Cáo Meta & Google Ads

> **Tài liệu bàn giao kỹ thuật** — cập nhật: 03/2026

---

## 📌 Tổng Quan

Dashboard phân tích hiệu quả quảng cáo **Meta Ads** (Facebook/Instagram) và **Google Ads** theo thời gian thực.  
Chạy hoàn toàn client-side (HTML + Vanilla JS), không cần backend riêng — tích hợp trực tiếp với Meta Graph API và Google Ads API thông qua **Google Apps Script duy nhất**.

---

## 🚀 Chạy Dự Án

```
Mở file index.html bằng Live Server (VS Code) hoặc bất kỳ HTTP server nào.
Không cần build, không cần npm.
```

> ⚠️ **Bắt buộc dùng HTTP server** (Live Server, http-server...).  
> Mở trực tiếp `file://` sẽ bị CORS block khi gọi API.

---

## 🔑 Cấu Hình Token & Endpoints

### 1. File cấu hình — `lib/token.js`

```js
// Cấu hình tài khoản Meta Ads
window.ACCOUNT_ID      = "act_XXXXXXXXXXXXXX";  // ID tài khoản Meta Ads
window.META_TOKEN      = "EAAxxxxxxxxxxxxx...";   // Access Token Meta Graph API

// URL Apps Script duy nhất (xem mục Google Apps Script bên dưới)
window.SETTINGS_SHEET_URL = "https://script.google.com/macros/s/...../exec";

// Cấu hình Google Ads
window.GOOGLE_ADS_SETUP = true;   // false → ẩn tab Google Ads
```

> ⚠️ File `token.js` **KHÔNG được commit lên git** — đã có trong `.gitignore`.  
> Tham khảo `lib/token.example.js` để tạo file mới.

### 2. Lấy Meta Access Token

1. Vào [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer/)
2. Chọn app → **User Token**
3. Permissions cần thiết:
   - `ads_read` *(bắt buộc)*
   - `ads_management` *(cần cho Activity Log)*
4. Click **Generate Access Token** → paste vào `token.js`

> Token User hết hạn sau **60 ngày**. Dùng **System User Token** trong Business Manager nếu cần lâu dài.

### 3. API Version Meta

Khai báo trong `js/api/constants.js`:
```js
const API_VERSION = "v24.0";
```

---

## 🗂️ Cấu Trúc Project

```
DOM-META/
├── index.html                  ← Entry point duy nhất
├── css/
│   └── main.css                ← Toàn bộ styles
├── lib/
│   ├── token.js                ← ⭐ Cấu hình token (KHÔNG commit)
│   ├── token.example.js        ← Template token
│   └── auth.js                 ← Google Login + everyone_view
├── js/
│   ├── core/
│   │   ├── config.js           ← METRIC_REGISTRY, GOOGLE_SHEET_API_URL, global vars
│   │   ├── constants.js        ← API config, goal mapping, cache
│   │   ├── chart_theme.js      ← ⭐ Tất cả màu sắc chart (CHART_*, UI_*)
│   │   ├── dashboard.js        ← Điều phối load data chính
│   │   ├── startup.js          ← Bootstrap app
│   │   ├── listeners.js        ← Event listeners toàn cục
│   │   ├── utils.js            ← Format, helper functions
│   │   ├── metric_config.js    ← Cấu hình cột hiển thị
│   │   ├── column_config.js    ← Lưu/đọc column config localStorage
│   │   └── preset_view.js      ← Quản lý View Presets
│   ├── api/
│   │   ├── fetch.js            ← fetchJSON, batch, cache layer
│   │   ├── meta_insights.js    ← Meta Graph API (insights, breakdowns)
│   │   ├── account.js          ← Thông tin tài khoản, avatar
│   │   └── google_ads.js       ← Google Ads UI + charts (đọc từ Sheets)
│   ├── data/
│   │   ├── helpers.js          ← getResults(), formatMoney()...
│   │   ├── group.js            ← Gom nhóm campaign/adset/ad
│   │   ├── year_data.js        ← Fetch dữ liệu theo năm
│   │   └── year_filter.js      ← Filter theo năm
│   ├── charts/
│   │   ├── goal_chart.js       ← Biểu đồ mục tiêu campaign
│   │   ├── monthly_chart.js    ← Biểu đồ chi tiêu theo tháng
│   │   ├── region_chart.js     ← Biểu đồ vùng địa lý
│   │   ├── platform_chart.js   ← Fetch & render platform breakdown
│   │   ├── platform_position.js← UI platform + donut chart
│   │   ├── age_gender_chart.js ← Date picker age/gender
│   │   ├── render_age_gender.js← Render biểu đồ tuổi/giới tính
│   │   ├── daily_filter.js     ← Filter theo ngày (detail view)
│   │   ├── detail_daily.js     ← Charts chi tiết (hourly, device, region, age)
│   │   └── dashboard_charts.js ← Điều phối tất cả dashboard charts
│   ├── ui/
│   │   ├── render_campaign.js  ← Render danh sách campaign/adset/ad
│   │   ├── extra_details.js    ← Chi tiết mở rộng (panel phụ)
│   │   ├── performance_detail.js← So sánh hiệu suất
│   │   ├── platform_summary.js ← Tóm tắt platform UI cards
│   │   ├── ad_detail_modal.js  ← Modal chi tiết quảng cáo
│   │   ├── adset_modal.js      ← Modal chi tiết adset
│   │   ├── ai_modal_setup.js   ← Setup AI chat modal
│   │   ├── ai_report.js        ← AI analysis & lưu report
│   │   ├── year_dropdown.js    ← Dropdown chọn năm + ad detail UI
│   │   └── selection_bar.js    ← Thanh chọn nhanh
│   ├── filters/
│   │   ├── campaign_filter.js  ← Lọc campaign theo tên/ID
│   │   └── quick_filter.js     ← Bộ lọc nhanh (status, goal...)
│   ├── settings/
│   │   ├── brand_settings.js   ← Brand Groups + Activity Log + shortcuts
│   │   ├── goal_settings.js    ← Goal Keywords config
│   │   └── perf_brand_ui.js    ← UI so sánh hiệu suất brand
│   ├── export/
│   │   └── export_csv.js       ← Xuất CSV
│   └── share/
│       └── share.js            ← Chia sẻ URL (date + brand filter)
├── server/
│   ├── main.gs                 ← ⭐ Google Apps Script duy nhất (deploy làm Web App)
    └── dom.php                 ← (Proxy chạy GEMINI AI)
```

---

## 🔄 Google Apps Script — `server/main.gs`

### Tại sao dùng Apps Script?

Apps Script đóng vai trò **middleware duy nhất**:
- **Đồng bộ Google Ads data** từ Google Ads API → Google Sheets → Dashboard đọc
- **Lưu/đọc Settings** (Brand Groups, Column config, Goal Keywords, View Presets)
- **Lưu/đọc AI Reports** history
- **Cấp quyền Google Ads API** (OAuth qua `ScriptApp.getOAuthToken()`)

### Sheets trong cùng 1 Spreadsheet

| Sheet | Mục đích |
|---|---|
| `DATA` | Google Ads performance rows (tự động sync) |
| `SETTINGS` | Key-value config (brand, columns, goals, presets) |
| `AI_REPORTS` | Lịch sử báo cáo AI (tối đa 30 entries) |
| `Version` | Log lần sync gần nhất |

### Deploy Apps Script

1. Vào [script.google.com](https://script.google.com) → tạo project mới
2. Copy toàn bộ `server/main.gs` vào editor
3. Thêm scope vào **Project Settings → appsscript.json**:
   ```json
   {
     "oauthScopes": [
       "https://www.googleapis.com/auth/adwords",
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/script.external_request"
     ]
   }
   ```
4. **Deploy → New deployment**:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone** (không cần đăng nhập)
5. Copy **Web App URL** → paste vào `window.SETTINGS_SHEET_URL` trong `lib/token.js`
6. Lần đầu deploy: chạy `createDailyTrigger()` để bật auto-sync Google Ads lúc  6-7h sáng hàng ngày


### Cập nhật Spreadsheet ID

Sửa trong `server/main.gs`:
```js
const CONFIG = {
  SPREADSHEET_ID: "1sAEE2_5jVR6UF59C3...",  // ← ID Google Sheet của bạn
  CUSTOMER_ID:    "466-215-2707",            // Google Ads Customer ID
  ...
};
```

### API Routing của Apps Script

```
── GET ────────────────────────────────────────────────────────
?sheet=settings              → Đọc tất cả key/value settings
?sheet=settings&key=X        → Đọc 1 key
?sheet=ai_reports            → Danh sách AI reports (mới nhất trước)
?action=sync                 → Trigger đồng bộ Google Ads ngay lập tức
?type=keywords&campaignId=X&since=Y&until=Z  → Từ khóa on-demand
(default, hoặc ?sheet=ads_data)→ Google Ads performance data

── POST ───────────────────────────────────────────────────────
{ sheet:"settings", key, value }              → Lưu 1 setting
{ sheet:"settings", settings:{} }            → Lưu nhiều settings
{ sheet:"ai_reports", action:"save", report:{} }  → Lưu AI report
{ sheet:"ai_reports", action:"delete", id }       → Xóa AI report
{ action:"sync" }                             → Trigger sync Ads
```

---

## ⚙️ Các Chức Năng Chính

### 📊 Dashboard Tổng Quan
- **KPI Cards**: Spend, Result, CPR, CPM, Reach, Frequency, Impression — so sánh kỳ trước
- **Biểu đồ tháng** — chi tiêu, impressions, result theo từng tháng
- **Goal Chart** — phân bổ spend theo loại campaign
- **Platform breakdown** — Facebook vs Instagram vs Other (donut)
- **Platform Position** — top placement

### 📋 Campaign / AdSet / Ad
- Mở rộng/thu gọn theo cấp bậc (Campaign → AdSet → Ad)
- **Dynamic columns** — chọn cột, lưu làm View Preset
- **Sắp xếp** theo metric, **Quick filter** theo status/goal/brand
- **Custom Metrics** — tạo công thức tính riêng (VD: `spend / lead`)

### 🔍 Chi Tiết Mở Rộng
- Biểu đồ theo **giờ**, **thiết bị**, **vùng địa lý**, **độ tuổi & giới tính**
- **Video Funnel** — 3s View → 25% → 50% → 75% → ThruPlay → 100%
- **Schedule Intelligence** — gợi ý khung giờ hiệu quả

### 📅 Bộ Lọc Thời Gian
- Date picker tự do + quick range (Hôm nay / 7d / 30d / Tháng này / Tháng trước)
- Filter theo **năm**, **brand**
- **Phím tắt**: `Cmd/Ctrl + 1~5` cho quick range, `Cmd/Ctrl + Arrow` ±7 ngày

### 🏷️ Brand Settings
- Tạo/sửa/xóa **Brand Groups** (nhóm campaign theo từ khóa)
- Đồng bộ lên Google Sheets tự động

### 🤖 AI Report
- Phân tích dữ liệu bằng AI (Gemini)
- Lưu/đọc lịch sử report từ Google Sheets, export HTML

### 📊 Google Ads Tab
- Đọc dữ liệu từ Google Sheets (Apps Script tự động sync qua Google Ads API)
- Breakdown: Campaign, Device, Channel, Location, Distance, Hourly
- Keyword on-demand (fetch trực tiếp từ Google Ads API qua Apps Script)

### 🔒 Quản lý Quyền Truy Cập (`lib/auth.js`)
- **Google Login** bắt buộc mặc định
- **`everyone_view = true`** trong SETTINGS sheet → bypass auth (ai cũng xem được)
- Bật/tắt từ giao diện Settings hoặc trực tiếp trong Google Sheets

---

## ⚠️ Lưu Ý Quan Trọng

### Token & Xác thực
- `token.js` → **KHÔNG commit lên git**
- Token User hết hạn sau **60 ngày** → phải lấy lại từ Graph Explorer
- Activity Log cần token có quyền `ads_management`

### Apps Script
- Sửa `.gs` → **New Deployment** (không phải update version cũ)
- Web App URL **cố định theo deployment** — tạo deployment mới phải update URL trong `token.js`
- Sau deploy mới có thể mất ~5 phút để cache cũ hết hiệu lực

### CORS & Local
- Chạy qua Live Server — **không mở `file://` trực tiếp**
- Meta API: dùng `127.0.0.1` thay vì `localhost` nếu bị block

### Dọn duplicate Settings
Nếu SETTINGS sheet có key trùng (sau khi migrate Spreadsheet mới):  
Chạy function `deduplicateSettings()` trong Apps Script editor một lần.

---

## 🎨 Màu Sắc & Theme

Tất cả màu tập trung trong **`js/core/chart_theme.js`**:

| Nhóm | Constants | Dùng ở đâu |
|---|---|---|
| Gold (Brand) | `CHART_GOLD`, `CHART_GOLD_HEX` | Bar/line charts chính |
| Navy (Secondary) | `CHART_NAVY`, `CHART_NAVY_HEX` | Bar result, line chart |
| Gray | `CHART_GRAY_TOP`, `CHART_GRAY_HEX` | Bar inactive |
| Grid | `CHART_GRID_COLOR`, `CHART_TICK_*` | Trục chart |
| Platform | `CHART_FACEBOOK`, `CHART_INSTAGRAM` | Donut platform |
| UI Amber | `UI_AMBER`, `UI_AMBER_BG` | Buttons, borders active |
| UI Danger/Success | `UI_DANGER`, `UI_SUCCESS` | Trend colors |

**Đổi màu brand:** chỉ cần sửa `CHART_GOLD` và `CHART_GOLD_HEX` trong `chart_theme.js`.

---

## 📦 Dependencies

| Thư viện | Nguồn | Mục đích |
|---|---|---|
| Chart.js | CDN | Render tất cả biểu đồ |
| chartjs-plugin-datalabels | CDN | Value label trên chart |
| Font Awesome 6 | CDN | Icons |
| Google Fonts (Inter) | CDN | Typography |

---

## 🗺️ Thứ Tự Load Script (index.html)

```
1. core/   config → metric_config → column_config → preset_view → utils → chart_theme
2. api/    constants → fetch → account → meta_insights → google_ads
3. data/   helpers → group → year_data → year_filter
4. charts/ goal → monthly → region → platform_chart → platform_position
           → age_gender → render_age_gender → daily_filter → detail_daily → dashboard_charts
5. ui/     render_campaign → extra_details → performance_detail → platform_summary
           → ad_detail_modal → adset_modal → ai_modal_setup → ai_report
           → year_dropdown → selection_bar
6. filters/ campaign_filter → quick_filter
7. settings/ brand_settings → goal_settings → perf_brand_ui
8. export/ → share/
9. App:    dashboard → startup → listeners
10. lib/   auth.js → token.js  ← CUỐI CÙNG (override config)
```

---

## 🛠️ Quy Ước Code

- **No bundler, no framework** — Vanilla JS thuần
- Functions là **global scope** (window object)
- Global state: `window.*` hoặc `let` top-level
- Chart instances: `window.<name>_instance`
- Constants: `UPPERCASE`, state variables: `camelCase`
- Màu sắc: `CHART_*` hoặc `UI_*` trong `chart_theme.js`
- API URL: khai báo trong `js/core/config.js` (lấy từ `window.SETTINGS_SHEET_URL`)
- `console.log` dùng để debug — đã xóa trong production build; chỉ giữ `console.warn/error`
