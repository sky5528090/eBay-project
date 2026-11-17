import { readFileSync } from "node:fs";

const watermarkSource = readFileSync(new URL("../components/SmileWatermark.tsx", import.meta.url), "utf8");
import { describe, expect, it } from "vitest";
import { buildResultSvg } from "../../../shared/resultVisualization";
import { RESULT_LABELS } from "../../../shared/groupedQuestionnaire";

describe("result visualization encoding", () => {
  it("keeps public watermark settings reactive after an admin update", () => {
    expect(watermarkSource).toContain("branding-settings-updated");
    expect(watermarkSource).toContain("personality-branding-settings");
    expect(watermarkSource).toContain("refetchOnWindowFocus");
  });
  it("declares UTF-8 and keeps traditional Chinese labels readable", () => {
    const scores = Object.fromEntries(RESULT_LABELS.map((label) => [label, 5])) as Record<(typeof RESULT_LABELS)[number], number>;
    const svg = buildResultSvg({ id: 7, name: "小安&測試", submitDate: "2026-09-03" }, scores, 50, true, "春日探索室", "/manus-storage/brand.webp", 35, 65, 120);
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg).toContain('xml:lang="zh-Hant"');
    expect(svg).toContain("果斷");
    expect(svg).toContain("特質分析結果");
    expect(svg).toContain("春日探索室 · 測試日期：2026-09-03");
    expect(svg).toContain("<rect x=\"24\" y=\"86\" width=\"270\" height=\"126\"");
    expect(svg).not.toContain("PERSONALITY RESULT");
    expect(svg).not.toContain("八項特質合計");
    expect(svg).not.toContain("驗證通過");
    expect(svg).not.toContain("小安");
    expect(svg).toContain('href="/manus-storage/brand.webp"');
    expect(svg).toContain('data-photo-position-x="35"');
    expect(svg).toContain('data-photo-scale="120"');
  });

  it("exposes an admin-editable branding setting and passes it to the PNG builder", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    expect(source).toContain("branding.update");
    expect(source).toContain("品牌設定");
    expect(source).toContain("brandName");
    expect(source).toContain("smileSize");
    expect(source).toContain("smileOpacity");
    expect(source).toContain("buildResultSvg(detail, scores, total, valid, brandName, brandPhotoUrl");
    expect(source).toContain("branding.removePhoto");
    expect(source).toContain("最終圖片預覽");
    expect(source).toContain("analyzePhotoDesign");
    expect(source).toContain("setBrandPhotoPositionX(suggestion.positionX)");
    expect(source).toContain("依照片推薦設計");
    expect(source).toContain("PhotoCropEditor");
    expect(source).toContain("回到首頁");
    expect(source).toContain("onPointerDown");
    expect(source).toContain("onWheel");
    expect(source).not.toContain("整理回答、觀察群體趨勢，也管理團隊與資料權限");
    expect(source).not.toContain("這些統計只反映已提交的問卷，不代表個人診斷或固定標籤。");
  });

  it("uses the same paper-style DISC table as the public result page", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("function DiscPaperResultTable");
    expect(source).toContain("<DiscPaperResultTable answers={answers} />");
    expect(source).not.toContain("disc-answer-table");
    expect(css).toContain(".disc-paper-result-wrap { width: 100%; max-width: 100%; overflow-x: auto");
    expect(css).toContain(".admin-disc-paper-wrap .disc-paper-result { min-width: 760px; }");
  });

  it("uses a canvas PNG download flow in the admin result page", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    expect(source).toContain('canvas.toBlob');
    expect(source).toContain('"image/png"');
    expect(source).toContain('anchor.download = `personality-result-${String(detail.id)}.png`');
  });
});
