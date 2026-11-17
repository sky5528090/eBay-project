import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BarChart3, Check, Download, FileSearch, Filter, Link2, Search, ShieldCheck, Trash2, UserCog, Users, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const zodiacOptions = ["牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座"];
const bloodTypeOptions = ["A 型", "B 型", "O 型", "AB 型", "不確定"];
const maritalStatusOptions = ["未婚", "交往中", "已婚", "其他"];

const detailFields = [
  ["name", "姓名 / 暱稱"], ["birthdate", "生日"], ["submitDate", "填寫日期"], ["zodiac", "星座"], ["bloodType", "血型"], ["maritalStatus", "婚姻狀況"], ["hasChildren", "子女狀況"], ["fatherJob", "父親或主要照顧者職業"], ["motherJob", "母親或主要照顧者職業"], ["currentJob", "目前職業"], ["siblings", "兄弟姊妹狀況"], ["preferredTime", "精神時段"], ["diningRole", "聚餐角色"], ["friendshipStyle", "交友方式"], ["socialRole", "團體角色"], ["workDecision", "工作決策"], ["workHabit", "工作習慣"], ["taskFocus", "任務重點"], ["conflictHandling", "衝突處理"], ["communicationStyle", "溝通風格"], ["meetingRole", "會議角色"], ["workEnvironment", "工作環境"], ["groupRole", "團隊貢獻"], ["traitDescription", "自我特質"], ["friendDescription", "朋友形容"], ["consumptionHabit", "消費習慣"], ["shoppingStyle", "購物方式"],
] as const;

type Tab = "records" | "analytics" | "team" | "deletion";

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

