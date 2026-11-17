import { RESULT_LABELS, type GroupScores } from "./groupedQuestionnaire";

function escapeXml(value: unknown) {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[character] ?? character);
}

export function buildResultSvg(detail: Record<string, unknown>, scores: GroupScores, _total: number, _valid: boolean, brandName = "自我探索所", brandPhotoUrl: string | null = null, brandPhotoPositionX = 50, brandPhotoPositionY = 50, brandPhotoScale = 100) {
  const fontFamily = "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif";
  const cardWidth = 270;
  const cardHeight = 126;
  const gap = 14;
  const startX = 24;
  const titleY = 54;
  const startY = 86;
  const rows = RESULT_LABELS.map((label, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = startX + column * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);
    return `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="20" fill="#fffdf9" stroke="#e9e5df" stroke-width="2"/><text x="${x + cardWidth / 2}" y="${y + 43}" text-anchor="middle" font-family="${fontFamily}" font-size="21" font-weight="700" fill="#7f858b">${escapeXml(label)}</text><text x="${x + cardWidth / 2 - 8}" y="${y + 91}" text-anchor="end" font-family="${fontFamily}" font-size="42" font-weight="800" fill="#577b9d">${scores[label]}</text><text x="${x + cardWidth / 2 + 2}" y="${y + 90}" text-anchor="start" font-family="${fontFamily}" font-size="18" font-weight="700" fill="#7f858b">分</text>`;
  }).join("");
  const width = startX * 2 + cardWidth * 4 + gap * 3;
  const height = startY + cardHeight * 2 + gap + 48;
  const testDate = escapeXml(detail.submitDate || detail.createdAt || new Date().toISOString().slice(0, 10));
  const brand = escapeXml(brandName || "自我探索所");
  const photoHref = brandPhotoUrl ? escapeXml(brandPhotoUrl) : "";
  const normalizedScale = Math.max(60, Math.min(180, Number(brandPhotoScale) || 100)) / 100;
  const photoSize = 44 * normalizedScale;
  const photoX = 30 + (44 - photoSize) * (Math.max(0, Math.min(100, Number(brandPhotoPositionX) || 50)) / 100);
  const photoY = 14 + (44 - photoSize) * (Math.max(0, Math.min(100, Number(brandPhotoPositionY) || 50)) / 100);
  const photoMarkup = photoHref ? `<defs><clipPath id="brand-photo-clip"><circle cx="52" cy="36" r="22" /></clipPath></defs><image href="${photoHref}" x="${photoX.toFixed(2)}" y="${photoY.toFixed(2)}" width="${photoSize.toFixed(2)}" height="${photoSize.toFixed(2)}" preserveAspectRatio="none" clip-path="url(#brand-photo-clip)" opacity="0.96"/><circle cx="52" cy="36" r="22" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.78"/>` : "";
  const photoHint = photoHref ? ` data-photo-position-x="${Math.round(brandPhotoPositionX)}" data-photo-position-y="${Math.round(brandPhotoPositionY)}" data-photo-scale="${Math.round(brandPhotoScale)}"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xml:lang="zh-Hant" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${photoHint}><rect width="${width}" height="${height}" rx="28" fill="#fef9f2"/>${photoMarkup}<text x="${width / 2}" y="${titleY}" text-anchor="middle" font-family="${fontFamily}" font-size="30" font-weight="800" fill="#4a4a4a">特質分析結果</text>${rows}<text x="${width - 24}" y="${height - 18}" text-anchor="end" font-family="${fontFamily}" font-size="15" font-weight="600" fill="#7f858b">${brand} · 測試日期：${testDate}</text></svg>`;
}
