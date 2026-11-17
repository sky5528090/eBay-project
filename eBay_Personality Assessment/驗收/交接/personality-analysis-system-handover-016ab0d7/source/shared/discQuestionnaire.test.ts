import { describe, expect, it } from "vitest";
import { DISC_QUESTIONS, DISC_SECTIONS, getDiscSectionIndex, validateDiscAnswers } from "./discQuestionnaire";

describe("DISC 15-question questionnaire", () => {
  it("contains 15 four-option questions split into six paper sections", () => {
    expect(DISC_QUESTIONS).toHaveLength(15);
    expect(DISC_QUESTIONS.every((question) => question.options).valueOf()).toBe(true);
    expect(DISC_SECTIONS.map((section) => section.range)).toEqual([[1, 3], [4, 6], [7, 9], [10, 11], [12, 13], [14, 15]]);
  });

  it("validates one selected option per question", () => {
    expect(validateDiscAnswers(Array(15).fill(1))).toBe(true);
    expect(validateDiscAnswers(Array(14).fill(1))).toBe(false);
    expect(validateDiscAnswers([...Array(14).fill(1), 5])).toBe(false);
  });

  it("keeps the requested paper wording and section labels", () => {
    expect(DISC_SECTIONS.map((section) => section.title)).toEqual(["朋友", "工作", "工作", "工作", "自我認知", "自我認知"]);
    expect(DISC_SECTIONS.every((section) => section.note === "")).toBe(true);
    expect(DISC_QUESTIONS[0].title).toContain("（朋友）當你和朋友在一起用餐時");
    expect(DISC_QUESTIONS[13].options[0]).toBe("找到要的東西，付錢走人");
    expect(DISC_QUESTIONS[14].options[2]).toBe("找熟悉的店購買");
  });

  it("maps question indexes to the intended section", () => {
    expect(getDiscSectionIndex(0)).toBe(0);
    expect(getDiscSectionIndex(5)).toBe(1);
    expect(getDiscSectionIndex(10)).toBe(3);
    expect(getDiscSectionIndex(14)).toBe(5);
  });
});
