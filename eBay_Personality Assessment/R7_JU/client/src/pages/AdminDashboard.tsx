import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BarChart3, Check, Download, FileSearch, Filter, Printer, ImagePlus, Link2, Search, Settings, Share2, ShieldCheck, Sparkles, Trash2, UserCog, Users, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RESULT_LABELS, type GroupScores } from "../../../shared/groupedQuestionnaire";
import { DISC_QUESTIONS, DISC_SECTIONS, validateDiscAnswers } from "../../../shared/discQuestionnaire";
import { buildResultSvg } from "../../../shared/resultVisualization";
import { buildDiscResultSvg } from "../../../shared/discResultVisualization";

const zodiacOptions = ["牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座"];
const bloodTypeOptions = ["A 型", "B 型", "O 型", "AB 型", "不確定"];
const maritalStatusOptions = ["未婚", "交往中", "已婚", "其他"];

function broadcastBrandingSettings(settings: unknown) {
  if (typeof window === "undefined" || !settings || typeof settings !== "object") return;
  const snapshot = settings as Record<string, unknown>;
  const message = { ...snapshot, updatedAt: Date.now() };
  window.dispatchEvent(new CustomEvent("branding-settings-updated", { detail: message }));
  try { window.localStorage.setItem("personality-branding-settings", JSON.stringify(message)); } catch { /* storage may be unavailable */ }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("personality-branding-settings-v1");
      channel.postMessage(message);
      window.setTimeout(() => channel.close(), 100);
    }
  } catch { /* BroadcastChannel may be unavailable in older browsers */ }
}

const detailFields = [
  ["name", "姓名 / 暱稱"], ["birthdate", "生日"], ["submitDate", "填寫日期"], ["zodiac", "星座"], ["bloodType", "血型"], ["maritalStatus", "婚姻狀況"], ["hasChildren", "子女狀況"], ["fatherJob", "爸爸職業（3～6 歲）"], ["motherJob", "媽媽職業（3～6 歲）"], ["currentJob", "目前職業"], ["currentJobLevel", "職業／工作位階"], ["currentJobYears", "工作年資"], ["siblings", "是否有兄弟姐妹"], ["siblingsRank", "兄弟姐妹排行狀況"], ["siblingsJobs", "兄弟姐妹現在的工作"], ["preferredTime", "方便預約解析的時段"], ["discAnswers", "DISC 15 題選擇（JSON）"],
] as const;

type Tab = "records" | "analytics" | "team" | "deletion" | "branding";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

