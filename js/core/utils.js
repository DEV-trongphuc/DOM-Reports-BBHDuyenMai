function formatMoneyShort(v) {
  if (v >= 1_000_000) {
    const m = Math.floor(v / 1_000_000);
    const k = Math.floor((v % 1_000_000) / 10000);
    return k > 0 ? `${m}.${k.toString().padStart(2, "0")}M` : `${m}M`;
  }
  if (v >= 1_000) {
    return `${Math.floor(v / 1_000)}k`;
  }
  return v ? v.toString() : "0";
}

let currentDetailDailyType = "spend";

/**
 * Lấy các chỉ số rải đều từ một mảng chỉ số ứng viên.
 */
function getSpreadIndices(indexArray, numPoints) {
  const set = new Set();
  const len = indexArray.length;
  if (numPoints === 0 || len === 0) return set;
  if (numPoints >= len) return new Set(indexArray);

  const step = (len - 1) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    set.add(indexArray[Math.round(i * step)]);
  }
  return set;
}

/**
 * Tính toán các chỉ số datalabel (tối đa maxPoints).
 * Ưu tiên rải đều ở "giữa" và luôn bao gồm điểm cao nhất.
 */
function calculateIndicesToShow(data, maxPoints = 5) {
  const dataLength = data.length;
  if (dataLength <= 2) return new Set();

  const maxData = Math.max(...data);
  const maxIndex = data.indexOf(maxData);
  const middleIndices = Array.from({ length: dataLength - 2 }, (_, i) => i + 1);
  const middleLength = middleIndices.length;

  if (middleLength === 0) return new Set();

  if (middleLength < maxPoints) {
    const indices = new Set(middleIndices);
    indices.add(maxIndex);
    return indices;
  }

  const isMaxInMiddle = maxIndex > 0 && maxIndex < dataLength - 1;
  let pointsToPick = isMaxInMiddle ? maxPoints : maxPoints - 1;

  const indicesToShow = getSpreadIndices(middleIndices, pointsToPick);

  if (isMaxInMiddle && !indicesToShow.has(maxIndex)) {
    let closestIndex = -1;
    let minDistance = Infinity;
    for (const index of indicesToShow) {
      const distance = Math.abs(index - maxIndex);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    }
    if (closestIndex !== -1) indicesToShow.delete(closestIndex);
    indicesToShow.add(maxIndex);
  }

  if (!isMaxInMiddle) indicesToShow.add(maxIndex);

  return indicesToShow;
}
