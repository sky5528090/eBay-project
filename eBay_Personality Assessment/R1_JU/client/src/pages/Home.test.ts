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
});
