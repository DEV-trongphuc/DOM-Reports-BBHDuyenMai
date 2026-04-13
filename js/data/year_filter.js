async function initializeYearData() {
  const selectedYear = new Date().getFullYear();
  const filter = "spend";

  try {
    const data = await fetchAdAccountData(selectedYear);
    renderMonthlyChart(processMonthlyData(data), filter);
  } catch (error) {
    console.error("Lỗi khi khởi tạo dữ liệu:", error);
    renderMonthlyChart(processMonthlyData([]), filter);
  }
}
