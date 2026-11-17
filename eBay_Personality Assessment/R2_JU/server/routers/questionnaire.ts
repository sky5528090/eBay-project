import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

const submissionInputSchema = z.object({
  name: z.string().min(1, "姓名為必填"),
  birthdate: z.string().min(1, "生日為必填"),
  submitDate: z.string().min(1, "填寫日期為必填"),
  zodiac: z.string().min(1, "星座為必填"),
  bloodType: z.string().min(1, "血型為必填"),
  maritalStatus: z.string().min(1, "婚姻狀況為必填"),
  hasChildren: z.string().optional(),
  fatherJob: z.string().min(1, "父親職業為必填"),
  motherJob: z.string().min(1, "母親職業為必填"),
  currentJob: z.string().min(1, "目前職業為必填"),
  siblings: z.string().min(1, "兄弟姐妹狀況為必填"),
  preferredTime: z.string().min(1, "預約時段為必填"),
  diningRole: z.string().min(1, "此題為必填"),
  friendshipStyle: z.string().min(1, "此題為必填"),
  socialRole: z.string().min(1, "此題為必填"),
  workDecision: z.string().min(1, "此題為必填"),
  workHabit: z.string().min(1, "此題為必填"),
  taskFocus: z.string().min(1, "此題為必填"),
  conflictHandling: z.string().min(1, "此題為必填"),
  communicationStyle: z.string().min(1, "此題為必填"),
  meetingRole: z.string().min(1, "此題為必填"),
  workEnvironment: z.string().min(1, "此題為必填"),
  groupRole: z.string().min(1, "此題為必填"),
  traitDescription: z.string().min(1, "此題為必填"),
  friendDescription: z.string().min(1, "此題為必填"),
  consumptionHabit: z.string().min(1, "此題為必填"),
  shoppingStyle: z.string().min(1, "此題為必填"),
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
      await db.createSubmission(input);
      return { success: true };
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

  // 管理員：獲取所有資料以供 CSV 匯出
  exportAll: adminProcedure
    .query(async () => {
      return await db.getAllSubmissionsForExport();
    }),
});
