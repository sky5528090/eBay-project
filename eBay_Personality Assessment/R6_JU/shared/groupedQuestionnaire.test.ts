import { describe, expect, it } from "vitest";
import {
  calculateGroupedQuestionnaire,
  RESULT_LABELS,
  type GroupSelectionRounds,
} from "./groupedQuestionnaire";

const validRounds: GroupSelectionRounds = [
  [0, 1, 2, 3],
  [0, 1],
  [0],
];

describe("grouped questionnaire scoring", () => {
  it("calculates 5, 3, 1 and 0 points by selection count", () => {
    const result = calculateGroupedQuestionnaire(Array.from({ length: 5 }, () => validRounds));
    expect(result.isValid).toBe(true);
    expect(result.totalScore).toBe(50);
    expect(result.groupScores[0]).toEqual({
      果斷: 5,
      分析: 3,
      創意: 1,
      理想: 1,
      掌控: 0,
      事務: 0,
      感覺: 0,
      人際: 0,
    });
    expect(result.resultScores).toEqual({
      果斷: 25,
      分析: 15,
      創意: 5,
      理想: 5,
      掌控: 0,
      事務: 0,
      感覺: 0,
      人際: 0,
    });
  });

  it("rejects invalid round sizes or duplicate positions", () => {
    expect(() => calculateGroupedQuestionnaire([
      [[0, 1, 2, 3], [0, 1], [0]],
      [[0, 1, 2, 3], [0, 1], [0]],
      [[0, 1, 2, 3], [0, 1], [0]],
      [[0, 1, 2, 3], [0, 1], [0]],
      [[0, 1, 2, 3], [0, 1, 1], [0]],
    ])).toThrow("題組 5");
  });

  it("keeps the eight result labels in the photographed fixed positions", () => {
    expect(RESULT_LABELS).toEqual(["果斷", "分析", "創意", "理想", "掌控", "事務", "感覺", "人際"]);
  });
});
