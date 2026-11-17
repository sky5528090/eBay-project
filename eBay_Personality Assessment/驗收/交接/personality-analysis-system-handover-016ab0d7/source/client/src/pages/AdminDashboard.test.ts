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
    expect(source).toContain("匯出 DISC PDF");
    expect(source).toContain("disc-admin-print-area");
    expect(source).toContain("window.print");
    expect(source).not.toContain("disc-answer-table");
    expect(css).toContain(".disc-paper-result-wrap { width: 100%; max-width: 100%; overflow-x: auto");
    expect(css).toContain(".admin-disc-paper-wrap .disc-paper-result { min-width: 760px; }");
    expect(css).toContain("line-height: 1.8");
    expect(css).toContain("grid-template-columns: 27px minmax(0, 1fr) repeat(4, 23px)");
  });

  it("uses a canvas PNG download flow in the admin result page", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    expect(source).toContain('canvas.toBlob');
    expect(source).toContain('"image/png"');
    expect(source).toContain('anchor.download = `personality-result-${String(detail.id)}.png`');
  });

  it("offers protected single-record deletion and sync status feedback", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    expect(source).toContain("questionnaire.deleteMany");
    expect(source).toContain("確認刪除受測紀錄？");
    expect(source).toContain("確認永久刪除");
    expect(source).toContain("brandingSyncStatus");
    expect(source).toContain("已同步至前台與其他裝置");
  });

  it("provides a confirm-before-upload photo editor with rotation and touch controls", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("photoEditorRotation");
    expect(source).toContain("confirmPhotoEdit");
    expect(source).toContain("context.rotate(radians)");
    expect(source).toContain("onPointerDown");
    expect(source).toContain("左轉 5°");
    expect(source).toContain("右轉 5°");
    expect(css).toContain(".photo-editor-backdrop");
    expect(css).toContain("touch-action: none");
  });

  it("provides multi-select deletion and a Log panel", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const schema = readFileSync(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8");
    const router = readFileSync(new URL("../../../server/routers/questionnaire.ts", import.meta.url), "utf8");
    expect(source).toContain("selectedSubmissionIds");
    expect(source).toContain("全選目前頁面紀錄");
    expect(source).toContain(">Log</TabButton>");
    expect(source).toContain("admin-confirm-backdrop");
    expect(css).toContain(".batch-delete-button");
    expect(css).toContain(".admin-confirm-dialog");
    expect(schema).toContain("adminAuditLogs");
    expect(router).toContain("deleteMany");
    expect(source).toContain("搜尋路由、操作或錯誤訊息");
    expect(source).toContain("只看 API 錯誤");
    expect(source).toContain("auditApiOnly");
    expect(source).toContain("auditPage");
    expect(source).toContain("auditPageSize = 20");
    expect(source).toContain("onPageChange={setAuditPage}");
    expect(source).toContain("第 {page + 1} / {totalPages} 頁");
  });

  it("provides 90-degree rotation and reset controls for the mobile photo editor", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("旋轉90度");
    expect(source).toContain("onReset={resetPhotoEditor}");
    expect(source).toContain("setPhotoEditorRotation(0)");
    expect(source).toContain("pointersRef");
    expect(source).toContain("Array.from(pointersRef.current.values())");
    expect(source).toContain("squareCanvas");
    expect(source).toContain('aria-label="照片旋轉角度"');
    expect(css).toContain("overscroll-behavior: contain");
    expect(css).toContain("aspect-ratio: 1 / 1");
  });

  it("keeps team and deletion data tables horizontally scrollable on mobile", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("onActive={(id, active) => setActiveMutation.mutate({ userId: id, active })}");
    expect(source).toContain("deletion-table-wrap");
    expect(source).toContain("帳號已停用");
    expect(source).toContain("帳號已啟用");
    expect(css).toContain(".team-table-wrap .admin-table { min-width: 900px; }");
    expect(css).toContain(".deletion-table-wrap .admin-table { min-width: 980px; }");
  });

  it("provides live square crop previews and a gentler drag response", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("photo-live-previews");
    expect(source).toContain("目前裁切位置預覽");
    expect(source).toContain("正方形最終效果預覽");
    expect(source).toContain("const dragSensitivity = .16");
    expect(css).toContain(".photo-live-thumb");
    expect(css).toContain(".photo-live-thumb.final");
  });

  it("uses a select control for account activation state", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    expect(source).toContain("account-status-select");
    expect(source).toContain('value={active ? "enabled" : "disabled"}');
    expect(source).toContain('event.target.value === "enabled"');
    expect(source).toContain("<option value=\"enabled\">啟用中</option>");
    expect(source).toContain("<option value=\"disabled\">已停用</option>");
  });

  it("adds a non-blocking rule-of-thirds overlay and disable confirmation", () => {
    const source = readFileSync(new URL("./AdminDashboard.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(source).toContain("photo-grid-overlay");
    expect(source).toContain("確定要停用此團隊帳號嗎？");
    expect(source).toContain("window.confirm");
    expect(css).toContain(".photo-grid-overlay");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("linear-gradient(to right");
    expect(css).toContain("linear-gradient(to bottom");
  });
});