function TabButton({ active, icon, children, onClick }: { active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={`admin-tab ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{children}</span></button>;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/submissions/:id");
  const [tab, setTab] = useState<Tab>("records");
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
  const utils = trpc.useUtils();
  const setRoleMutation = trpc.adminTools.admins.setRole.useMutation({ onSuccess: () => { toast.success("角色已更新"); void utils.adminTools.admins.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const inviteMutation = trpc.adminTools.invitations.create.useMutation({ onSuccess: () => { toast.success("邀請碼已建立"); void utils.adminTools.invitations.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const revokeMutation = trpc.adminTools.invitations.revoke.useMutation({ onSuccess: () => { toast.success("邀請碼已撤銷"); void utils.adminTools.invitations.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const processDeletionMutation = trpc.adminTools.deletion.process.useMutation({ onSuccess: () => { toast.success("刪除申請已處理"); void utils.adminTools.deletion.list.invalidate(); }, onError: (error) => toast.error(error.message) });

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

  return <DashboardLayout>
    <div className="admin-page">
      <header className="admin-header"><div><span className="eyebrow"><ShieldCheck size={15} /> ADMIN WORKSPACE</span><h1>特質分析管理中心</h1><p>整理回答、觀察群體趨勢，也管理團隊與資料權限。</p></div><div className="admin-header-actions"><span className="admin-user-pill"><Users size={15} /> {user.name || user.email}</span>{tab === "records" && <button className="primary-cta compact" onClick={handleExport}><Download size={16} /> 匯出完整 CSV</button>}</div></header>
      {!params?.id && <nav className="admin-tabs" aria-label="管理後台分頁"><TabButton active={tab === "records"} icon={<FileSearch size={16} />} onClick={() => setTab("records")}>填寫紀錄</TabButton><TabButton active={tab === "analytics"} icon={<BarChart3 size={16} />} onClick={() => setTab("analytics")}>統計與分析</TabButton><TabButton active={tab === "team"} icon={<UserCog size={16} />} onClick={() => setTab("team")}>團隊與邀請</TabButton><TabButton active={tab === "deletion"} icon={<Trash2 size={16} />} onClick={() => setTab("deletion")}>刪除管理</TabButton></nav>}

      {params?.id ? <section className="admin-detail-panel"><button className="back-link" onClick={() => setLocation("/admin")}><ArrowLeft size={15} /> 返回紀錄列表</button>{detailQuery.isLoading ? <div className="loading-line">正在讀取這份回答…</div> : detail ? <><div className="detail-heading"><div><span className="eyebrow">SUBMISSION DETAIL</span><h2>{String(detail.name || "未命名填寫者")}</h2></div><span className="timestamp">提交於 {formatDate(detail.createdAt)}</span></div><div className="detail-grid">{detailFields.map(([key, label]) => <div className="detail-item" key={key}><span>{label}</span><strong>{String(detail[key] || "—")}</strong></div>)}</div></> : <div className="admin-state-card compact-state"><FileSearch size={28} /><h2>找不到這筆紀錄</h2></div>}</section> : tab === "records" ? <section className="admin-list-panel"><div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="搜尋姓名、星座、職業…" /><button type="button" aria-label="清除搜尋" onClick={() => { setSearch(""); setPage(0); }}><X size={15} /></button></div><div className="filter-controls"><select className="filter-select" value={zodiacFilter} onChange={(event) => { setZodiacFilter(event.target.value); setPage(0); }} aria-label="依星座篩選"><option value="">全部星座</option>{zodiacOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><select className="filter-select" value={bloodTypeFilter} onChange={(event) => { setBloodTypeFilter(event.target.value); setPage(0); }} aria-label="依血型篩選"><option value="">全部血型</option>{bloodTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><select className="filter-select" value={maritalStatusFilter} onChange={(event) => { setMaritalStatusFilter(event.target.value); setPage(0); }} aria-label="依婚姻狀況篩選"><option value="">全部婚姻狀況</option>{maritalStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><label className="date-filter"><span>從</span><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} aria-label="提交日期起始" /></label><label className="date-filter"><span>至</span><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} aria-label="提交日期結束" /></label>{hasFilters && <button className="clear-filter" type="button" onClick={clearFilters}>清除篩選</button>}</div><span className="filter-note"><Filter size={14} /> 共 {total} 筆紀錄</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>編號</th><th>姓名</th><th>生日</th><th>星座</th><th>目前職業</th><th>提交時間</th><th>操作</th></tr></thead><tbody>{listQuery.isLoading ? <tr><td colSpan={7} className="table-empty">正在載入紀錄…</td></tr> : items.length === 0 ? <tr><td colSpan={7} className="table-empty">目前還沒有符合條件的填寫紀錄。</td></tr> : items.map((item) => <tr key={String(item.id)}><td className="muted-cell">#{String(item.id)}</td><td><strong>{String(item.name || "未命名")}</strong></td><td>{String(item.birthdate || "—")}</td><td><span className="soft-tag">{String(item.zodiac || "—")}</span></td><td>{String(item.currentJob || "—")}</td><td className="muted-cell">{formatDate(item.createdAt)}</td><td><Link className="detail-link" href={`/admin/submissions/${String(item.id)}`}>查看詳情 <ArrowRight /></Link></td></tr>)}</tbody></table></div><div className="pagination"><button className="secondary-cta compact" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>上一頁</button><span>第 {page + 1} 頁 · {items.length} / {total}</span><button className="secondary-cta compact" disabled={(page + 1) * limit >= total} onClick={() => setPage((value) => value + 1)}>下一頁</button></div></section> : tab === "analytics" ? <AnalyticsPanel data={analytics} /> : tab === "team" ? <TeamPanel users={admins} invitations={invitations} onCreate={createInvite} onRole={(id, role) => setRoleMutation.mutate({ userId: id, role })} onRevoke={(id) => revokeMutation.mutate({ id })} /> : <DeletionPanel requests={deletionRequests} onProcess={(id, status) => processDeletionMutation.mutate({ id, status })} />}
    </div>
  </DashboardLayout>;
}

function AnalyticsPanel({ data }: { data: any }) {
  return <section className="admin-content-grid"><div className="analytics-hero"><div><span className="eyebrow"><BarChart3 size={15} /> INSIGHT REPORT</span><h2>回答者群體的節奏</h2><p>這些統計只反映已提交的問卷，不代表個人診斷或固定標籤。</p></div><div className="big-stat"><strong>{data?.totalSubmissions ?? 0}</strong><span>總提交份數</span></div></div><div className="analytics-grid"><article className="analytics-card"><h3>星座分佈</h3><ChartRows rows={data?.zodiacStats ?? []} labelKey="zodiac" color="#6a9fc3" /></article><article className="analytics-card"><h3>血型分佈</h3><ChartRows rows={data?.bloodStats ?? []} labelKey="bloodType" color="#d68d83" /></article><article className="analytics-card"><h3>婚姻狀況</h3><ChartRows rows={data?.maritalStats ?? []} labelKey="maritalStatus" color="#91b59b" /></article><article className="analytics-card"><h3>常見職業關鍵字</h3><ChartRows rows={data?.currentJobStats ?? []} labelKey="currentJob" color="#c9a56b" /></article></div><div className="analytics-card trend-card"><h3>最近提交趨勢</h3><ChartRows rows={data?.recentTrend ?? []} labelKey="date" color="#9077aa" /></div></section>;
}

function TeamPanel({ users, invitations, onCreate, onRole, onRevoke }: { users: Array<Record<string, unknown>>; invitations: Array<Record<string, unknown>>; onCreate: () => void; onRole: (id: number, role: "user" | "admin") => void; onRevoke: (id: number) => void }) {
  return <section className="admin-content-grid"><div className="panel-heading-row"><div><span className="eyebrow"><UserCog size={15} /> TEAM ACCESS</span><h2>團隊與邀請</h2><p>角色調整會立即影響後台存取權。請只授權給必要的人員。</p></div><button className="primary-cta compact" onClick={onCreate}><Link2 size={16} /> 建立 7 日邀請</button></div><article className="admin-table-card"><h3>目前帳號</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>帳號</th><th>Email</th><th>目前角色</th><th>最後登入</th><th>調整</th></tr></thead><tbody>{users.length ? users.map((item) => <tr key={String(item.id)}><td><strong>{String(item.name || "未命名")}</strong></td><td>{String(item.email || "—")}</td><td><span className={`role-tag ${item.role === "admin" ? "admin" : "user"}`}>{item.role === "admin" ? "管理員" : "一般使用者"}</span></td><td>{formatDate(item.lastSignedIn)}</td><td><select className="filter-select" value={String(item.role)} onChange={(event) => onRole(Number(item.id), event.target.value as "user" | "admin")}><option value="user">一般使用者</option><option value="admin">管理員</option></select></td></tr>) : <tr><td colSpan={5} className="table-empty">目前沒有可顯示的帳號。</td></tr>}</tbody></table></div></article><article className="admin-table-card"><h3>邀請碼</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>邀請碼</th><th>狀態</th><th>建立時間</th><th>到期時間</th><th>操作</th></tr></thead><tbody>{invitations.length ? invitations.map((item) => <tr key={String(item.id)}><td><code>{String(item.code)}</code></td><td><span className="soft-tag">{String(item.status)}</span></td><td>{formatDate(item.createdAt)}</td><td>{formatDate(item.expiresAt)}</td><td>{item.status === "pending" && <button className="text-danger" onClick={() => onRevoke(Number(item.id))}>撤銷</button>}</td></tr>) : <tr><td colSpan={5} className="table-empty">尚未建立邀請碼。</td></tr>}</tbody></table></div></article></section>;
}

function DeletionPanel({ requests, onProcess }: { requests: Array<Record<string, unknown>>; onProcess: (id: number, status: "completed" | "rejected") => void }) {
  return <section className="admin-content-grid"><div className="panel-heading-row"><div><span className="eyebrow"><Trash2 size={15} /> DATA GOVERNANCE</span><h2>資料刪除管理</h2><p>完成申請後，系統會依姓名與生日刪除對應問卷紀錄；處理前請人工核對申請人身分。</p></div></div><article className="admin-table-card"><h3>刪除申請</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>申請人 Email</th><th>問卷姓名</th><th>生日</th><th>原因</th><th>狀態</th><th>申請時間</th><th>操作</th></tr></thead><tbody>{requests.length ? requests.map((item) => <tr key={String(item.id)}><td>{String(item.targetEmail)}</td><td>{String(item.targetName)}</td><td>{String(item.targetBirthdate)}</td><td className="reason-cell">{String(item.reason || "—")}</td><td><span className="soft-tag">{String(item.status)}</span></td><td>{formatDate(item.createdAt)}</td><td>{item.status === "pending" && <div className="inline-actions"><button className="text-success" onClick={() => onProcess(Number(item.id), "completed")}><Check size={14} /> 完成刪除</button><button className="text-danger" onClick={() => onProcess(Number(item.id), "rejected")}>駁回</button></div>}</td></tr>) : <tr><td colSpan={7} className="table-empty">目前沒有刪除申請。</td></tr>}</tbody></table></div></article></section>;
}
