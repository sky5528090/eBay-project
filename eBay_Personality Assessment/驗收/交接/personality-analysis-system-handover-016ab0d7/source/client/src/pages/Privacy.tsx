import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Leaf, LockKeyhole, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SmileWatermark from "@/components/SmileWatermark";

export default function Privacy() {
  const [targetEmail, setTargetEmail] = useState("");
  const [targetName, setTargetName] = useState("");
  const [targetBirthdate, setTargetBirthdate] = useState("");
  const [reason, setReason] = useState("");
  const deletionMutation = trpc.adminTools.deletion.request.useMutation({
    onSuccess: () => {
      setTargetEmail("");
      setTargetName("");
      setTargetBirthdate("");
      setReason("");
      toast.success("申請已送出，我們會在核對後處理。", { duration: 5000 });
    },
    onError: (error) => toast.error(error.message || "申請送出失敗，請稍後再試。"),
  });

  const submitRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    deletionMutation.mutate({ targetEmail, targetName, targetBirthdate, reason: reason || undefined });
  };

  return <main className="warm-shell privacy-shell"><SmileWatermark /><header className="privacy-nav"><Link href="/" className="brand-mark"><Leaf size={17} strokeWidth={2.3} /><span>自我探索所</span></Link><Link href="/" className="back-link"><ArrowLeft size={15} /> 返回首頁</Link></header><section className="privacy-layout"><div className="privacy-copy"><span className="eyebrow"><LockKeyhole size={15} /> PRIVACY & CARE</span><h1>讓每一次自我探索，<em>都被好好對待</em></h1><p>我們只將您提交的內容用於本系統的特質分析與管理用途。資料不會公開展示；管理後台也只開放給具有 admin 角色的帳號。</p><div className="privacy-points"><div><strong>收集什麼</strong><span>您在 13 題問卷中主動填寫的內容，以及系統自動記錄的提交時間。</span></div><div><strong>如何使用</strong><span>用於個人特質整理、群體統計與管理員後續分析，不作為醫療或人格診斷。</span></div><div><strong>如何刪除</strong><span>您可以提出刪除申請。管理員核對姓名與生日後，將移除相符的問卷紀錄。</span></div></div></div><section className="privacy-card"><div className="privacy-card-heading"><div className="privacy-icon"><Trash2 size={20} /></div><div><h2>申請刪除我的資料</h2><p>請填寫當初問卷中的姓名與生日，方便我們找到正確紀錄。</p></div></div><form className="privacy-form" onSubmit={submitRequest}><label>Email（用於聯絡核對）<input type="email" value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} required placeholder="you@example.com" /></label><label>問卷姓名／暱稱<input value={targetName} onChange={(event) => setTargetName(event.target.value)} required placeholder="當初填寫的姓名或暱稱" /></label><label>問卷生日<input type="date" value={targetBirthdate} onChange={(event) => setTargetBirthdate(event.target.value)} required /></label><label>補充說明（選填）<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="如有需要，可補充申請原因" /></label><button className="primary-cta" type="submit" disabled={deletionMutation.isPending}>{deletionMutation.isPending ? "正在送出…" : <>送出刪除申請 <Check size={17} /></>}</button><small>送出後，管理員會先核對申請資訊，再處理資料刪除。</small></form></section></section><footer className="privacy-footer">最後更新：2026 年 8 月　·　若您對資料使用有疑問，請透過申請表補充說明。</footer></main>;
}
