import { describe, expect, it, vi } from "vitest";
import { questions } from "./Home";
import { getVisibleQuestionKeys } from "../../../shared/questionnaireHelpers";
import { calculateGroupedQuestionnaire } from "../../../shared/groupedQuestionnaire";

describe("no-sibling frontend completion flow", () => {
  it("skips sibling details, completes all trait groups, and submits successfully", async () => {
    const visibleQuestionKeys = getVisibleQuestionKeys(questions, { siblings: "沒有" });
    expect(visibleQuestionKeys).toHaveLength(12);
    expect(visibleQuestionKeys).not.toContain("siblingsJobs");
    expect(visibleQuestionKeys.at(-1)).toBe("preferredTime");

    const groupedRounds = Array.from({ length: 5 }, () => [[0, 1, 2, 3], [0, 1], [0]]);
    const result = calculateGroupedQuestionnaire(groupedRounds);
    expect(result.isValid).toBe(true);
    expect(result.totalScore).toBe(50);

    const submit = vi.fn().mockResolvedValue({ success: true });
    const payload = {
      name: "無兄弟姐妹整合測試",
      birthdate: "1995-05-05",
      submitDate: "2026-09-03",
      zodiac: "金牛座",
      bloodType: "O 型",
      maritalStatus: "未婚",
      hasChildren: "沒有",
      fatherJob: "教師",
      motherJob: "護理師",
      currentJob: "設計師",
      siblings: "沒有",
      siblingsRank: "",
      siblingsJobs: "",
      preferredTime: "平日白天",
      groupedRounds,
    };

    await submit(payload);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ siblings: "沒有", siblingsRank: "", siblingsJobs: "" }));
  });
});
