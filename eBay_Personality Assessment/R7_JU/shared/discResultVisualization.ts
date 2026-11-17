import { DISC_QUESTIONS, DISC_SECTIONS } from "./discQuestionnaire";

function escapeXml(value: unknown) {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[character] ?? character);
}

export function buildDiscResultSvg(answers: readonly number[], detail: Record<string, unknown> = {}, brandPhotoUrl: string | null = null, brandPhotoPositionX = 50, brandPhotoPositionY = 50, brandPhotoScale = 100) {
  const width = 1320;
  const rowHeight = 178;
  const headerHeight = 104;
  const height = headerHeight + DISC_QUESTIONS.length * rowHeight + 54;
  const font = "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif";
  const labelWidth = 68;
  const textWidth = 1030;
  const colWidth = 52;
  const startX = 24;
  const gridX = startX + labelWidth + textWidth;
  const options = [1, 2, 3, 4].map((value, index) => `<text x="${gridX + index * colWidth + colWidth / 2}" y="66" text-anchor="middle" font-family="${font}" font-size="22" font-weight="800" fill="#4a4a4a">${value}</text>`).join("");
  const rows = DISC_QUESTIONS.map((question, index) => {
    const y = headerHeight + index * rowHeight;
    const selected = Number(answers[index]);
    const section = DISC_SECTIONS.find((item) => index + 1 >= item.range[0] && index + 1 <= item.range[1]);
    const optionText = question.options.map((option, optionIndex) => `<tspan x="${startX + labelWidth + 22}" dy="${optionIndex === 0 ? 0 : 25}">(${optionIndex + 1}) ${escapeXml(option)}</tspan>`).join("");
    const checks = [1, 2, 3, 4].map((value, optionIndex) => {
      const cx = gridX + optionIndex * colWidth + colWidth / 2;
      const cy = y + 62;
      return `<rect x="${cx - 16}" y="${cy - 16}" width="32" height="32" rx="8" fill="${selected === value ? "#d7edf0" : "#fffdf9"}" stroke="${selected === value ? "#4f91a2" : "#cfd8d8"}" stroke-width="2"/>${selected === value ? `<path d="M ${cx - 9} ${cy} l 7 8 l 14 -17" fill="none" stroke="#397b87" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ""}`;
    }).join("");
    return `<rect x="${startX}" y="${y}" width="${width - startX * 2}" height="${rowHeight}" fill="${index % 2 === 0 ? "#fffdf9" : "#f8fbf8"}" stroke="#dfe7e4" stroke-width="1"/><text x="${startX + labelWidth / 2}" y="${y + 90}" text-anchor="middle" font-family="${font}" font-size="22" font-weight="800" fill="#557b86">${section?.id ?? ""}-${index + 1}</text><text x="${startX + labelWidth + 22}" y="${y + 30}" font-family="${font}" font-size="16" font-weight="800" fill="#3f6f7a">${escapeXml(question.title)}</text><text x="${startX + labelWidth + 22}" y="${y + 62}" font-family="${font}" font-size="15" font-weight="600" fill="#4a4a4a">${optionText}</text>${checks}`;
  }).join("");
  const brand = escapeXml(detail.brandName || "自我探索所");
  const date = escapeXml(detail.submitDate || detail.createdAt || new Date().toISOString().slice(0, 10));
  const photoHref = brandPhotoUrl ? escapeXml(brandPhotoUrl) : "";
  const normalizedScale = Math.max(60, Math.min(180, Number(brandPhotoScale) || 100)) / 100;
  const photoSize = 42 * normalizedScale;
  const photoX = width - 154 + (42 - photoSize) * (Math.max(0, Math.min(100, Number(brandPhotoPositionX) || 50)) / 100);
  const photoY = 13 + (42 - photoSize) * (Math.max(0, Math.min(100, Number(brandPhotoPositionY) || 50)) / 100);
  const photoMarkup = photoHref ? `<defs><clipPath id="disc-brand-photo-clip"><circle cx="${width - 133}" cy="34" r="21" /></clipPath></defs><image href="${photoHref}" x="${photoX.toFixed(2)}" y="${photoY.toFixed(2)}" width="${photoSize.toFixed(2)}" height="${photoSize.toFixed(2)}" preserveAspectRatio="none" clip-path="url(#disc-brand-photo-clip)" opacity="0.96"/><circle cx="${width - 133}" cy="34" r="21" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.78"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xml:lang="zh-Hant" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="28" fill="#fef9f2"/>${photoMarkup}<text x="${startX}" y="44" font-family="${font}" font-size="28" font-weight="900" fill="#3f6f7a">第三部分－DISC 個人天賦行為模式問卷</text><text x="${width - startX}" y="44" text-anchor="end" font-family="${font}" font-size="15" fill="#7f858b">${brand} · ${date}</text><rect x="${startX}" y="${headerHeight - 1}" width="${width - startX * 2}" height="${rowHeight * DISC_QUESTIONS.length + 1}" fill="none" stroke="#b9c9c8" stroke-width="2"/><line x1="${startX + labelWidth}" y1="${headerHeight - 1}" x2="${startX + labelWidth}" y2="${height - 54}" stroke="#b9c9c8"/><line x1="${gridX}" y1="${headerHeight - 1}" x2="${gridX}" y2="${height - 54}" stroke="#b9c9c8"/>${options}${rows}<text x="${width - startX}" y="${height - 20}" text-anchor="end" font-family="${font}" font-size="14" font-weight="600" fill="#7f858b">${brand} · 測試日期：${date}</text></svg>`;
}
