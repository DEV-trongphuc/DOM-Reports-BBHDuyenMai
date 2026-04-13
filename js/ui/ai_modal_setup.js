function setupAIReportModal() {
  const openButton = document.querySelector(".ai_report_compare");
  const reportContainer = document.querySelector(".dom_ai_report");
  if (!openButton || !reportContainer) {
    console.warn("Không tìm thấy các phần tử AI Report.");
    return;
  }

  // ── Close: hỗ trợ cả nút mới (ai_report_btn_close) và cũ (dom_ai_report_close)
  const closeHandler = () => {
    reportContainer.classList.add("closing");
    setTimeout(() => {
      reportContainer.classList.remove("active", "closing");
      const contentEl = reportContainer.querySelector(".dom_ai_report_content");
      if (contentEl) contentEl.innerHTML = "";
    }, 400);
  };

  const newCloseBtn = document.getElementById("ai_report_close_btn");
  const oldCloseBtn = reportContainer.querySelector(".dom_ai_report_close");
  if (newCloseBtn) newCloseBtn.addEventListener("click", closeHandler);
  if (oldCloseBtn) oldCloseBtn.addEventListener("click", closeHandler);

  // ── Open
  openButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Cập nhật subtitle
    const adNameEl = document.querySelector(".dom_detail_id > span:first-child");
    const adName = adNameEl ? adNameEl.textContent.trim() : "";
    const dateEl = document.querySelector(".dom_date");
    const dateText = dateEl ? dateEl.textContent.trim() : "";
    const subtitleEl = document.getElementById("ai_report_subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = adName ? `${adName} · ${dateText}` : dateText;
    }

    // ① Kích hoạt animation màu NGAY LẬP TỨC
    const overlay = document.querySelector(".dom_overlay_ai");
    if (overlay) {
      overlay.classList.remove("ai_scanning"); // reset nếu đang chạy
      void overlay.offsetWidth;               // force reflow để restart animation
      overlay.classList.add("ai_scanning");
    }

    // ② Chạy phân tích data ngầm (không cần chờ)
    if (typeof runDeepReport === "function") {
      runDeepReport();
    } else {
      const contentEl = reportContainer.querySelector(".dom_ai_report_content");
      if (contentEl) contentEl.innerHTML = '<p style="color:#e17055;padding:20px;">Lỗi: Không tìm thấy hàm runDeepReport().</p>';
    }

    // ③ Sau đúng 3s (animation màu xong) → trượt panel ra
    reportContainer.classList.remove("closing");
    setTimeout(() => {
      if (overlay) overlay.classList.remove("ai_scanning");
      reportContainer.classList.add("active");
    }, 2800);
  });

  // ── DOCX Export
  const exportBtn = document.getElementById("btn_export_docx");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportAIReportToDocx);
  }
}

// ── Export AI Report → DOCX (dùng html-docx-js CDN)
function exportAIReportToDocx() {
  const contentEl = document.querySelector(".dom_ai_report_content");
  if (!contentEl || !contentEl.innerHTML.trim()) {
    if (typeof domAlert === 'function') domAlert("Chưa có nội dung báo cáo để xuất!");
    return;
  }

  // Lấy tên ad + date
  const subtitleEl = document.getElementById("ai_report_subtitle");
  const fileName = `DOM_AI_Report_${(subtitleEl?.textContent || 'report').replace(/[·\/\s:]/g, '_')}.docx`;

  // Nếu html-docx-js đã load → dùng luôn
  if (window.htmlDocx) {
    _doDocxExport(contentEl.innerHTML, fileName);
    return;
  }

  // Lazy load html-docx-js từ CDN
  const exportBtn = document.getElementById("btn_export_docx");
  if (exportBtn) { exportBtn.disabled = true; exportBtn.querySelector("span").textContent = "Đang chuẩn bị..."; }

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/html-docx-js/dist/html-docx.js";
  script.onload = () => {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.querySelector("span").textContent = "Xuất DOCX"; }
    _doDocxExport(contentEl.innerHTML, fileName);
  };
  script.onerror = () => {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.querySelector("span").textContent = "Xuất DOCX"; }
    if (typeof domAlert === 'function') domAlert("❌ Không thể tải thư viện DOCX. Kiểm tra kết nối mạng.");
  };
  document.head.appendChild(script);
}

function _doDocxExport(innerHtml, fileName) {
  try {
    const adName = document.getElementById("ai_report_subtitle")?.textContent || '';
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const fullHtml = `
      <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; line-height: 1.6; margin: 24px; }
          h2 { font-size: 16pt; color: #222; border-bottom: 1px solid #999; padding-bottom: 8px; margin: 0 0 6px; }
          p.meta { font-size: 9pt; color: #777; margin: 0 0 20px; }
          h4 { font-size: 13pt; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 20px 0 10px; }
          h5 { font-size: 11pt; color: #333; border-left: 3px solid #999; padding-left: 8px; margin: 14px 0 6px; background: none; }
          h6 { font-size: 9pt; color: #777; text-transform: uppercase; margin: 10px 0 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
          th { background-color: #444; color: #fff; padding: 7px 9px; text-align: left; }
          td { border: 1px solid #ddd; padding: 6px 9px; color: #333; }
          tr:nth-child(even) td { background-color: #f5f5f5; }
          .kpi_item { display: inline-block; border: 1px solid #ddd; padding: 6px 12px; margin: 3px; font-size: 10pt; }
          li { margin-bottom: 6px; }
          .recommendation-action { color: #555; font-style: italic; }
          .timestamp { color: #aaa; font-size: 8pt; }
          .no-result-note { color: #aaa; font-style: italic; }
          /* Ẩn các element không cần */
          .fade_in_item:not(.show) { opacity: 1 !important; transform: none !important; }
          i.fa-solid, i.fa-regular { display: none; }
        </style>
      </head><body>
        <h2>DOM AI REPORT</h2>
        <p class="meta">${adName} · Xuất ngày ${dateStr}</p>
        ${innerHtml}
      </body></html>`;

    const blob = window.htmlDocx.asBlob(fullHtml, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 720 } });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast(`✅ Đã xuất: ${fileName}`);
  } catch (err) {
    console.error("DOCX export error:", err);
    if (typeof domAlert === 'function') domAlert("❌ Lỗi khi xuất DOCX: " + err.message);
  }
}

/**
 * 📊 Export ads data to CSV
 * Báo cáo nghiệm thu chi tiết ads theo thời gian đang xem
 */
