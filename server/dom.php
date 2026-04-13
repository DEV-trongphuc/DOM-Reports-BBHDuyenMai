<?php
/**
 * DOM AI Report Proxy
 * Proxy server-side để gọi Gemini API — API key không bao giờ lộ ra client.
 * Deploy file này lên: http://automation.ideas.edu.vn/dom.php
 */

// ─── CẤU HÌNH ────────────────────────────────────────────────
$GEMINI_API_KEY = "AIzaSyCt78NC1rK4vFykgwY6jDPb7MXBq-M-_W8";   // ← Điền key thật vào đây
$GEMINI_MODEL = "gemini-2.5-flash";
$GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{$GEMINI_MODEL}:generateContent?key={$GEMINI_API_KEY}";

// Danh sách domain được phép gọi (bảo mật thêm)
$ALLOWED_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
    "http://automation.ideas.edu.vn",
    "https://automation.ideas.edu.vn",
    "https://ampersand-meta-report.vercel.app"
];
// ─────────────────────────────────────────────────────────────

// CORS Headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array(rtrim($origin, '/'), $ALLOWED_ORIGINS) || empty($origin)) {
    header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
} else {
    // Cho phép file:// (local dev)
    if (strpos($origin, 'file://') === 0 || empty($origin)) {
        header("Access-Control-Allow-Origin: *");
    }
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Chỉ nhận POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Đọc body
$body = file_get_contents("php://input");
$data = json_decode($body, true);

if (empty($data['prompt'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing 'prompt' field"]);
    exit;
}

$prompt = trim($data['prompt']);

// Giới hạn độ dài prompt (bảo vệ quota)
if (mb_strlen($prompt) > 80000) {
    http_response_code(400);
    echo json_encode(["error" => "Prompt quá dài"]);
    exit;
}

// Gọi Gemini API
$payload = json_encode([
    "contents" => [
        [
            "role" => "user",
            "parts" => [["text" => $prompt]]
        ]
    ],
    "generationConfig" => [
        "temperature" => 1.5,
        "maxOutputTokens" => 16384,
    ]
]);

$ch = curl_init($GEMINI_ENDPOINT);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
    CURLOPT_TIMEOUT => 120,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(["error" => "Lỗi kết nối tới Gemini: " . $curlError]);
    exit;
}

$result = json_decode($response, true);

// Trả về text sạch cho client (không lộ key trong response)
if ($httpCode === 200 && isset($result['candidates'][0]['content']['parts'][0]['text'])) {
    echo json_encode([
        "text" => $result['candidates'][0]['content']['parts'][0]['text']
    ]);
} else {
    // Trả lỗi nhưng che đi thông tin nhạy cảm
    $errorMsg = $result['error']['message'] ?? "Gemini API error (HTTP {$httpCode})";
    // Xóa API key khỏi message nếu vô tình xuất hiện
    $errorMsg = str_replace($GEMINI_API_KEY, "[HIDDEN]", $errorMsg);
    http_response_code($httpCode ?: 500);
    echo json_encode(["error" => $errorMsg]);
}
