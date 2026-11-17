import { nanoid } from "nanoid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

export const adminToolsRouter = router({
  analytics: adminProcedure.query(() => db.getAnalyticsSummary()),

  branding: router({
    public: publicProcedure.query(() => db.getSiteSettings()),
    get: adminProcedure.query(() => db.getSiteSettings()),
    update: adminProcedure
      .input(z.object({
        brandName: z.string().trim().min(1, "品牌名稱不可為空白").max(120, "品牌名稱最多 120 個字"),
        smileSize: z.number().int().min(32).max(180),
        smileOpacity: z.number().int().min(5).max(70),
        brandPhotoUrl: z.string().max(600).nullable().optional(),
        brandPhotoKey: z.string().max(300).nullable().optional(),
        brandPhotoPositionX: z.number().int().min(0).max(100).optional(),
        brandPhotoPositionY: z.number().int().min(0).max(100).optional(),
        brandPhotoScale: z.number().int().min(60).max(180).optional(),
      }))
      .mutation(({ input }) => db.updateSiteSettings(input)),
    uploadPhoto: adminProcedure
      .input(z.object({ fileName: z.string().trim().min(1).max(160), mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]), dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, "請上傳 PNG、JPG 或 WebP 圖片").max(4_500_000, "圖片檔案不可超過 3 MB") }))
      .mutation(async ({ input }) => {
        const base64 = input.dataUrl.split(",", 2)[1];
        if (!base64) throw new TRPCError({ code: "BAD_REQUEST", message: "圖片內容無法讀取" });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "brand-photo";
        const { key, url } = await storagePut(`brand-assets/${Date.now()}-${safeName}`, Buffer.from(base64, "base64"), input.mimeType);
        const current = await db.getSiteSettings();
        const settings = await db.updateSiteSettings({ brandName: current.brandName, smileSize: current.smileSize, smileOpacity: current.smileOpacity, brandPhotoUrl: url, brandPhotoKey: key, brandPhotoPositionX: current.brandPhotoPositionX, brandPhotoPositionY: current.brandPhotoPositionY, brandPhotoScale: current.brandPhotoScale });
        return settings;
      }),
    removePhoto: adminProcedure
      .mutation(async () => {
        const current = await db.getSiteSettings();
        return db.updateSiteSettings({ brandName: current.brandName, smileSize: current.smileSize, smileOpacity: current.smileOpacity, brandPhotoUrl: null, brandPhotoKey: null, brandPhotoPositionX: 50, brandPhotoPositionY: 50, brandPhotoScale: 100 });
      }),
  }),

  admins: router({
    list: adminProcedure.query(() => db.listUsers()),
    setRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能在目前登入的帳號上直接變更自己的角色" });
        }
        await db.updateUserRole(input.userId, input.role);
        return { success: true } as const;
      }),
  }),

  invitations: router({
    list: adminProcedure.query(() => db.listAdminInvitations()),
    create: adminProcedure
      .input(z.object({ expiresInDays: z.number().int().min(1).max(30).default(7) }))
      .mutation(async ({ ctx, input }) => {
        const code = nanoid(24);
        const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
        await db.createAdminInvitation(ctx.user.id, code, expiresAt);
        return { code, expiresAt };
      }),
    revoke: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await db.updateAdminInvitationStatus(input.id, "revoked");
        return { success: true } as const;
      }),
    accept: protectedProcedure
      .input(z.object({ code: z.string().min(8).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await db.getAdminInvitationByCode(input.code);
        if (!invitation || invitation.status !== "pending") {
          throw new TRPCError({ code: "NOT_FOUND", message: "邀請碼不存在或已失效" });
        }
        if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "邀請碼已過期" });
        }
        await db.updateUserRole(ctx.user.id, "admin");
        await db.updateAdminInvitationStatus(invitation.id, "accepted", ctx.user.id);
        return { success: true } as const;
      }),
  }),

  deletion: router({
    request: publicProcedure
      .input(z.object({
        targetEmail: z.string().email("請填寫有效 Email"),
        targetName: z.string().min(1, "請填寫姓名或暱稱"),
        targetBirthdate: z.string().min(1, "請填寫生日"),
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDeletionRequest(input.targetEmail, input.targetName, input.targetBirthdate, input.reason);
        return { success: true } as const;
      }),
    list: adminProcedure.query(() => db.listDeletionRequests()),
    process: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["completed", "rejected"]) }))
      .mutation(async ({ input }) => {
        const request = await db.getDeletionRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "找不到刪除申請" });
        }
        if (request.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "這筆申請已經處理過" });
        }
        if (input.status === "completed") {
          await db.deleteSubmissionsByIdentity(request.targetName, request.targetBirthdate);
        }
        await db.processDeletionRequest(input.id, input.status);
        return { success: true } as const;
      }),
  }),
});