function downloadCsv(rows: Record<string, unknown>[]) {
  const headers = ["id", ...detailFields.map(([key, label]) => `${label} (${key})`), "createdAt"];
  const csvRows = rows.map((row) => [row.id, ...detailFields.map(([key]) => row[key] ?? ""), row.createdAt ?? ""]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...csvRows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `personality-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ChartRows({ rows, labelKey, color = "#6a9fc3" }: { rows: unknown[]; labelKey: string; color?: string }) {
  const items = rows as Array<Record<string, unknown>>;
  const max = Math.max(...items.map((item) => Number(item.count ?? 0)), 1);
  if (!items.length) return <div className="analytics-empty">目前尚未累積足夠資料。</div>;
  return <div className="chart-rows">{items.map((item, index) => { const count = Number(item.count ?? 0); return <div className="chart-row" key={`${String(item[labelKey] ?? "未填寫")}-${index}`}><div className="chart-row-label"><span>{String(item[labelKey] ?? "未填寫")}</span><strong>{count}</strong></div><div className="chart-track"><span style={{ width: `${Math.max((count / max) * 100, 4)}%`, background: color }} /></div></div>; })}</div>;
}

function parseResultScores(detail: Record<string, unknown>): GroupScores | null {
  if (typeof detail.groupedScores !== "string") return null;
  try {
    const parsed = JSON.parse(detail.groupedScores) as { resultScores?: GroupScores };
    return parsed.resultScores ?? null;
  } catch {
    return null;
  }
}

function parseDiscAnswers(detail: Record<string, unknown>): number[] | null {
  if (typeof detail.discAnswers !== "string") return null;
  try {
    const parsed = JSON.parse(detail.discAnswers) as unknown;
    return Array.isArray(parsed) && validateDiscAnswers(parsed as number[]) ? parsed as number[] : null;
  } catch {
    return null;
  }
}

function ResultReport({ detail, brandName, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale }: { detail: Record<string, unknown>; brandName: string; brandPhotoUrl: string | null; brandPhotoPositionX: number; brandPhotoPositionY: number; brandPhotoScale: number }) {
  const scores = parseResultScores(detail);
  const total = Number(detail.groupedTotalScore ?? 0);
  const valid = Number(detail.groupedScoreValid) === 1 && total === 50;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scoreSignature = scores ? RESULT_LABELS.map((label) => `${label}:${scores[label]}`).join("|") : "";
  const makePngBlob = async () => {
    if (!scores) return null;
    const svg = buildResultSvg(detail, scores, total, valid, brandName, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale);
    const svgUrl = URL.createObjectURL(new Blob(["\ufeff", svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      return await new Promise<Blob | null>((resolve) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth || 1170;
          canvas.height = image.naturalHeight || 392;
          const context = canvas.getContext("2d");
          if (!context) { resolve(null); return; }
          context.drawImage(image, 0, 0);
          canvas.toBlob((blob) => resolve(blob), "image/png");
        };
        image.onerror = () => resolve(null);
        image.src = svgUrl;
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };
  const refreshPreview = async () => {
    const blob = await makePngBlob();
    if (!blob) { toast.error("結果圖預覽產生失敗，請稍後再試"); return; }
    setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
  };
  useEffect(() => {
    if (!scores) { setPreviewUrl(null); return; }
    void refreshPreview();
    return () => { setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return null; }); };
  }, [detail.id, scoreSignature, brandName, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale]);
  const downloadImage = async () => {
    const blob = await makePngBlob();
    if (!blob) { toast.error("結果圖產生失敗，請稍後再試"); return; }
    const pngUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = pngUrl; anchor.download = `personality-result-${String(detail.id)}.png`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    toast.success("PNG 結果圖已開始下載");
  };
  const share = async () => {
    const text = `${String(detail.name || "填寫者")} 的特質分析結果：八項特質合計 ${total} / 50。`;
    if (navigator.share) await navigator.share({ title: "特質分析結果", text });
    else { await navigator.clipboard?.writeText(text); toast.success("結果摘要已複製"); }
  };
  return <section className="result-report"><div className="result-report-heading"><div><span className="eyebrow"><Share2 size={15} /> RESULT VISUALIZATION</span><h3>特質分析結果</h3><p>結果圖固定以淺色分享色調生成，不受目前後台深色模式影響。</p></div><div className="result-actions"><button className="secondary-cta compact" disabled={!scores} onClick={() => void downloadImage()}><Download size={15} /> 下載 PNG 結果圖</button><button className="primary-cta compact" disabled={!scores} onClick={() => void share()}><Share2 size={15} /> 分享結果</button></div></div>{scores ? <><div className="result-preview-panel"><div className="result-preview-heading"><div><strong>最終圖片預覽</strong><span>品牌照片與日期會一併套用到下載檔</span></div><button className="secondary-cta compact" type="button" onClick={() => void refreshPreview()}>更新預覽</button></div>{previewUrl ? <img className="result-preview-image" src={previewUrl} alt="套用品牌照片後的特質分析結果 PNG 預覽" /> : <div className="result-preview-loading">正在生成淺色結果圖預覽…</div>}</div><div className="result-score-grid">{RESULT_LABELS.map((label) => <div className="result-score-item" key={label}><span>{label}</span><strong>{scores[label]}</strong><small>分</small></div>)}</div><div className="result-total-row"><span>總分驗證</span><strong className={valid ? "valid-score" : "invalid-score"}>{total} / 50 · {valid ? "驗證通過" : "需要檢查"}</strong></div></> : <div className="result-empty">這筆舊紀錄尚未包含五題組結果；新提交的問卷會自動產生結果。</div>}</section>;
}

function DiscPaperResultTable({ answers }: { answers: readonly number[] }) {
  return <div className="disc-paper-result-wrap admin-disc-paper-wrap"><div className="disc-paper-result"><div className="disc-paper-title">DISC 個人天賦行為模式結果</div><div className="disc-paper-head"><span>題目</span><span>選項內容</span><span>1</span><span>2</span><span>3</span><span>4</span></div>{DISC_QUESTIONS.map((question, index) => <div className="disc-paper-row" key={question.id}><span>{question.id}</span><div><strong className="disc-paper-question">{question.title}</strong>{question.options.map((option, optionIndex) => <p key={`${question.id}-${optionIndex}`}><b>({optionIndex + 1})</b> {option}</p>)}</div>{[1, 2, 3, 4].map((value) => <span className={answers[index] === value ? "paper-check selected" : "paper-check"} key={value}>{answers[index] === value ? "✓" : ""}</span>)}</div>)}</div></div>;
}

function DiscResultReport({ detail, brandName, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale }: { detail: Record<string, unknown>; brandName: string; brandPhotoUrl: string | null; brandPhotoPositionX: number; brandPhotoPositionY: number; brandPhotoScale: number }) {
  const answers = parseDiscAnswers(detail);
  const makePngBlob = async () => {
    if (!answers) return null;
    const svg = buildDiscResultSvg(answers, { ...detail, brandName }, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale);
    const svgUrl = URL.createObjectURL(new Blob(["\ufeff", svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      return await new Promise<Blob | null>((resolve) => {
        const image = new Image();
        image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const context = canvas.getContext("2d"); if (!context) { resolve(null); return; } context.drawImage(image, 0, 0); canvas.toBlob((blob) => resolve(blob), "image/png"); };
        image.onerror = () => resolve(null);
        image.src = svgUrl;
      });
    } finally { URL.revokeObjectURL(svgUrl); }
  };

  const downloadImage = async () => { const blob = await makePngBlob(); if (!blob) { toast.error("DISC 結果圖產生失敗，請稍後再試"); return; } const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `DISC-結果-${String(detail.id)}.png`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); toast.success("DISC 結果 PNG 已開始下載"); };
  const printResult = () => { const previousTitle = document.title; document.title = `DISC 結果-${String(detail.id)}`; window.print(); window.setTimeout(() => { document.title = previousTitle; }, 1000); };
  return <section className="result-report disc-result-report"><div className="result-report-heading"><div><span className="eyebrow"><FileSearch size={15} /> DISC RESULT</span><h3>DISC 個人天賦行為模式結果</h3><p>與前台最後測驗結果使用相同的紙本式 1–4 欄位呈現。</p></div><div className="result-actions"><button className="secondary-cta compact" disabled={!answers} onClick={() => void downloadImage()}><Download size={15} /> 下載 DISC PNG</button><button className="secondary-cta compact" disabled={!answers} onClick={printResult}><Printer size={15} /> 匯出 DISC PDF</button></div></div>{answers ? <div className="disc-admin-print-area"><DiscPaperResultTable answers={answers} /><img className="disc-print-watermark" src={brandPhotoUrl || "/manus-storage/smile-black-transparent_bb9c220a.png"} alt="" aria-hidden="true" style={{ width: `${brandPhotoUrl ? 64 : brandPhotoScale}px`, height: `${brandPhotoUrl ? 64 : brandPhotoScale}px`, opacity: brandPhotoUrl ? 0.18 : brandPhotoScale / 100, objectPosition: `${brandPhotoPositionX}% ${brandPhotoPositionY}%`, transform: `scale(${brandPhotoScale / 100})` }} /></div> : <div className="result-empty">這筆紀錄尚未包含 DISC 15 題結果；完成新版問卷後會自動產生。</div>}</section>;
}

function TabButton({ active, icon, children, onClick }: { active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={`admin-tab ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{children}</span></button>;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/submissions/:id");
  const [tab, setTab] = useState<Tab>("records");
  const [brandName, setBrandName] = useState("自我探索所");
  const [smileSize, setSmileSize] = useState(72);
  const [smileOpacity, setSmileOpacity] = useState(18);
  const [brandPhotoUrl, setBrandPhotoUrl] = useState<string | null>(null);
  const [brandPhotoPositionX, setBrandPhotoPositionX] = useState(50);
  const [brandPhotoPositionY, setBrandPhotoPositionY] = useState(50);
  const [brandPhotoScale, setBrandPhotoScale] = useState(100);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const [isPhotoPreparing, setIsPhotoPreparing] = useState(false);
  const [brandingSyncStatus, setBrandingSyncStatus] = useState("尚未儲存新的品牌設定");
  const [search, setSearch] = useState("");
  const [zodiacFilter, setZodiacFilter] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("");
  const [maritalStatusFilter, setMaritalStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const limit = 12;
  const listInput = useMemo(() => ({ search: search.trim() || undefined, zodiac: zodiacFilter || undefined, bloodType: bloodTypeFilter || undefined, maritalStatus: maritalStatusFilter || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, limit, offset: page * limit }), [search, zodiacFilter, bloodTypeFilter, maritalStatusFilter, fromDate, toDate, page]);
  const hasFilters = Boolean(search || zodiacFilter || bloodTypeFilter || maritalStatusFilter || fromDate || toDate);
  const clearFilters = () => { setSearch(""); setZodiacFilter(""); setBloodTypeFilter(""); setMaritalStatusFilter(""); setFromDate(""); setToDate(""); setPage(0); };
  const isAdmin = user?.role === "admin";
  const listQuery = trpc.questionnaire.list.useQuery(listInput, { enabled: Boolean(isAdmin && !params?.id && tab === "records") });
  const detailQuery = trpc.questionnaire.getById.useQuery({ id: Number(params?.id) }, { enabled: Boolean(isAdmin && params?.id) });
  const exportQuery = trpc.questionnaire.exportAll.useQuery(undefined, { enabled: false });
  const analyticsQuery = trpc.adminTools.analytics.useQuery(undefined, { enabled: Boolean(isAdmin && tab === "analytics") });
  const usersQuery = trpc.adminTools.admins.list.useQuery(undefined, { enabled: Boolean(isAdmin && tab === "team") });
  const invitationsQuery = trpc.adminTools.invitations.list.useQuery(undefined, { enabled: Boolean(isAdmin && tab === "team") });
  const deletionQuery = trpc.adminTools.deletion.list.useQuery(undefined, { enabled: Boolean(isAdmin && tab === "deletion") });
  const brandingQuery = trpc.adminTools.branding.get.useQuery(undefined, { enabled: Boolean(isAdmin) });
  const utils = trpc.useUtils();
  const setRoleMutation = trpc.adminTools.admins.setRole.useMutation({ onSuccess: () => { toast.success("角色已更新"); void utils.adminTools.admins.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const inviteMutation = trpc.adminTools.invitations.create.useMutation({ onSuccess: () => { toast.success("邀請碼已建立"); void utils.adminTools.invitations.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const revokeMutation = trpc.adminTools.invitations.revoke.useMutation({ onSuccess: () => { toast.success("邀請碼已撤銷"); void utils.adminTools.invitations.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const processDeletionMutation = trpc.adminTools.deletion.process.useMutation({ onSuccess: () => { toast.success("刪除申請已處理"); void utils.adminTools.deletion.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const deleteSubmissionMutation = trpc.questionnaire.deleteById.useMutation({ onSuccess: () => { toast.success("受測資料已刪除"); void utils.questionnaire.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateBrandMutation = trpc.adminTools.branding.update.useMutation({ onSuccess: (data) => { setBrandName(data.brandName); setBrandPhotoUrl(data.brandPhotoUrl ?? null); setPhotoPreviewUrl(data.brandPhotoUrl ?? null); setBrandPhotoPositionX(data.brandPhotoPositionX ?? 50); setBrandPhotoPositionY(data.brandPhotoPositionY ?? 50); setBrandPhotoScale(data.brandPhotoScale ?? 100); utils.adminTools.branding.get.setData(undefined, data); utils.adminTools.branding.public.setData(undefined, data); broadcastBrandingSettings(data); setBrandingSyncStatus(`已同步至前台與其他裝置 · ${new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`); toast.success("品牌設定已更新，前台已同步套用"); }, onError: (error) => { setBrandingSyncStatus("同步失敗，請重新儲存"); toast.error(error.message); } });
  const uploadPhotoMutation = trpc.adminTools.branding.uploadPhoto.useMutation({ onSuccess: (data) => { setBrandPhotoUrl(data.brandPhotoUrl ?? null); setPhotoPreviewUrl(data.brandPhotoUrl ?? null); utils.adminTools.branding.get.setData(undefined, data); utils.adminTools.branding.public.setData(undefined, data); broadcastBrandingSettings(data); toast.success("照片已上傳，已先套用構圖與色彩設計建議；確認後請儲存設定"); }, onError: (error) => toast.error(error.message) });
  const removePhotoMutation = trpc.adminTools.branding.removePhoto.useMutation({ onSuccess: (data) => { setBrandPhotoUrl(null); setPhotoPreviewUrl(null); setPhotoFileName(""); setBrandPhotoPositionX(50); setBrandPhotoPositionY(50); setBrandPhotoScale(100); utils.adminTools.branding.get.setData(undefined, data); utils.adminTools.branding.public.setData(undefined, data); broadcastBrandingSettings(data); toast.success("已恢復預設微笑圖示，前台已同步套用"); }, onError: (error) => toast.error(error.message) });
  useEffect(() => { if (brandingQuery.data) { setBrandName(brandingQuery.data.brandName); setSmileSize(brandingQuery.data.smileSize ?? 72); setSmileOpacity(brandingQuery.data.smileOpacity ?? 18); setBrandPhotoUrl(brandingQuery.data.brandPhotoUrl ?? null); setPhotoPreviewUrl(brandingQuery.data.brandPhotoUrl ?? null); setBrandPhotoPositionX(brandingQuery.data.brandPhotoPositionX ?? 50); setBrandPhotoPositionY(brandingQuery.data.brandPhotoPositionY ?? 50); setBrandPhotoScale(brandingQuery.data.brandPhotoScale ?? 100); } }, [brandingQuery.data]);

  if (loading) return null;
  if (!user) return <DashboardLayout><div className="admin-state-card"><ShieldCheck size={32} /><h1>請先登入管理員帳號</h1><p>後台紀錄只會開放給已登入的管理員查看。</p></div></DashboardLayout>;
  if (!isAdmin) return <DashboardLayout><div className="admin-state-card"><ShieldCheck size={32} /><h1>此帳號沒有後台權限</h1><p>請使用 admin 角色帳號登入；公開問卷仍可從首頁直接填寫。</p><Link className="secondary-cta inline-flex" href="/">返回公開問卷</Link></div></DashboardLayout>;

  const items = (listQuery.data?.items ?? []) as unknown as Record<string, unknown>[];
  const total = listQuery.data?.total ?? 0;
  const detail = detailQuery.data as unknown as Record<string, unknown> | undefined;
  const analytics = analyticsQuery.data;
  const admins = (usersQuery.data ?? []) as Array<Record<string, unknown>>;
  const invitations = (invitationsQuery.data ?? []) as Array<Record<string, unknown>>;
  const deletionRequests = (deletionQuery.data ?? []) as Array<Record<string, unknown>>;

  const handleExport = async () => { try { const result = await exportQuery.refetch(); downloadCsv((result.data ?? []) as unknown as Record<string, unknown>[]); toast.success("CSV 已開始下載"); } catch { toast.error("匯出失敗，請稍後再試"); } };
  const createInvite = async () => { const result = await inviteMutation.mutateAsync({ expiresInDays: 7 }); const link = `${window.location.origin}/admin/invite?code=${result.code}`; await navigator.clipboard?.writeText(link); toast.success("邀請連結已複製到剪貼簿"); };
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast.error("請選擇 PNG、JPG 或 WebP 圖片"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("圖片檔案不可超過 3 MB"); return; }
    setIsPhotoPreparing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const sourceUrl = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        const maxEdge = 1600;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/webp", .84);
        const suggestion = analyzePhotoDesign(image);
        setBrandPhotoPositionX(suggestion.positionX); setBrandPhotoPositionY(suggestion.positionY); setBrandPhotoScale(suggestion.scale); setSmileOpacity(suggestion.opacity); setSmileSize(suggestion.size);
        setPhotoFileName(file.name);
        setPhotoPreviewUrl(dataUrl);
        setIsPhotoPreparing(false);
        uploadPhotoMutation.mutate({ fileName: `${file.name.replace(/\.[^.]+$/, "")}.webp`, mimeType: "image/webp", dataUrl });
        URL.revokeObjectURL(sourceUrl);
      };
      image.onerror = () => { setIsPhotoPreparing(false); toast.error("圖片內容無法解析，請重新選擇"); };
      image.src = sourceUrl;
    };
    reader.onerror = () => { setIsPhotoPreparing(false); toast.error("圖片讀取失敗，請重新選擇"); };
    reader.readAsDataURL(file);
  };

  return <DashboardLayout>
    <div className="admin-page">
      <header className="admin-header"><div><span className="eyebrow"><ShieldCheck size={15} /> ADMIN WORKSPACE</span><h1>特質分析管理中心</h1></div><div className="admin-header-actions"><span className="admin-user-pill"><Users size={15} /> {user.name || user.email}</span>{tab === "records" && <button className="primary-cta compact" onClick={handleExport}><Download size={16} /> 匯出完整 CSV</button>}</div></header>
      {!params?.id && <nav className="admin-tabs" aria-label="管理後台分頁"><TabButton active={tab === "records"} icon={<FileSearch size={16} />} onClick={() => setTab("records")}>填寫紀錄</TabButton><TabButton active={tab === "analytics"} icon={<BarChart3 size={16} />} onClick={() => setTab("analytics")}>統計與分析</TabButton><TabButton active={tab === "team"} icon={<UserCog size={16} />} onClick={() => setTab("team")}>團隊與邀請</TabButton><TabButton active={tab === "deletion"} icon={<Trash2 size={16} />} onClick={() => setTab("deletion")}>刪除管理</TabButton><TabButton active={tab === "branding"} icon={<Settings size={16} />} onClick={() => setTab("branding")}>品牌設定</TabButton></nav>}

      {params?.id ? <section className="admin-detail-panel"><div className="detail-navigation"><button className="back-link" onClick={() => setLocation("/admin")}><ArrowLeft size={15} /> 返回紀錄列表</button><Link className="secondary-cta compact" href="/">回到首頁</Link></div>{detailQuery.isLoading ? <div className="loading-line">正在讀取這份回答…</div> : detail ? <><div className="detail-heading"><div><span className="eyebrow">SUBMISSION DETAIL</span><h2>{String(detail.name || "未命名填寫者")}</h2></div><span className="timestamp">提交於 {formatDate(detail.createdAt)}</span></div><ResultReport detail={detail} brandName={brandingQuery.data?.brandName ?? brandName} brandPhotoUrl={brandingQuery.data?.brandPhotoUrl ?? null} brandPhotoPositionX={brandingQuery.data?.brandPhotoPositionX ?? 50} brandPhotoPositionY={brandingQuery.data?.brandPhotoPositionY ?? 50} brandPhotoScale={brandingQuery.data?.brandPhotoScale ?? 100} /><DiscResultReport detail={detail} brandName={brandingQuery.data?.brandName ?? brandName} brandPhotoUrl={brandingQuery.data?.brandPhotoUrl ?? null} brandPhotoPositionX={brandingQuery.data?.brandPhotoPositionX ?? 50} brandPhotoPositionY={brandingQuery.data?.brandPhotoPositionY ?? 50} brandPhotoScale={brandingQuery.data?.brandPhotoScale ?? 100} /><div className="detail-grid">{detailFields.filter(([key]) => key !== "discAnswers").map(([key, label]) => <div className="detail-item" key={key}><span>{label}</span><strong>{String(detail[key] || "—")}</strong></div>)}</div></> : <div className="admin-state-card compact-state"><FileSearch size={28} /><h2>找不到這筆紀錄</h2></div>}</section> : tab === "records" ? <section className="admin-list-panel"><div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="搜尋姓名、星座、職業…" /><button type="button" aria-label="清除搜尋" onClick={() => { setSearch(""); setPage(0); }}><X size={15} /></button></div><div className="filter-controls"><select className="filter-select" value={zodiacFilter} onChange={(event) => { setZodiacFilter(event.target.value); setPage(0); }} aria-label="依星座篩選"><option value="">全部星座</option>{zodiacOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><select className="filter-select" value={bloodTypeFilter} onChange={(event) => { setBloodTypeFilter(event.target.value); setPage(0); }} aria-label="依血型篩選"><option value="">全部血型</option>{bloodTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><select className="filter-select" value={maritalStatusFilter} onChange={(event) => { setMaritalStatusFilter(event.target.value); setPage(0); }} aria-label="依婚姻狀況篩選"><option value="">全部婚姻狀況</option>{maritalStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><label className="date-filter"><span>從</span><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} aria-label="提交日期起始" /></label><label className="date-filter"><span>至</span><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} aria-label="提交日期結束" /></label>{hasFilters && <button className="clear-filter" type="button" onClick={clearFilters}>清除篩選</button>}</div><span className="filter-note"><Filter size={14} /> 共 {total} 筆紀錄</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>編號</th><th>姓名</th><th>生日</th><th>星座</th><th>目前職業</th><th>提交時間</th><th>操作</th></tr></thead><tbody>{listQuery.isLoading ? <tr><td colSpan={7} className="table-empty">正在載入紀錄…</td></tr> : items.length === 0 ? <tr><td colSpan={7} className="table-empty">目前還沒有符合條件的填寫紀錄。</td></tr> : items.map((item) => <tr key={String(item.id)}><td className="muted-cell">#{String(item.id)}</td><td><strong>{String(item.name || "未命名")}</strong></td><td>{String(item.birthdate || "—")}</td><td><span className="soft-tag">{String(item.zodiac || "—")}</span></td><td>{String(item.currentJob || "—")}</td><td className="muted-cell">{formatDate(item.createdAt)}</td><td><div className="record-actions"><Link className="detail-link" href={`/admin/submissions/${String(item.id)}`}>查看詳情 <ArrowRight /></Link><button className="text-danger" type="button" onClick={() => { if (window.confirm("確定要永久刪除這筆受測資料嗎？此操作無法復原。")) deleteSubmissionMutation.mutate({ id: Number(item.id) }); }} disabled={deleteSubmissionMutation.isPending}><Trash2 size={14} /> 刪除</button></div></td></tr>)}</tbody></table></div><div className="pagination"><button className="secondary-cta compact" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>上一頁</button><span>第 {page + 1} 頁 · {items.length} / {total}</span><button className="secondary-cta compact" disabled={(page + 1) * limit >= total} onClick={() => setPage((value) => value + 1)}>下一頁</button></div></section> : tab === "analytics" ? <AnalyticsPanel data={analytics} /> : tab === "team" ? <TeamPanel users={admins} invitations={invitations} onCreate={createInvite} onRole={(id, role) => setRoleMutation.mutate({ userId: id, role })} onRevoke={(id) => revokeMutation.mutate({ id })} /> : tab === "deletion" ? <DeletionPanel requests={deletionRequests} onProcess={(id, status) => processDeletionMutation.mutate({ id, status })} /> : <BrandingPanel brandName={brandName} smileSize={smileSize} smileOpacity={smileOpacity} brandPhotoUrl={brandPhotoUrl} photoPreviewUrl={photoPreviewUrl} photoFileName={photoFileName} brandPhotoPositionX={brandPhotoPositionX} brandPhotoPositionY={brandPhotoPositionY} brandPhotoScale={brandPhotoScale} isSaving={updateBrandMutation.isPending} isUploading={uploadPhotoMutation.isPending || isPhotoPreparing} isRemoving={removePhotoMutation.isPending} onBrandChange={setBrandName} onSizeChange={setSmileSize} onOpacityChange={setSmileOpacity} onPositionXChange={setBrandPhotoPositionX} onPositionYChange={setBrandPhotoPositionY} onScaleChange={setBrandPhotoScale} onPhotoUpload={handlePhotoUpload} onRemovePhoto={() => removePhotoMutation.mutate()} syncStatus={brandingSyncStatus} onSave={() => updateBrandMutation.mutate({ brandName, smileSize, smileOpacity, brandPhotoUrl, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale })} />}
    </div>
  </DashboardLayout>;
}

function AnalyticsPanel({ data }: { data: any }) {
  return <section className="admin-content-grid"><div className="analytics-hero"><div><span className="eyebrow"><BarChart3 size={15} /> INSIGHT REPORT</span><h2>回答者群體的節奏</h2></div><div className="big-stat"><strong>{data?.totalSubmissions ?? 0}</strong><span>總提交份數</span></div></div><div className="analytics-grid"><article className="analytics-card"><h3>星座分佈</h3><ChartRows rows={data?.zodiacStats ?? []} labelKey="zodiac" color="#6a9fc3" /></article><article className="analytics-card"><h3>血型分佈</h3><ChartRows rows={data?.bloodStats ?? []} labelKey="bloodType" color="#d68d83" /></article><article className="analytics-card"><h3>婚姻狀況</h3><ChartRows rows={data?.maritalStats ?? []} labelKey="maritalStatus" color="#91b59b" /></article><article className="analytics-card"><h3>常見職業關鍵字</h3><ChartRows rows={data?.currentJobStats ?? []} labelKey="currentJob" color="#c9a56b" /></article></div><div className="analytics-card trend-card"><h3>最近提交趨勢</h3><ChartRows rows={data?.recentTrend ?? []} labelKey="date" color="#9077aa" /></div></section>;
}

function TeamPanel({ users, invitations, onCreate, onRole, onRevoke }: { users: Array<Record<string, unknown>>; invitations: Array<Record<string, unknown>>; onCreate: () => void; onRole: (id: number, role: "user" | "admin") => void; onRevoke: (id: number) => void }) {
  return <section className="admin-content-grid"><div className="panel-heading-row"><div><span className="eyebrow"><UserCog size={15} /> TEAM ACCESS</span><h2>團隊與邀請</h2><p>角色調整會立即影響後台存取權。請只授權給必要的人員。</p></div><button className="primary-cta compact" onClick={onCreate}><Link2 size={16} /> 建立 7 日邀請</button></div><article className="admin-table-card"><h3>目前帳號</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>帳號</th><th>Email</th><th>目前角色</th><th>最後登入</th><th>調整</th></tr></thead><tbody>{users.length ? users.map((item) => <tr key={String(item.id)}><td><strong>{String(item.name || "未命名")}</strong></td><td>{String(item.email || "—")}</td><td><span className={`role-tag ${item.role === "admin" ? "admin" : "user"}`}>{item.role === "admin" ? "管理員" : "一般使用者"}</span></td><td>{formatDate(item.lastSignedIn)}</td><td><select className="filter-select" value={String(item.role)} onChange={(event) => onRole(Number(item.id), event.target.value as "user" | "admin")}><option value="user">一般使用者</option><option value="admin">管理員</option></select></td></tr>) : <tr><td colSpan={5} className="table-empty">目前沒有可顯示的帳號。</td></tr>}</tbody></table></div></article><article className="admin-table-card"><h3>邀請碼</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>邀請碼</th><th>狀態</th><th>建立時間</th><th>到期時間</th><th>操作</th></tr></thead><tbody>{invitations.length ? invitations.map((item) => <tr key={String(item.id)}><td><code>{String(item.code)}</code></td><td><span className="soft-tag">{String(item.status)}</span></td><td>{formatDate(item.createdAt)}</td><td>{formatDate(item.expiresAt)}</td><td>{item.status === "pending" && <button className="text-danger" onClick={() => onRevoke(Number(item.id))}>撤銷</button>}</td></tr>) : <tr><td colSpan={5} className="table-empty">尚未建立邀請碼。</td></tr>}</tbody></table></div></article></section>;
}

function DeletionPanel({ requests, onProcess }: { requests: Array<Record<string, unknown>>; onProcess: (id: number, status: "completed" | "rejected") => void }) {
  return <section className="admin-content-grid"><div className="panel-heading-row"><div><span className="eyebrow"><Trash2 size={15} /> DATA GOVERNANCE</span><h2>資料刪除管理</h2><p>完成申請後，系統會依姓名與生日刪除對應問卷紀錄；處理前請人工核對申請人身分。</p></div></div><article className="admin-table-card"><h3>刪除申請</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>申請人 Email</th><th>問卷姓名</th><th>生日</th><th>原因</th><th>狀態</th><th>申請時間</th><th>操作</th></tr></thead><tbody>{requests.length ? requests.map((item) => <tr key={String(item.id)}><td>{String(item.targetEmail)}</td><td>{String(item.targetName)}</td><td>{String(item.targetBirthdate)}</td><td className="reason-cell">{String(item.reason || "—")}</td><td><span className="soft-tag">{String(item.status)}</span></td><td>{formatDate(item.createdAt)}</td><td>{item.status === "pending" && <div className="inline-actions"><button className="text-success" onClick={() => onProcess(Number(item.id), "completed")}><Check size={14} /> 完成刪除</button><button className="text-danger" onClick={() => onProcess(Number(item.id), "rejected")}>駁回</button></div>}</td></tr>) : <tr><td colSpan={7} className="table-empty">目前沒有刪除申請。</td></tr>}</tbody></table></div></article></section>;
}


const defaultSmileAssetUrl = "/manus-storage/smile-black-transparent_bb9c220a.png";

type PhotoDesignSuggestion = { positionX: number; positionY: number; scale: number; opacity: number; size: number; warm: boolean };

function analyzePhotoDesign(image: HTMLImageElement): PhotoDesignSuggestion {
  const canvas = document.createElement("canvas"); canvas.width = 36; canvas.height = 36;
  const context = canvas.getContext("2d");
  if (!context) return { positionX: 50, positionY: 50, scale: 100, opacity: 18, size: 80, warm: false };
  context.drawImage(image, 0, 0, 36, 36);
  const pixels = context.getImageData(0, 0, 36, 36).data;
  const cellStats: Array<{ score: number; x: number; y: number }> = [];
  let totalLuminance = 0; let totalRed = 0; let totalBlue = 0;
  for (let y = 0; y < 36; y += 1) for (let x = 0; x < 36; x += 1) { const index = (y * 36 + x) * 4; const red = pixels[index] ?? 0; const green = pixels[index + 1] ?? 0; const blue = pixels[index + 2] ?? 0; totalRed += red; totalBlue += blue; totalLuminance += (red * 299 + green * 587 + blue * 114) / 1000; }
  for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) { let local = 0; let localMin = 255; let localMax = 0; for (let y = row * 12; y < (row + 1) * 12; y += 1) for (let x = column * 12; x < (column + 1) * 12; x += 1) { const index = (y * 36 + x) * 4; const red = pixels[index] ?? 0; const green = pixels[index + 1] ?? 0; const blue = pixels[index + 2] ?? 0; const luminance = (red * 299 + green * 587 + blue * 114) / 1000; local += luminance; localMin = Math.min(localMin, luminance); localMax = Math.max(localMax, luminance); } cellStats.push({ score: (local / 144) + (localMax - localMin) * .72, x: column, y: row }); }
  const focus = cellStats.sort((a, b) => b.score - a.score)[0] ?? { x: 1, y: 1, score: 0 };
  const averageLuminance = totalLuminance / (36 * 36);
  const warm = totalRed > totalBlue * 1.06;
  return { positionX: Math.round(((focus.x + .5) / 3) * 100), positionY: Math.round(((focus.y + .5) / 3) * 100), scale: averageLuminance > 175 ? 94 : 106, opacity: averageLuminance > 175 ? 14 : 20, size: warm ? 84 : 76, warm };
}

function PhotoCropEditor({ imageUrl, positionX, positionY, scale, onPositionXChange, onPositionYChange, onScaleChange }: { imageUrl: string; positionX: number; positionY: number; scale: number; onPositionXChange: (value: number) => void; onPositionYChange: (value: number) => void; onScaleChange: (value: number) => void }) {
  const dragRef = useRef<{ startX: number; startY: number; positionX: number; positionY: number } | null>(null);
  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current; if (!drag) return;
    const deltaX = event.clientX - drag.startX; const deltaY = event.clientY - drag.startY;
    onPositionXChange(Math.max(0, Math.min(100, Math.round(drag.positionX - deltaX * .45))));
    onPositionYChange(Math.max(0, Math.min(100, Math.round(drag.positionY - deltaY * .45))));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => { dragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); };
  const changeScale = (delta: number) => onScaleChange(Math.max(60, Math.min(180, scale + delta)));
  return <div className="photo-crop-editor"><div className="photo-crop-frame" onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); dragRef.current = { startX: event.clientX, startY: event.clientY, positionX, positionY }; }} onPointerMove={updateFromPointer} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={(event) => { event.preventDefault(); changeScale(event.deltaY < 0 ? 4 : -4); }} role="application" aria-label="品牌照片裁切框，可拖曳調整焦點，滾輪調整縮放"><img src={imageUrl} alt="可拖曳調整的品牌照片裁切預覽" style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${scale / 100})` }} /><span className="photo-crop-guide">拖曳調整位置 · 滾輪縮放</span></div><div className="photo-crop-controls"><button className="secondary-cta compact" type="button" onClick={() => changeScale(-5)} aria-label="縮小照片">−</button><input aria-label="照片裁切縮放" type="range" min="60" max="180" value={scale} onChange={(event) => onScaleChange(Number(event.target.value))} /><button className="secondary-cta compact" type="button" onClick={() => changeScale(5)} aria-label="放大照片">＋</button><output>{scale}%</output></div></div>;
}

function BrandingPanel({ brandName, smileSize, smileOpacity, brandPhotoUrl, photoPreviewUrl, photoFileName, brandPhotoPositionX, brandPhotoPositionY, brandPhotoScale, isSaving, isUploading, isRemoving, syncStatus, onBrandChange, onSizeChange, onOpacityChange, onPositionXChange, onPositionYChange, onScaleChange, onPhotoUpload, onRemovePhoto, onSave }: { brandName: string; smileSize: number; smileOpacity: number; brandPhotoUrl: string | null; photoPreviewUrl: string | null; photoFileName: string; brandPhotoPositionX: number; brandPhotoPositionY: number; brandPhotoScale: number; isSaving: boolean; isUploading: boolean; isRemoving: boolean; syncStatus: string; onBrandChange: (value: string) => void; onSizeChange: (value: number) => void; onOpacityChange: (value: number) => void; onPositionXChange: (value: number) => void; onPositionYChange: (value: number) => void; onScaleChange: (value: number) => void; onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; onRemovePhoto: () => void; onSave: () => void }) {
  const previewImage = photoPreviewUrl || brandPhotoUrl || defaultSmileAssetUrl;
  const previewPosition = `${brandPhotoPositionX}% ${brandPhotoPositionY}%`;
  const previewScale = brandPhotoScale / 100;
  const hasCustomPhoto = Boolean(brandPhotoUrl || photoPreviewUrl);
  const applySuggestedDesign = () => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const suggestion = analyzePhotoDesign(image);
        onOpacityChange(suggestion.opacity); onSizeChange(suggestion.size); onScaleChange(suggestion.scale); onPositionXChange(suggestion.positionX); onPositionYChange(suggestion.positionY);
        toast.success(suggestion.warm ? "已套用暖色照片的柔和設計建議" : "已套用清晰照片的平衡設計建議");
      } catch { onOpacityChange(18); onSizeChange(80); onScaleChange(100); onPositionXChange(50); onPositionYChange(50); toast.success("已套用通用日系設計建議"); }
    };
    image.onerror = () => { onOpacityChange(18); onSizeChange(80); onScaleChange(100); onPositionXChange(50); onPositionYChange(50); toast.success("已套用通用日系設計建議"); };
    image.src = previewImage;
  };
  return <section className="admin-content-grid branding-page"><div className="panel-heading-row"><div><span className="eyebrow"><Settings size={15} /> BRAND SETTINGS</span><h2>品牌設定</h2><p>上傳一張代表你的照片，調整焦點與浮水印效果，右側預覽會即時更新。</p></div></div><div className="branding-layout"><article className="branding-settings-card"><div className="settings-section-title"><ImagePlus size={18} /><h3>品牌照片</h3></div><label className="upload-dropzone" htmlFor="brand-photo"><span className="upload-icon"><ImagePlus size={22} /></span><strong>{isUploading ? "照片上傳中…" : "選擇照片"}</strong><small>支援 PNG、JPG、WebP，單檔不超過 3 MB</small><input id="brand-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoUpload} disabled={isUploading} /></label>{photoFileName && <div className="selected-file"><span>{photoFileName}</span><span>{isUploading ? "上傳中" : "已上傳"}</span></div>}{hasCustomPhoto && <div className="photo-action-row"><button className="secondary-cta compact" type="button" onClick={applySuggestedDesign} disabled={isUploading || isRemoving}><Sparkles size={15} /> 依照片推薦設計</button><button className="text-danger photo-remove-button" type="button" onClick={onRemovePhoto} disabled={isUploading || isRemoving}>{isRemoving ? "恢復中…" : "移除照片，恢復微笑圖示"}</button></div>}<PhotoCropEditor imageUrl={previewImage} positionX={brandPhotoPositionX} positionY={brandPhotoPositionY} scale={brandPhotoScale} onPositionXChange={onPositionXChange} onPositionYChange={onPositionYChange} onScaleChange={onScaleChange} /><label htmlFor="brand-name">品牌名稱</label><input id="brand-name" value={brandName} onChange={(event) => onBrandChange(event.target.value)} maxLength={120} placeholder="例如：自我探索所" /><div className="control-heading"><label htmlFor="smile-size">浮水印大小</label><output>{smileSize}px</output></div><input id="smile-size" type="range" min="32" max="180" step="1" value={smileSize} onChange={(event) => onSizeChange(Number(event.target.value))} /><div className="control-heading"><label htmlFor="smile-opacity">浮水印深淺</label><output>{smileOpacity}%</output></div><input id="smile-opacity" type="range" min="5" max="70" step="1" value={smileOpacity} onChange={(event) => onOpacityChange(Number(event.target.value))} /><div className="settings-section-title compact-title"><Settings size={18} /><h3>照片構圖</h3></div><div className="control-heading"><label htmlFor="photo-position-x">水平焦點</label><output>{brandPhotoPositionX}%</output></div><input id="photo-position-x" type="range" min="0" max="100" step="1" value={brandPhotoPositionX} onChange={(event) => onPositionXChange(Number(event.target.value))} /><div className="control-heading"><label htmlFor="photo-position-y">垂直焦點</label><output>{brandPhotoPositionY}%</output></div><input id="photo-position-y" type="range" min="0" max="100" step="1" value={brandPhotoPositionY} onChange={(event) => onPositionYChange(Number(event.target.value))} /><div className="control-heading"><label htmlFor="photo-scale">照片縮放</label><output>{brandPhotoScale}%</output></div><input id="photo-scale" type="range" min="60" max="180" step="1" value={brandPhotoScale} onChange={(event) => onScaleChange(Number(event.target.value))} /><p className="branding-sync-status" role="status"><span /> {syncStatus}</p><p className="settings-help">照片會套用到全站右下角浮水印；若沒有上傳照片，系統會使用微笑線條圖示。結果 PNG 仍會保留品牌名稱與測試日期。</p><button className="primary-cta compact" type="button" onClick={onSave} disabled={isSaving || isUploading || !brandName.trim()}>{isSaving ? "儲存中…" : "儲存品牌與浮水印設定"}</button></article><article className="branding-preview-card"><div className="preview-card-heading"><div><span className="eyebrow">LIVE PREVIEW</span><h3>品牌浮水印預覽</h3></div><span className="preview-status"><span /> 即時</span></div><div className="branding-preview-canvas"><div className="preview-paper-copy"><span>{brandName || "自我探索所"}</span><h4>找到屬於你的<br /><em>天賦與節奏</em></h4><p>每個人都有屬於自己的天賦<br />與其努力成為別人，不如好好認識自己。</p></div><div className="preview-photo-window"><img src={previewImage} alt="品牌照片預覽" style={{ objectPosition: previewPosition, transform: `scale(${previewScale})` }} /></div><img className="preview-watermark-image" src={previewImage} alt="" aria-hidden="true" style={{ width: `${smileSize}px`, height: `${smileSize}px`, opacity: smileOpacity / 100, objectPosition: previewPosition, transform: `scale(${previewScale})` }} /><span className="preview-watermark-label">右下角浮水印</span></div><div className="preview-specs"><span>位置：{brandPhotoPositionX}% / {brandPhotoPositionY}%</span><span>大小：{smileSize}px</span><span>深淺：{smileOpacity}%</span></div></article></div></section>;
}
