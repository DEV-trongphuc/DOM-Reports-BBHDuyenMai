async function fetchMyAdAccounts() {
  const url = `${BASE_URL}/me/adaccounts?fields=name,account_id,id,business{profile_picture_uri}&limit=50&access_token=${META_TOKEN}`;
  try {
    const res = await fetchJSON(url);
    return res.data || [];
  } catch (err) {
    console.error("Lỗi khi lấy danh sách tài khoản:", err);
    return [];
  }
}

async function initAccountSelector() {
  const accounts    = await fetchMyAdAccounts();
  const dropdownUl  = document.querySelector(".dom_account_view ul");
  const selectedInfo = document.querySelector(".dom_account_view_block .account_item");
  if (!dropdownUl || !selectedInfo) return;

  dropdownUl.innerHTML = "";

  const allowedIds = window.ALLOWED_ACCOUNTS;
  const filteredAccounts =
    Array.isArray(allowedIds) && allowedIds.length > 0
      ? accounts.filter((acc) => allowedIds.includes(acc.account_id))
      : accounts;

  filteredAccounts.forEach((acc) => {
    const li = document.createElement("li");
    li.dataset.acc = acc.account_id;
    const avatarUrl = acc.business?.profile_picture_uri || "./logo.png";
    li.innerHTML = `<img src="${avatarUrl}" /><p><span> ${acc.name}</span></p>`;
    dropdownUl.appendChild(li);

    if (acc.account_id === ACCOUNT_ID) {
      updateSelectedAccountUI(acc.name, acc.account_id, avatarUrl);
    }
  });

  const isCurrentAccountInList = accounts.some((a) => a.account_id === ACCOUNT_ID);
  if (!isCurrentAccountInList && ACCOUNT_ID) fetchSingleAccountInfo(ACCOUNT_ID);
}

function updateSelectedAccountUI(name, id, avatarUrl) {
  const selectedInfo = document.querySelector(".dom_account_view_block .account_item");
  if (!selectedInfo) return;

  const avatar = selectedInfo.querySelector(".account_item_avatar");
  const nameEl = selectedInfo.querySelector(".account_item_name");
  const idEl   = selectedInfo.querySelector(".account_item_id");

  if (avatar) avatar.src          = avatarUrl || "./logo.png";
  if (nameEl) nameEl.textContent  = name;
  if (idEl)   idEl.textContent    = id;
}

async function fetchSingleAccountInfo(accId) {
  const url = `${BASE_URL}/act_${accId}?fields=name,account_id,business{profile_picture_uri}&access_token=${META_TOKEN}`;
  try {
    const acc = await fetchJSON(url);
    if (acc) updateSelectedAccountUI(acc.name, acc.account_id, acc.business?.profile_picture_uri);
  } catch (err) {
    console.error("Lỗi khi lấy thông tin tài khoản lẻ:", err);
  }
}
