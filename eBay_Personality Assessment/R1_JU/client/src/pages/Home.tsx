import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Leaf, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const questions = [
  { key: "name", title: "先從一個熟悉的稱呼開始吧", subtitle: "可以填寫姓名或您習慣的暱稱", type: "text", placeholder: "例如：小安" },
  { key: "birthdate", title: "您的生日是？", subtitle: "我們會依生日協助整理您的個人資料", type: "date" },
  { key: "submitDate", title: "今天是您填寫問卷的日子", subtitle: "系統會自動記錄提交時間，這裡請確認填寫日期", type: "date" },
  { key: "zodiac", title: "您的星座是？", subtitle: "選一個最符合您的星座", type: "select", options: ["牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座"] },
  { key: "bloodType", title: "您的血型是？", subtitle: "不知道也沒關係，可以選擇不確定", type: "choice", options: ["A 型", "B 型", "O 型", "AB 型", "不確定"] },
  { key: "maritalStatus", title: "目前的婚姻狀況？", subtitle: "請依現在的狀態選擇", type: "choice", options: ["未婚", "交往中", "已婚", "其他"] },
  { key: "hasChildren", title: "目前有孩子嗎？", subtitle: "這一題可以自由選擇是否回答", type: "choice", options: ["有", "沒有", "不方便回答"] },
  { key: "fatherJob", title: "父親或主要照顧者的職業？", subtitle: "若不方便回答，可以填寫「不便回答」", type: "text", placeholder: "例如：商業、教育、自由業" },
  { key: "motherJob", title: "母親或主要照顧者的職業？", subtitle: "若不方便回答，可以填寫「不便回答」", type: "text", placeholder: "例如：醫療、服務、自由業" },
  { key: "currentJob", title: "您目前的職業是？", subtitle: "也可以填寫目前的身分，例如學生、自由工作者", type: "text", placeholder: "例如：品牌企劃" },
  { key: "siblings", title: "您的兄弟姊妹狀況？", subtitle: "簡單描述排行或手足人數即可", type: "text", placeholder: "例如：獨生子女、排行老二" },
  { key: "preferredTime", title: "您比較有精神的時段？", subtitle: "沒有標準答案，選最貼近生活的就好", type: "choice", options: ["早晨", "白天", "傍晚", "深夜", "不固定"] },
  { key: "diningRole", title: "和朋友吃飯時，您通常是哪一種角色？", subtitle: "想想看大家會不會自然等您做決定", type: "choice", options: ["決定去哪裡的人", "負責找餐廳的人", "配合大家的人", "臨時起意的人"] },
  { key: "friendshipStyle", title: "您習慣怎麼建立友誼？", subtitle: "選擇最像您的相處節奏", type: "choice", options: ["慢慢熟悉、穩定陪伴", "聊得來就快速靠近", "透過共同興趣連結", "需要獨處與距離"] },
  { key: "socialRole", title: "在團體裡，您通常扮演什麼角色？", subtitle: "這是對自己日常觀察的練習", type: "choice", options: ["帶動氣氛", "聆聽與支持", "整理資訊", "觀察後再加入"] },
  { key: "workDecision", title: "工作遇到選擇時，您通常怎麼決定？", subtitle: "直覺、資料與他人意見都可以是答案", type: "choice", options: ["快速決定並行動", "蒐集完整資料後決定", "先詢問信任的人", "讓事情自然發展"] },
  { key: "workHabit", title: "您的工作習慣比較接近哪一種？", subtitle: "選最常出現的狀態即可", type: "choice", options: ["先規劃再執行", "邊做邊調整", "期限前集中完成", "依照當下狀態安排"] },
  { key: "taskFocus", title: "處理任務時，您最在意什麼？", subtitle: "每一種重視都很有價值", type: "choice", options: ["效率與結果", "品質與細節", "團隊感受", "創意與可能性"] },
  { key: "conflictHandling", title: "遇到意見不合時，您通常會？", subtitle: "回想一次最近的經驗", type: "choice", options: ["直接說清楚", "先冷靜觀察", "尋找雙方都能接受的方法", "暫時離開再思考"] },
  { key: "communicationStyle", title: "您偏好的溝通方式？", subtitle: "請選擇最舒服的表達方式", type: "choice", options: ["直接明確", "溫和迂迴", "文字整理後再說", "面對面聊最有效"] },
  { key: "meetingRole", title: "開會時，您通常會？", subtitle: "不用想太久，第一直覺就很好", type: "choice", options: ["主動發言", "提出關鍵問題", "整理共識", "先聽完再補充"] },
  { key: "workEnvironment", title: "什麼樣的工作環境讓您發揮最好？", subtitle: "想像一個理想的工作日", type: "choice", options: ["自主彈性", "清楚制度", "充滿交流", "安靜專注"] },
  { key: "groupRole", title: "在合作專案中，您最常帶來什麼？", subtitle: "看見自己的貢獻，也是一種天賦練習", type: "choice", options: ["推動進度", "整合資源", "發想創意", "穩定團隊"] },
  { key: "traitDescription", title: "如果用三個詞形容自己？", subtitle: "請寫下您認為最貼近自己的詞語", type: "textarea", placeholder: "例如：細膩、好奇、有責任感" },
  { key: "friendDescription", title: "朋友通常怎麼形容您？", subtitle: "可以寫一句話，也可以寫幾個關鍵字", type: "textarea", placeholder: "例如：很可靠、很會傾聽" },
  { key: "consumptionHabit", title: "日常消費時，您最重視什麼？", subtitle: "每一種選擇都反映您的生活價值", type: "choice", options: ["實用與耐用", "品質與體驗", "價格與優惠", "喜歡就值得"] },
  { key: "shoppingStyle", title: "購物前，您通常會？", subtitle: "這是最後一題，謝謝您一路陪自己走到這裡", type: "choice", options: ["先做完整比較", "看到喜歡的就下單", "詢問身邊的人", "等需要時再買"] },
] as const;

