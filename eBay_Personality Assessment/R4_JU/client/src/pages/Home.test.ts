import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { questions } from "./Home";
import { formatSubmissionError, getVisibleQuestionKeys } from "../../../shared/questionnaireHelpers";

const expectedKeys = [
  "name", "birthdate", "submitDate", "zodiac", "bloodType", "maritalStatus", "hasChildren", "fatherJob", "motherJob", "currentJob", "siblings", "preferredTime", "siblingsJobs",
];

describe("public questionnaire definition", () => {
  it("contains exactly 13 questions", () => {
    expect(questions).toHaveLength(13);
  });

  it("maps the 13-question flow to the new database fields", () => {
    expect(questions.map((question) => question.key)).toEqual(expectedKeys);
  });

  it("skips sibling detail questions when the answer is 沒有", () => {
    const visibleKeys = getVisibleQuestionKeys(questions, { siblings: "沒有" });
    expect(visibleKeys).not.toContain("siblingsJobs");
    expect(visibleKeys).not.toContain("siblingsRank");
    expect(visibleKeys).toContain("preferredTime");
    expect(getVisibleQuestionKeys(questions, { siblings: "有" })).toContain("siblingsJobs");
  });

  it("uses the requested sibling and appointment-time options", () => {
    const siblings = questions.find((question) => question.key === "siblings");
    const preferredTime = questions.find((question) => question.key === "preferredTime");
    expect(siblings?.options).toEqual(["有", "沒有"]);
    expect(preferredTime?.options).toEqual(["平日白天", "平日晚間", "假日白天", "假日晚間"]);
  });

  it("provides selectable options for every choice question", () => {
    const choiceQuestions = questions.filter((question) => question.type === "choice" || question.type === "select");
    expect(choiceQuestions.length).toBeGreaterThan(0);
    choiceQuestions.forEach((question) => expect(question.options.length).toBeGreaterThan(1));
  });

  it("keeps the requested landing page simplification and new copy", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("約 8 分鐘 · 27 題＋5 個特質題組 · 不需登入");
    expect(source).not.toContain("你不需要變成別人");
    expect(source).toContain("你的名字");
    expect(source).toContain("兄弟姐妹現在的工作是？");
  });

  it("shows the requested completion modal and returns to the homepage", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    expect(source).toContain("已完成問卷，感謝你的填寫");
    expect(source).toContain("你的回答已經妥善送出");
    expect(source).toContain("填寫過程，請依照現在主業的工作行為模式");
    expect(source).toContain('className="trait-highlight"');
    expect(source).toContain("進入特質測驗");
    expect(source).toContain('role="dialog"');
    expect(source).toContain("setShowCompletionModal(false)");
    expect(source).toContain("setStarted(false)");
  });

  it("includes hover style rule for completion return button", () => {
    const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(cssSource).toContain(".completion-modal .completion-return-button:hover");
    expect(cssSource).toContain(".trait-intro-message");
    expect(cssSource).toContain("animation: card-in .38s");
  });

  it("hides raw validation JSON behind a readable submission error", () => {
    expect(formatSubmissionError('[{"path":["groupedRounds"],"message":"Invalid input"}]')).toBe("題組選擇資料需要重新確認，請回到題組重新選擇。");
    expect(formatSubmissionError("x".repeat(121))).toBe("送出時發生問題，請重新確認填寫內容後再試。");
  });
});
