function renderYears() {
  const years = getYears();
  const currentYear = years[years.length - 1];
  const yearSelect = document.getElementById("yearSelect");
  if (!yearSelect) return;

  const fragment = document.createDocumentFragment();
  years.forEach((year) => {
    const li = document.createElement("li");
    li.dataset.type = year;
    li.innerHTML = `<span class="radio_box"></span><span>${year}</span>`;
    if (year === currentYear) {
      li.classList.add("active");
      li.querySelector(".radio_box").classList.add("active");
    }
    fragment.appendChild(li);
  });
  yearSelect.appendChild(fragment);

  const selectedYearElement = document.getElementById("selectedYear");
  if (selectedYearElement) selectedYearElement.textContent = currentYear;
}

let DATA_YEAR;

async function fetchAdAccountData(year) {
  const start = `${year}-01-01`;
  const end   = `${year}-12-31`;
  const url = `${BASE_URL}/act_${ACCOUNT_ID}/insights?fields=spend,impressions,reach,actions,date_start&time_range[since]=${start}&time_range[until]=${end}&time_increment=monthly&access_token=${META_TOKEN}`;

  try {
    const data = await fetchJSON(url);
    const insightsData = data?.data || [];
    DATA_YEAR = insightsData;
    return insightsData;
  } catch (error) {
    console.error(`Error fetching Ad Account data for ${year}:`, error);
    return [];
  }
}

function processMonthlyData(data) {
  if (!Array.isArray(data)) {
    console.error("Dữ liệu không hợp lệ:", data);
    return [];
  }

  const monthsData = Array(12).fill(null).map(() => ({
    spend: 0, impressions: 0, reach: 0, lead: 0, message: 0, likepage: 0,
  }));

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  data.forEach((item) => {
    const itemDate = new Date(item.date_start);
    const month = itemDate.getMonth();
    const year  = itemDate.getFullYear();

    if (year === currentYear && month > currentMonth) return;

    monthsData[month].spend       += parseFloat(item.spend || 0);
    monthsData[month].impressions += parseInt(item.impressions || 0);
    monthsData[month].reach       += parseInt(item.reach || 0);

    if (item.actions) {
      item.actions.forEach((action) => {
        const value = parseInt(action.value || 0);
        switch (action.action_type) {
          case "onsite_conversion.lead_grouped":
            monthsData[month].lead += value; break;
          case "onsite_conversion.messaging_conversation_started_7d":
            monthsData[month].message += value; break;
          case "like":
            monthsData[month].likepage += value; break;
        }
      });
    }
  });

  return monthsData;
}
