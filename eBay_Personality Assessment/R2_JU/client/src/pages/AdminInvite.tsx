import { useState } from "react";
import { Link } from "wouter";
import { Check, KeyRound, Leaf, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function AdminInvite() {
  const { user, loading } = useAuth();
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("code") ?? "");
  const acceptMutation = trpc.adminTools.invitations.accept.useMutation({
    onSuccess: () => { toast.success("管理員權限已啟用"); window.location.href = "/admin"; },
    onError: (error) => toast.error(error.message || "邀請碼無法使用"),
  });
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { startLogin(); return; }
    acceptMutation.mutate({ code: code.trim() });
  };

  return <main className="warm-shell invite-shell"><header className="privacy-nav"><Link href="/" className="brand-mark"><Leaf size={17} strokeWidth={2.3} /><span>自我探索所</span></Link><Link href="/" className="back-link">回到首頁</Link></header><section className="invite-card"><div className="privacy-icon"><ShieldCheck size={22} /></div><span className="eyebrow"><KeyRound size={15} /> ADMIN INVITATION</span><h1>加入管理團隊</h1><p>管理員邀請碼只應由受邀的人使用。登入後送出邀請碼，即可啟用後台權限。</p>{loading ? <div className="loading-line">正在確認登入狀態…</div> : <form className="privacy-form" onSubmit={submit}><label>邀請碼<input value={code} onChange={(event) => setCode(event.target.value)} required minLength={8} maxLength={64} placeholder="貼上邀請連結中的 code" /></label><button className="primary-cta" type="submit" disabled={acceptMutation.isPending}>{user ? <><Check size={17} /> {acceptMutation.isPending ? "正在啟用…" : "啟用管理員權限"} </> : <><LogIn size={17} /> 先登入再接受邀請</>}</button></form>}<small className="invite-note">若您不是受邀者，請返回公開問卷；管理後台資料不會對一般使用者開放。</small></section></main>;
}
