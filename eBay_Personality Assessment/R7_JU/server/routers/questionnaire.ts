import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { calculateGroupedQuestionnaire, type GroupSelectionRounds } from "../../shared/groupedQuestionnaire";
import { validateDiscAnswers } from "../../shared/discQuestionnaire";

const submissionInputSchema = z.object({
  name: z.string().min(1, "姓名為必填"),
  birthdate: z.string().min(1, "生日為必填"),
  submitDate: z.string().min(1, "填寫日期為必填"),
  zodiac: z.string().min(1, "星座為必填"),
  bloodType: z.string().min(1, "血型為必填"),
  maritalStatus: z.string().min(1, "婚姻狀況為必填"),
  hasChildren: z.string().optional(),
  fatherJob: z.string().min(1, "爸爸職業為必填"),
  motherJob: z.string().min(1, "媽媽職業為必填"),
  currentJob: z.string().min(1, "目前職業為必填"),
  currentJobLevel: z.string().optional(),
  currentJobYears: z.string().optional(),
  siblings: z.enum(["有", "沒有"], { message: "請選擇是否有兄弟姐妹" }),
  siblingsRank: z.string().optional(),
  siblingsJobs: z.string().optional(),
  preferredTime: z.enum(["平日白天", "平日晚間", "假日白天", "假日晚間"], { message: "請選擇方便預約解析的時段" }),
  groupedRounds: z.array(z.array(z.array(z.number().int().min(0).max(7)))).length(5).optional(),
  discAnswers: z.array(z.number().int().min(1).max(4)).length(15).optional(),
}).superRefine((input, ctx) => {
  if (input.siblings === "有" && !input.siblingsRank?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["siblingsRank"], message: "請填寫兄弟姐妹排行狀況" });
  }
  if (input.siblings === "有" && !input.siblingsJobs?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["siblingsJobs"], message: "請填寫兄弟姐妹目前的工作" });
  }
});

// 管理員權限檢查中介層
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: '權限不足：需要管理員 (Admin) 帳號才能訪問後台' 
    });
  }
  return next({ ctx });
});

export const questionnaireRouter = router({
  // 公開：提交問卷
  submit: publicProcedure
    .input(submissionInputSchema)
    .mutation(async ({ input }) => {
      const { groupedRounds, discAnswers, ...answers } = input;
      if (discAnswers && !validateDiscAnswers(discAnswers)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "DISC 題組答案需要完整填寫 15 題。" });
      }
      if (!groupedRounds) {
        await db.createSubmission({ ...answers, discAnswers: discAnswers ? JSON.stringify(discAnswers) : undefined });
        return { success: true };
      }
      try {
        const result = calculateGroupedQuestionnaire(groupedRounds as unknown as GroupSelectionRounds[]);
        if (!result.isValid || result.totalScore !== 50) throw new Error("題組總分驗證未通過");
        await db.createSubmission({
          ...answers,
          discAnswers: discAnswers ? JSON.stringify(discAnswers) : undefined,
          groupedSelections: JSON.stringify(groupedRounds),
          groupedScores: JSON.stringify(result),
          groupedTotalScore: result.totalScore,
          groupedScoreValid: 1,
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "題組計分失敗" });
      }
    }),

  // 管理員：獲取問卷列表（支援分頁與關鍵字搜尋）
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      zodiac: z.string().optional(),
      bloodType: z.string().optional(),
      maritalStatus: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return await db.getSubmissions({ search: input.search, zodiac: input.zodiac, bloodType: input.bloodType, maritalStatus: input.maritalStatus, fromDate: input.fromDate, toDate: input.toDate }, input.limit, input.offset);
    }),

  // 管理員：獲取單筆問卷詳細內容
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await db.getSubmissionById(input.id);
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '找不到該筆問卷紀錄' });
      }
      return item;
    }),

  // 管理員：刪除單筆問卷紀錄
  deleteById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await db.getSubmissionById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該筆問卷紀錄，可能已被刪除。" });
      return await db.deleteSubmissionById(input.id);
    }),

  // 管理員：獲取所有資料以供 CSV 匯出
  exportAll: adminProcedure
    .query(async () => {
      return await db.getAllSubmissionsForExport();
    }),
});
