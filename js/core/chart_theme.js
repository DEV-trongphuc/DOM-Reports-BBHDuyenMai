// ══════════════════════════════════════════════════════════
//  CHART THEME — Tất cả màu sắc chart tập trung tại đây
//  Thay đổi tại đây = toàn bộ chart đổi màu
// ══════════════════════════════════════════════════════════

// ── Gold / Brand (màu chủ đạo) ──────────────────────────
const CHART_GOLD = "rgba(255,169,0,1)";
const CHART_GOLD_MID = "rgba(255,169,0,0.4)";
const CHART_GOLD_SOFT = "rgba(255,169,0,0.15)";
const CHART_GOLD_BG = "rgba(255,169,0,0.05)";
const CHART_GOLD_HEX = "#FFA900";
const CHART_GOLD_DARK = "#ffab00";
const CHART_GOLD_LINE = "rgba(255,171,0,1)";      // daily chart line
const CHART_GOLD_FILL = "rgba(255,171,0,0.05)";   // daily chart area fill

// ── Navy / Secondary (daily chart line 2) ───────────────
const CHART_NAVY = "rgba(38,42,83,1)";
const CHART_NAVY_MID = "rgba(38,42,83,0.45)";
const CHART_NAVY_SOFT = "rgba(38,42,83,0.2)";
const CHART_NAVY_BG = "rgba(38,42,83,0.05)";
const CHART_NAVY_FILL = "rgba(38,42,83,0.05)";    // area fill
const CHART_NAVY_HEX = "#262a53";

// ── Gray (bars inactive, gradients) ─────────────────────
const CHART_GRAY_TOP = "rgba(210,210,210,0.9)";
const CHART_GRAY_BOT = "rgba(160,160,160,0.4)";
const CHART_GRAY_SOLID = "rgba(210,210,210,1)";
const CHART_GRAY_BOT2 = "rgba(160,160,160,0.6)";   // age/gender variant
const CHART_GRAY_HEX = "#E0E0E0";
const CHART_GRAY_HOVER = "#D0D0D0";

// ── Grid & Ticks (dùng chung mọi chart) ─────────────────
const CHART_GRID_COLOR = "rgba(0,0,0,0.03)";
const CHART_GRID_BORDER = "rgba(0,0,0,0.05)";
const CHART_GRID_DARK = "rgba(0,0,0,0.045)";
const CHART_TICK_DARK = "#444";
const CHART_TICK_MID = "#555";
const CHART_TICK_LIGHT = "#666";
const CHART_TICK_TEXT = "#333";

// ── Platform Colors (pie/doughnut) ──────────────────────
const CHART_FACEBOOK = "rgba(255,169,0,0.9)";     // vàng cho Meta/FB
const CHART_INSTAGRAM = "rgba(0,30,165,0.9)";
const CHART_OTHER_PLAT = "rgba(200,200,200,0.8)";

// ── Positive / Negative (line charts, trend) ─────────────
const CHART_POSITIVE = "rgb(2,116,27)";
const CHART_NEGATIVE = "rgb(215,0,0)";
const CHART_WARN = "rgb(226,151,0)";

// ── Helper: tạo gradient Gold (dùng trong canvas) ────────
function makeGoldGradient(ctx, height = 300) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, CHART_GOLD);
  g.addColorStop(1, CHART_GOLD_MID);
  return g;
}

// ── Helper: tạo gradient Gray (dùng trong canvas) ────────
function makeGrayGradient(ctx, height = 300) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, CHART_GRAY_TOP);
  g.addColorStop(1, CHART_GRAY_BOT);
  return g;
}

// ── Shared chart options: scale defaults ─────────────────
const CHART_SCALE_X = {
  grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
  ticks: { color: CHART_TICK_LIGHT, font: { weight: "600", size: 8.5 }, autoSkip: false, maxRotation: 45, minRotation: 0 },
};

const CHART_SCALE_Y_HIDDEN = {
  beginAtZero: true,
  grid: { color: CHART_GRID_COLOR, drawBorder: true, borderColor: CHART_GRID_BORDER },
  ticks: { display: false },
};

// ── UI / Component Colors (dùng trong settings, HTML templates) ─────────
const UI_AMBER = "#f59e0b";           // màu vàng amber brand
const UI_AMBER_BORDER = "#fde68a";           // border vàng nhạt
const UI_AMBER_BG = "#fffbeb";           // nền vàng cực nhạt
const UI_AMBER_SOFT = "rgba(245,158,11,0.1)";  // nền highlight
const UI_AMBER_HOVER = "rgba(245,158,11,0.12)";  // hover highlight
const UI_ICON_COLOR = "#94a3b8";           // icon xám trung tính
const UI_ICON_BG = "#f1f5f9";           // nền icon
const UI_BORDER = "#e2e8f0";           // đường kẻ chung
const UI_MUTED = "#64748b";           // text muted
const UI_DANGER = "#ef4444";           // màu đỏ xóa/lỗi
const UI_DANGER_BG = "#fee2e2";           // nền đỏ nhạt
const UI_WHITE = "#fff";              // trắng
const UI_SUCCESS = "#10b981";           // màu xanh trend tăng
