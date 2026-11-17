import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { questions } from "./Home";

const expectedKeys = [
  "name", "birthdate", "submitDate", "zodiac", "bloodType", "maritalStatus", "hasChildren", "fatherJob", "motherJob", "currentJob", "siblings", "preferredTime", "diningRole", "friendshipStyle", "socialRole", "workDecision", "workHabit", "taskFocus", "conflictHandling", "communicationStyle", "meetingRole", "workEnvironment", "groupRole", "traitDescription", "friendDescription", "consumptionHabit", "shoppingStyle",
];

describe("public questionnaire definition", () => {
  it("contains exactly 27 questions", () => {
    expect(questions).toHaveLength(27);
  });

  it("maps every database field to one question", () => {
    expect(questions.map((question) => question.key)).toEqual(expectedKeys);
  });

  it("provides selectable options for every choice question", () => {
    const choiceQuestions = questions.filter((question) => question.type === "choice" || question.type === "select");
    expect(choiceQuestions.length).toBeGreaterThan(0);
    choiceQuestions.forEach((question) => expect(question.options.length).toBeGreaterThan(1));
  });

  it("keeps the removed decorative hero caption out of the landing page", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("今天，也好好陪伴自己");
    expect(source).not.toContain("small steps, soft heart");
    expect(source).not.toContain("portrait-caption");
  });

  it("shows the requested completion modal and returns to the homepage", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    expect(source).toContain("已完成問卷，感謝您的填寫");
    expect(source).toContain('role="dialog"');
    expect(source).toContain("setShowCompletionModal(false)");
    expect(source).toContain("setStarted(false)");
  });

  it("includes hover style rule for completion return button", () => {
    const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(cssSource).toContain(".completion-modal .completion-return-button:hover");
  });
});