type FormValues = Record<string, string>;

function getInitialValues(): FormValues {
  return Object.fromEntries(questions.map((question) => [question.key, ""]));
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [values, setValues] = useState<FormValues>(() => getInitialValues());
  const submitMutation = trpc.questionnaire.submit.useMutation({
    onSuccess: () => {
      setStarted(false);
      setCurrent(0);
      setValues(getInitialValues());
      toast.success("謝謝您完成這份自我探索，資料已安全送出。", { duration: 5000 });
    },
    onError: (error) => toast.error(error.message || "送出時發生問題，請稍後再試。"),
  });

  const question = questions[current];
  const progress = Math.round(((current + 1) / questions.length) * 100);
  const answer = values[question.key] ?? "";
  const canContinue = question.key === "hasChildren" || answer.trim().length > 0;
  const isLast = current === questions.length - 1;

  const updateAnswer = (value: string) => {
    setValues((previous) => ({ ...previous, [question.key]: value }));
  };

  const goNext = () => {
    if (!canContinue) {
      toast.error("請先完成這一題，再繼續往下探索。", { duration: 2500 });
      return;
    }
    if (isLast) {
      submitMutation.mutate({ ...values, submitDate: values.submitDate || new Date().toISOString().slice(0, 10) } as any);
      return;
    }
    setCurrent((index) => index + 1);
  };

  const goBack = () => setCurrent((index) => Math.max(0, index - 1));

  const floatingDots = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);

  if (!started) {
    return (
      <main className="warm-shell landing-shell">
        {floatingDots.map((dot) => <span key={dot} className={`floating-dot dot-${dot}`} aria-hidden="true" />)}
        <header className="public-nav">
          <div className="brand-mark"><Leaf size={17} strokeWidth={2.3} /> <span>自我探索所</span></div>
          <Link href="/admin" className="admin-entry"><LockKeyhole size={14} /> 管理員入口</Link>
        </header>
        <section className="landing-grid">
          <div className="landing-copy">
            <span className="eyebrow"><Sparkles size={15} /> 了解自己，是一份溫柔的開始</span>
            <h1>找到屬於你的<br /><em>天賦與節奏</em></h1>
            <p className="landing-lead">每個人都有屬於自己的天賦🌱<br />與其努力成為別人，不如好好認識自己。<br />我將陪著你找到屬於自己的節奏～</p>
            <div className="landing-actions">
              <button className="primary-cta" onClick={() => setStarted(true)}>開始填寫 <ArrowRight size={18} /></button>
              <span className="time-note">約 5 分鐘 · 共 27 題 · 不需登入</span>
            </div>
          </div>
          <div className="landing-visual" aria-label="溫暖日系插畫風格的自我探索卡片">
            <div className="sun-disc" />
            <div className="leaf-illustration leaf-one">❋</div>
            <div className="leaf-illustration leaf-two">✽</div>
            <div className="portrait-card">
              <div className="portrait-circle"><span>◡</span></div>
              <div className="portrait-caption"><strong>今天，也好好陪伴自己</strong><span>small steps, soft heart</span></div>
            </div>
            <div className="quote-card"><span>「</span><p>你不需要變成別人，<br />只需要更靠近自己。</p><span className="quote-end">」</span></div>
          </div>
        </section>
        <footer className="landing-footer"><span>▸ 溫柔填寫，沒有標準答案</span><span>▸ 你的回答只用於本次特質分析</span><Link href="/privacy" className="privacy-footer-link">▸ 隱私權與資料刪除</Link></footer>
      </main>
    );
  }

  return (
    <main className="warm-shell form-shell">
      <div className="form-topbar">
        <button className="icon-button" onClick={() => setStarted(false)} aria-label="返回首頁"><ArrowLeft size={18} /></button>
        <div className="form-brand"><Leaf size={16} /> 特質分析</div>
        <span className="question-count">{current + 1} / {questions.length}</span>
      </div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <section className="question-stage">
        <div className="question-card" key={question.key}>
          <span className="question-kicker">QUESTION {String(current + 1).padStart(2, "0")}</span>
          <h2>{question.title}</h2>
          <p className="question-subtitle">{question.subtitle}</p>
          <div className="answer-area">
            {question.type === "text" && <input autoFocus value={answer} onChange={(event) => updateAnswer(event.target.value)} placeholder={question.placeholder} onKeyDown={(event) => event.key === "Enter" && goNext()} />}
            {question.type === "date" && <input autoFocus type="date" value={answer} onChange={(event) => updateAnswer(event.target.value)} />}
            {question.type === "textarea" && <textarea autoFocus value={answer} onChange={(event) => updateAnswer(event.target.value)} placeholder={question.placeholder} rows={4} />}
            {question.type === "select" && <select autoFocus value={answer} onChange={(event) => updateAnswer(event.target.value)}><option value="">請選擇星座</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>}
            {question.type === "choice" && <div className="choice-grid">{question.options.map((option) => <button key={option} type="button" className={`choice-button ${answer === option ? "selected" : ""}`} onClick={() => updateAnswer(option)}>{option}<span>{answer === option ? <Check size={17} /> : ""}</span></button>)}</div>}
          </div>
          <div className="question-navigation">
            <button className="secondary-cta" onClick={goBack} disabled={current === 0}><ArrowLeft size={17} /> 上一題</button>
            <button className="primary-cta compact" onClick={goNext} disabled={submitMutation.isPending}>{submitMutation.isPending ? "正在保存…" : isLast ? <>完成並送出 <Check size={17} /></> : <>下一題 <ArrowRight size={17} /></>}</button>
          </div>
          <span className="privacy-note"><LockKeyhole size={13} /> 您的回答會被妥善保存，僅供管理員進行後續分析</span>
        </div>
      </section>
    </main>
  );
}

export { questions };
export type { FormValues };

