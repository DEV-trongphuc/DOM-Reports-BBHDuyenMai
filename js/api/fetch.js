async function fetchJSON(url, options = {}, retries = 3) {
  // For GET requests options is always {}, skip serialize entirely.
  // For POST, body is already a JSON string — reuse it directly.
  const key = options.body ? url + options.body : url;

  // Return cached result if within TTL
  if (CACHE.has(key) && Date.now() - (CACHE_TTL.get(key) || 0) < CACHE_TTL_MS) {
    return CACHE.get(key);
  }

  try {
    const res  = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      let msg = `HTTP ${res.status} - ${res.statusText}`;
      try {
        const errData = JSON.parse(text);
        if (errData.error) msg = `Meta API Error: ${errData.error.message} (Code: ${errData.error.code})`;
        if (errData.error?.code === 4 && retries > 0) {
          console.warn(`Rate limit reached. Waiting 5s then retry... (${retries} retries left)`);
          await new Promise((r) => setTimeout(r, 5000));
          return fetchJSON(url, options, retries - 1);
        }
      } catch { }
      throw new Error(msg);
    }

    const data = JSON.parse(text);
    CACHE.set(key, data);
    CACHE_TTL.set(key, Date.now());
    return data;
  } catch (err) {
    console.error(`Fetch failed: ${url}`, err);
    throw err;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
