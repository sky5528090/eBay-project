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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * 問卷提交記錄表 (Personality Analysis Submissions)
 * 包含所有 27 個問卷欄位與提交時間戳記
 */
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  
  // 基本資料 (12 題)
  name: varchar("name", { length: 255 }).notNull(), // 📍姓名/暱稱
  birthdate: varchar("birthdate", { length: 64 }).notNull(), // 📍生日
  submitDate: varchar("submitDate", { length: 64 }).notNull(), // 📍填寫日期
  zodiac: varchar("zodiac", { length: 64 }).notNull(), // 📍星座
  bloodType: varchar("bloodType", { length: 64 }).notNull(), // 📍血型
  maritalStatus: varchar("maritalStatus", { length: 64 }).notNull(), // 📍婚姻狀況
  hasChildren: text("hasChildren"), // 📍是否有子女？
  fatherJob: text("fatherJob").notNull(), // 📍你於3-6歲時，當時父親職業為何？
  motherJob: text("motherJob").notNull(), // 📍你於3-6歲時，當時母親職業為何？
  currentJob: text("currentJob").notNull(), // 📍你現在的職業與工作內容是什麼呢？做多久了呢？
  siblings: text("siblings").notNull(), // 📍你有幾個兄弟姐妹呢？他們現在的工作為何？
  preferredTime: text("preferredTime").notNull(), // 📍方便預約解析的時段？(可複選，存為 JSON string 或逗號分隔)

  // 工作行為模式與心理測驗 (15 題)
  diningRole: text("diningRole").notNull(), // 🚩當要與朋友一起用餐，在選擇餐廳或吃什麼時，你通常是什麼角色？
  friendshipStyle: text("friendshipStyle").notNull(), // 🚩和朋友相處時，通常會：
  socialRole: text("socialRole").notNull(), // 🚩在社交場合中，你是一個：
  workDecision: text("workDecision").notNull(), // 🚩於工作中，做決定時：
  workHabit: text("workHabit").notNull(), // 🚩做事時，你一向：
  taskFocus: text("taskFocus").notNull(), // 🚩你覺得做事的重點應該是？
  conflictHandling: text("conflictHandling").notNull(), // 🚩與同事間有意見不同或衝突時：
  communicationStyle: text("communicationStyle").notNull(), // 🚩選出最符合自己的溝通方式
  meetingRole: text("meetingRole").notNull(), // 🚩每一次會議或決議提案時，你扮演的角色是？
  workEnvironment: text("workEnvironment").notNull(), // 🚩什麼樣的工作環境最能鼓舞你？
  groupRole: text("groupRole").notNull(), // 🚩工作團體中，你是個喜歡：
  traitDescription: text("traitDescription").notNull(), // 🚩你認為哪個形容最能表現自己的特色？
  friendDescription: text("friendDescription").notNull(), // 🚩朋友用一句話形容你，他們會說？
  consumptionHabit: text("consumptionHabit").notNull(), // 🚩你的消費習慣是？(不考慮金錢與收入)
  shoppingStyle: text("shoppingStyle").notNull(), // 🚩當買衣服時，你是？(不考慮金錢與收入)

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
