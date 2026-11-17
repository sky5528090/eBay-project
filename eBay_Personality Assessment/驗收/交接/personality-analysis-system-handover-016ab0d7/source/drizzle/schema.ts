import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * 網站品牌設定；目前以單筆 id=1 保存全站品牌名稱。
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").primaryKey(),
  brandName: varchar("brandName", { length: 120 }).notNull().default("自我探索所"),
  smileSize: int("smileSize").notNull().default(72),
  smileOpacity: int("smileOpacity").notNull().default(18),
  brandPhotoUrl: text("brandPhotoUrl"),
  brandPhotoKey: text("brandPhotoKey"),
  brandPhotoPositionX: int("brandPhotoPositionX").notNull().default(50),
  brandPhotoPositionY: int("brandPhotoPositionY").notNull().default(50),
  brandPhotoScale: int("brandPhotoScale").notNull().default(100),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = typeof siteSettings.$inferInsert;

/**
 * 問卷提交記錄表 (Personality Analysis Submissions)
 * 包含所有 27 個問卷欄位與提交時間戳記
 */
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本資料（13 題；第 11 題之後的欄位依回答條件顯示）
  name: varchar("name", { length: 255 }).notNull(), // 📍姓名/暱稱
  birthdate: varchar("birthdate", { length: 64 }).notNull(), // 📍生日
  submitDate: varchar("submitDate", { length: 64 }).notNull(), // 📍填寫日期
  zodiac: varchar("zodiac", { length: 64 }).notNull(), // 📍星座
  bloodType: varchar("bloodType", { length: 64 }).notNull(), // 📍血型
  maritalStatus: varchar("maritalStatus", { length: 64 }).notNull(), // 📍婚姻狀況
  hasChildren: text("hasChildren"), // 📍是否有子女？
  fatherJob: text("fatherJob").notNull(), // 📍你於3-6歲時，當時父親職業為何？
  motherJob: text("motherJob").notNull(), // 📍你於3-6歲時，當時母親職業為何？
  currentJob: text("currentJob").notNull(), // 📍目前職業
  currentJobLevel: text("currentJobLevel"), // 📍職業／工作位階（新版填寫）
  currentJobYears: text("currentJobYears"), // 📍工作年資（新版填寫）
  siblings: text("siblings").notNull(), // 📍你是否有兄弟姐妹
  siblingsRank: text("siblingsRank"), // 📍兄弟姐妹排行狀況（有兄弟姐妹時填寫）
  siblingsJobs: text("siblingsJobs"), // 📍兄弟姐妹現在的工作
  preferredTime: text("preferredTime").notNull(), // 📍方便預約解析的時段

  // 五題組 8→4→2→1 選擇與計分結果
  groupedSelections: text("groupedSelections"), // JSON：五題組三輪選擇位置
  groupedScores: text("groupedScores"), // JSON：五組分數與八項結果分數
  groupedTotalScore: int("groupedTotalScore"), // 應為 50
  groupedScoreValid: int("groupedScoreValid").default(0).notNull(), // 1=驗證通過，0=失敗

  // DISC 個人天賦行為模式問卷：15 題，每題保存 1～4 的選項編號 JSON
  discAnswers: text("discAnswers"),

  // 已刪除的舊題目欄位：保留資料庫欄位以相容歷史紀錄，新提交不再要求填寫
  diningRole: text("diningRole"),
  friendshipStyle: text("friendshipStyle"),
  socialRole: text("socialRole"),
  workDecision: text("workDecision"),
  workHabit: text("workHabit"),
  taskFocus: text("taskFocus"),
  conflictHandling: text("conflictHandling"),
  communicationStyle: text("communicationStyle"),
  meetingRole: text("meetingRole"),
  workEnvironment: text("workEnvironment"),
  groupRole: text("groupRole"),
  traitDescription: text("traitDescription"),
  friendDescription: text("friendDescription"),
  consumptionHabit: text("consumptionHabit"),
  shoppingStyle: text("shoppingStyle"),

  // 系統記錄
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

/**
 * 管理員邀請與授權記錄表格
 */
export const adminInvitations = mysqlTable("admin_invitations", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  invitedByUserId: int("invitedByUserId").notNull(),
  acceptedUserId: int("acceptedUserId"),
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type InsertAdminInvitation = typeof adminInvitations.$inferInsert;

/**
 * 用戶資料刪除申請表格 (GDPR / 個人隱私合規)
 */
export const deletionRequests = mysqlTable("deletion_requests", {
  id: int("id").autoincrement().primaryKey(),
  targetEmail: varchar("targetEmail", { length: 320 }).notNull(),
  targetName: varchar("targetName", { length: 255 }).notNull(),
  targetBirthdate: varchar("targetBirthdate", { length: 64 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "completed", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type InsertDeletionRequest = typeof deletionRequests.$inferInsert;

/**
 * 後台操作與 Logo 設定紀錄；保留操作者、時間、對象與簡短內容，方便追蹤異動。
 */
export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  actorName: varchar("actorName", { length: 255 }),
  actorEmail: varchar("actorEmail", { length: 320 }),
  action: varchar("action", { length: 80 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 120 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;
