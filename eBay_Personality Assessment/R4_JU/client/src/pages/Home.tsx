import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Leaf, LockKeyhole, Moon, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SmileWatermark from "@/components/SmileWatermark";
import { calculateGroupedQuestionnaire, QUESTION_GROUPS, type GroupSelectionRounds } from "../../../shared/groupedQuestionnaire";
import { formatSubmissionError, getVisibleQuestionKeys } from "../../../shared/questionnaireHelpers";
import { useTheme } from "@/contexts/ThemeContext";

const questions = [
  { key: "name", title: "你的名字", subtitle: "", type: "text", placeholder: "例如：小安" },
  { key: "birthdate", title: "你的生日是？", subtitle: "", type: "date" },
  { key: "submitDate", title: "今天是你填寫問卷的日子", subtitle: "系統會自動記錄提交時間，這裡請確認填寫日期", type: "date", emphasisSubtitle: true },
  { key: "zodiac", title: "你的星座是？", subtitle: "", type: "select", options: ["牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座"] },
  { key: "bloodType", title: "你的血型是？", subtitle: "不知道也沒關係，可以選擇不確定", type: "choice", emphasisSubtitle: true, options: ["A 型", "B 型", "O 型", "AB 型", "不確定"] },
  { key: "maritalStatus", title: "目前的婚姻狀況？", subtitle: "請依現在的狀態選擇", type: "choice", emphasisSubtitle: true, options: ["未婚", "交往中", "已婚", "其他"] },
  { key: "hasChildren", title: "目前有孩子嗎？", subtitle: "", type: "choice", options: ["有", "沒有", "不方便回答"] },
  { key: "fatherJob", title: "你3~6歲的時候，爸爸的職業是？", subtitle: "", type: "text", placeholder: "例如：商業、教育、自由業" },
  { key: "motherJob", title: "你3~6歲的時候，媽媽的職業是？", subtitle: "", type: "text", placeholder: "例如：醫療、服務、自由業" },
  { key: "currentJob", title: "你目前的職業是？", subtitle: "也可以填寫目前的身分，例如學生、自由工作者", type: "text", placeholder: "例如：品牌企劃" },
  { key: "siblings", title: "你是否有兄弟姐妹", subtitle: "", type: "choice", options: ["有", "沒有"] },
  { key: "preferredTime", title: "方便預約解析的時段", subtitle: "", type: "choice", options: ["平日白天", "平日晚間", "假日白天", "假日晚間"] },
  { key: "siblingsJobs", title: "兄弟姐妹現在的工作是？", subtitle: "", type: "text", placeholder: "例如：哥哥是工程師，妹妹是教師" },
] as const;

type FormValues = Record<string, string>;

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "切換為淺色模式" : "切換為深色模式";
  return <button type="button" className="theme-toggle-button public-theme-toggle" onClick={() => toggleTheme?.()} aria-label={label} title={label}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>;
}

function getInitialValues(): FormValues {
  return Object.fromEntries(questions.map((question) => [question.key, ""]));
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [values, setValues] = useState<FormValues>(() => getInitialValues());
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTraitIntro, setShowTraitIntro] = useState(false);
  const [groupRounds, setGroupRounds] = useState<number[][][]>(() => Array.from({ length: QUESTION_GROUPS.length }, () => []));
  const [groupIndex, setGroupIndex] = useState(0);
  const [groupRound, setGroupRound] = useState(0);
  const [groupSelection, setGroupSelection] = useState<number[]>([]);
  const submitMutation = trpc.questionnaire.submit.useMutation({
    onSuccess: () => {
      setCurrent(0);
      setValues(getInitialValues());
      setGroupRounds(Array.from({ length: QUESTION_GROUPS.length }, () => []));
      setGroupIndex(0);
      setGroupRound(0);
      setGroupSelection([]);
      setShowCompletionModal(true);
    },
    onError: (error) => toast.error(formatSubmissionError(error.message)),
  });

  const visibleQuestions = useMemo(() => questions.filter((question) => question.key !== "siblingsJobs"), []);
  const question = visibleQuestions[Math.min(current, visibleQuestions.length - 1)];
  const isGroupedStage = current >= visibleQuestions.length;
  const currentGroup = QUESTION_GROUPS[groupIndex];
  const expectedPickCount = [4, 2, 1][groupRound] ?? 1;
  const totalStages = visibleQuestions.length + QUESTION_GROUPS.length * 3;
  const progress = isGroupedStage ? 100 : Math.round(((current + 1) / totalStages) * 100);
  const answer = values[question?.key ?? ""] ?? "";
  const needsSiblingRank = question?.key === "siblings" && answer === "有";
  const canContinue = question?.key === "hasChildren" ? true : question?.key === "siblings" ? answer.trim().length > 0 && (!needsSiblingRank || ((values.siblingsRank ?? "").trim().length > 0 && (values.siblingsJobs ?? "").trim().length > 0)) : answer.trim().length > 0;
  const isLast = current === visibleQuestions.length - 1;

  useEffect(() => {
    if (!started || showCompletionModal || showTraitIntro) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === "ArrowRight" || (event.key === "Enter" && !isGroupedStage)) {
        event.preventDefault();
        if (isGroupedStage) completeGroupRound();
        else goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, showCompletionModal, showTraitIntro, isGroupedStage, current, groupIndex, groupRound, groupSelection, values, groupRounds]);

  const updateAnswer = (key: string, value: string) => setValues((previous) => ({ ...previous, [key]: value }));

  const goNext = () => {
    if (!canContinue) {
      toast.error(question?.key === "siblings" && needsSiblingRank ? "請補充兄弟姐妹排行與工作狀況，再繼續。" : "請先完成這一題，再繼續往下探索。", { duration: 2500 });
      return;
    }
    if (isLast) setShowTraitIntro(true);
    else setCurrent((index) => index + 1);
  };

  const goBack = () => {
    if (showTraitIntro) {
      setShowTraitIntro(false);
      return;
    }
    if (isGroupedStage) {
      if (groupRound > 0) {
        setGroupRound((round) => round - 1);
        setGroupSelection(groupRounds[groupIndex][groupRound - 1] ?? []);
      } else if (groupIndex > 0) {
        setGroupIndex((index) => index - 1);
        setGroupRound(2);
        setGroupSelection(groupRounds[groupIndex - 1][2] ?? []);
      } else setCurrent(visibleQuestions.length - 1);
      return;
    }
    setCurrent((index) => Math.max(0, index - 1));
  };

  const toggleGroupOption = (position: number) => {
    setGroupSelection((selected) => selected.includes(position)
      ? selected.filter((item) => item !== position)
      : selected.length < expectedPickCount ? [...selected, position] : selected);
  };

  const completeGroupRound = () => {
    if (groupSelection.length !== expectedPickCount) {
      toast.error(`請選擇 ${expectedPickCount} 個選項，再繼續。`);
      return;
    }
    const nextRounds = groupRounds.map((rounds, index) => index === groupIndex ? [...rounds.slice(0, groupRound), groupSelection] : rounds);
    setGroupRounds(nextRounds);
    if (groupRound < 2) {
      setGroupRound((round) => round + 1);
      setGroupSelection([]);
    } else if (groupIndex < QUESTION_GROUPS.length - 1) {
      setGroupIndex((index) => index + 1);
      setGroupRound(0);
      setGroupSelection([]);
    } else {
      try {
        const result = calculateGroupedQuestionnaire(nextRounds as unknown as GroupSelectionRounds[]);
        if (!result.isValid || result.totalScore !== 50) throw new Error("總分驗證未通過");
        const submissionValues = { ...values };
        if (submissionValues.siblings !== "有") {
          submissionValues.siblingsRank = "";
          submissionValues.siblingsJobs = "";
        }
        submitMutation.mutate({ ...submissionValues, submitDate: submissionValues.submitDate || new Date().toISOString().slice(0, 10), groupedRounds: nextRounds } as any);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "題組計分失敗，請重新確認選擇。");
      }
    }
  };

  const floatingDots = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);

  if (!started) {
    return (
      <main className="warm-shell landing-shell">
        {floatingDots.map((dot) => <span key={dot} className={`floating-dot dot-${dot}`} aria-hidden="true" />)}
        <header className="public-nav"><div className="brand-mark"><Leaf size={17} strokeWidth={2.3} /> <span>自我探索所</span></div><div className="public-nav-actions"><ThemeToggle /><Link href="/admin" className="admin-entry"><LockKeyhole size={14} /> 管理員入口</Link></div></header>
        <section className="landing-grid">
          <div className="landing-copy"><span className="eyebrow"><Sparkles size={15} /> 了解自己，是一份溫柔的開始</span><h1>找到屬於你的<br /><em>天賦與節奏</em></h1><p className="landing-lead">每個人都有屬於自己的天賦🌱<br />與其努力成為別人，不如好好認識自己。<br />我將陪著你找到屬於自己的節奏～</p><div className="landing-actions"><button className="primary-cta" onClick={() => setStarted(true)}>開始填寫 <ArrowRight size={18} /></button></div></div>
          <div className="landing-visual" aria-label="溫暖日系插畫風格的自我探索視覺"><div className="sun-disc"><img className="smile-hero-icon" src="/manus-storage/smile-black-transparent_bb9c220a.png" alt="" aria-hidden="true" /></div><div className="leaf-illustration leaf-one">❋</div><div className="leaf-illustration leaf-two">✽</div></div>
        </section>
        <footer className="landing-footer"><span>▸ 溫柔填寫，沒有標準答案</span><span>▸ 你的回答只用於本次特質分析</span><Link href="/privacy" className="privacy-footer-link">▸ 隱私權與資料刪除</Link></footer>
      </main>
    );
  }

  if (showTraitIntro) {
    return (
      <main className="warm-shell form-shell"><SmileWatermark /><div className="form-topbar"><button className="icon-button" onClick={() => setShowTraitIntro(false)} aria-label="返回上一階段"><ArrowLeft size={18} /></button><div className="form-brand"><Leaf size={16} /> 特質分析</div><span className="question-count">準備進入特質測驗</span><ThemeToggle /></div><div className="progress-track"><span style={{ width: "100%" }} /></div><section className="question-stage"><div className="question-card trait-intro-card"><span className="question-kicker">NEXT STEP</span><h2>準備開始特質測驗</h2><p className="trait-intro-message">填寫過程，請依照現在主業的工作行為模式<br /><span className="trait-highlight">做選擇</span></p><button className="primary-cta trait-intro-button" type="button" onClick={() => { setShowTraitIntro(false); setCurrent(visibleQuestions.length); }}>進入特質測驗 <ArrowRight size={18} /></button></div></section></main>
    );
  }

  if (isGroupedStage) {
    const availableOptions = groupRound === 0 ? currentGroup.options : currentGroup.options.filter((option) => (groupRounds[groupIndex][groupRound - 1] ?? []).includes(option.position));
    const groupedStageNumber = visibleQuestions.length + groupIndex * 3 + groupRound + 1;
    return (
      <main className="warm-shell form-shell"><SmileWatermark /><div className="form-topbar"><button className="icon-button" onClick={goBack} aria-label="返回上一階段"><ArrowLeft size={18} /></button><div className="form-brand"><Leaf size={16} /> 特質分析</div><span className="question-count">{groupedStageNumber} / {totalStages} · 題組 {groupIndex + 1} / 5</span><ThemeToggle /></div><div className="progress-track"><span style={{ width: `${Math.round((groupedStageNumber / totalStages) * 100)}%` }} /></div><section className="question-stage"><div className="question-card group-selection-card"><span className="question-kicker">TRAIT GROUP {String(groupIndex + 1).padStart(2, "0")}</span><h2>{currentGroup.title}</h2><p className="question-subtitle">{groupRound === 0 ? "請從 8 個選項中選出 4 個" : groupRound === 1 ? "從上一輪保留的 4 個選項中選出 2 個" : "從上一輪保留的 2 個選項中選出 1 個"}</p><div className="group-selection-grid">{availableOptions.map((option) => <button key={option.position} type="button" className={`group-option-button ${groupSelection.includes(option.position) ? "selected" : ""}`} onClick={() => toggleGroupOption(option.position)}><span className="option-position">{option.position + 1}</span><span>{option.label}</span>{groupSelection.includes(option.position) && <Check size={17} />}</button>)}</div><div className="selection-counter">已選 {groupSelection.length} / {expectedPickCount}</div><div className="question-navigation"><button className="secondary-cta" onClick={goBack}><ArrowLeft size={17} /> 上一步</button><button className="primary-cta compact" onClick={completeGroupRound} disabled={submitMutation.isPending}>{submitMutation.isPending ? "正在保存…" : groupIndex === 4 && groupRound === 2 ? <>完成並送出 <Check size={17} /></> : <>確認選擇 <ArrowRight size={17} /></>}</button></div><span className="privacy-note"><LockKeyhole size={13} /> 每個題組會自動驗證為 10 分，五組合計 50 分</span></div></section></main>
    );
  }

  return (
    <main className="warm-shell form-shell"><SmileWatermark /><div className="form-topbar"><button className="icon-button" onClick={() => setStarted(false)} aria-label="返回首頁"><ArrowLeft size={18} /></button><div className="form-brand"><Leaf size={16} /> 特質分析</div><span className="question-count">{current + 1} / {totalStages}</span><ThemeToggle /></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><section className="question-stage"><div className="question-card" key={question?.key}><span className="question-kicker">QUESTION {String(current + 1).padStart(2, "0")}</span><h2>{question?.title}</h2>{question?.subtitle && <p className={`question-subtitle ${("emphasisSubtitle" in question && question.emphasisSubtitle) ? "question-subtitle-emphasis" : ""}`}>{question.subtitle}</p>}<div className="answer-area">{question?.type === "text" && <input autoFocus value={answer} onChange={(event) => updateAnswer(question.key, event.target.value)} placeholder={question.placeholder} onKeyDown={(event) => event.key === "Enter" && goNext()} />}{question?.type === "date" && <input autoFocus type="date" value={answer} onChange={(event) => updateAnswer(question.key, event.target.value)} />}{question?.type === "select" && <select autoFocus value={answer} onChange={(event) => updateAnswer(question.key, event.target.value)}><option value="">請選擇星座</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>}{question?.type === "choice" && <div className="choice-grid">{question.options.map((option) => <button key={option} type="button" className={`choice-button ${answer === option ? "selected" : ""}`} onClick={() => updateAnswer(question.key, option)}>{option}<span>{answer === option ? <Check size={17} /> : ""}</span></button>)}</div>}{question?.key === "siblings" && answer === "有" && <div className="conditional-field"><label htmlFor="siblingsRank">兄弟姐妹排行狀況</label><input id="siblingsRank" value={values.siblingsRank ?? ""} onChange={(event) => updateAnswer("siblingsRank", event.target.value)} placeholder="例如：排行老二，共有三位兄弟姐妹" /><label htmlFor="siblingsJobs">兄弟姐妹現在的工作是？</label><input id="siblingsJobs" value={values.siblingsJobs ?? ""} onChange={(event) => updateAnswer("siblingsJobs", event.target.value)} placeholder="例如：哥哥是工程師，妹妹是教師" /></div>}</div><div className="question-navigation"><button className="secondary-cta" onClick={goBack} disabled={current === 0}><ArrowLeft size={17} /> 上一題</button><button className="primary-cta compact" onClick={goNext} disabled={submitMutation.isPending}>{submitMutation.isPending ? "正在保存…" : isLast ? <>查看提示 <ArrowRight size={17} /></> : <>下一題 <ArrowRight size={17} /></>}</button></div><span className="privacy-note"><LockKeyhole size={13} /> 你的回答會被妥善保存，僅供管理員進行後續分析</span></div></section>{showCompletionModal && <div className="completion-modal-backdrop" role="presentation"><div className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title"><div className="completion-icon" aria-hidden="true"><Check size={24} /></div><span className="question-kicker">完成囉</span><h2 id="completion-title">已完成問卷，感謝你的填寫</h2><p>你的回答已經妥善送出，謝謝你願意花一點時間認識自己。</p><button className="primary-cta completion-return-button" type="button" onClick={() => { setShowCompletionModal(false); setStarted(false); }}>返回</button></div></div>}</main>
  );
}

export { questions };
export type { FormValues };
