import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq, gte, lt, sql, like, or } from "drizzle-orm";
import { InsertUser, users, siteSettings, adminAuditLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

const DEFAULT_BRAND_NAME = "自我探索所";
const DEFAULT_SMILE_SIZE = 72;
const DEFAULT_SMILE_OPACITY = 18;
const DEFAULT_PHOTO_POSITION = 50;
const DEFAULT_PHOTO_SCALE = 100;

type SiteSettingsInput = {
  brandName: string;
  smileSize: number;
  smileOpacity: number;
  brandPhotoUrl?: string | null;
  brandPhotoKey?: string | null;
  brandPhotoPositionX?: number;
  brandPhotoPositionY?: number;
  brandPhotoScale?: number;
};

function withSiteSettingDefaults(settings: Record<string, unknown>) {
  return {
    ...settings,
    brandName: String(settings.brandName ?? DEFAULT_BRAND_NAME),
    smileSize: Number(settings.smileSize ?? DEFAULT_SMILE_SIZE),
    smileOpacity: Number(settings.smileOpacity ?? DEFAULT_SMILE_OPACITY),
    brandPhotoUrl: (settings.brandPhotoUrl as string | null | undefined) ?? null,
    brandPhotoKey: (settings.brandPhotoKey as string | null | undefined) ?? null,
    brandPhotoPositionX: Number(settings.brandPhotoPositionX ?? DEFAULT_PHOTO_POSITION),
    brandPhotoPositionY: Number(settings.brandPhotoPositionY ?? DEFAULT_PHOTO_POSITION),
    brandPhotoScale: Number(settings.brandPhotoScale ?? DEFAULT_PHOTO_SCALE),
  };
}

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) return withSiteSettingDefaults({ id: 1, brandName: DEFAULT_BRAND_NAME });
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  if (rows[0]) return withSiteSettingDefaults(rows[0] as unknown as Record<string, unknown>);
  await db.insert(siteSettings).values({ id: 1, brandName: DEFAULT_BRAND_NAME, smileSize: DEFAULT_SMILE_SIZE, smileOpacity: DEFAULT_SMILE_OPACITY, brandPhotoPositionX: DEFAULT_PHOTO_POSITION, brandPhotoPositionY: DEFAULT_PHOTO_POSITION, brandPhotoScale: DEFAULT_PHOTO_SCALE });
  return withSiteSettingDefaults({ id: 1, brandName: DEFAULT_BRAND_NAME });
}

export async function updateSiteSettings(input: SiteSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalized = input.brandName.trim();
  const current = await getSiteSettings();
  const values = {
    id: 1,
    brandName: normalized,
    smileSize: input.smileSize,
    smileOpacity: input.smileOpacity,
    brandPhotoUrl: input.brandPhotoUrl === undefined ? current.brandPhotoUrl : input.brandPhotoUrl,
    brandPhotoKey: input.brandPhotoKey === undefined ? current.brandPhotoKey : input.brandPhotoKey,
    brandPhotoPositionX: input.brandPhotoPositionX ?? current.brandPhotoPositionX,
    brandPhotoPositionY: input.brandPhotoPositionY ?? current.brandPhotoPositionY,
    brandPhotoScale: input.brandPhotoScale ?? current.brandPhotoScale,
  };
  await db.insert(siteSettings).values(values).onDuplicateKeyUpdate({ set: { brandName: values.brandName, smileSize: values.smileSize, smileOpacity: values.smileOpacity, brandPhotoUrl: values.brandPhotoUrl, brandPhotoKey: values.brandPhotoKey, brandPhotoPositionX: values.brandPhotoPositionX, brandPhotoPositionY: values.brandPhotoPositionY, brandPhotoScale: values.brandPhotoScale } });
  return getSiteSettings();
}

export async function updateBrandName(brandName: string) {
  const current = await getSiteSettings();
  return updateSiteSettings({ brandName, smileSize: current.smileSize, smileOpacity: current.smileOpacity, brandPhotoUrl: current.brandPhotoUrl, brandPhotoKey: current.brandPhotoKey, brandPhotoPositionX: current.brandPhotoPositionX, brandPhotoPositionY: current.brandPhotoPositionY, brandPhotoScale: current.brandPhotoScale });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import { submissions, InsertSubmission } from "../drizzle/schema";

export async function createSubmission(data: InsertSubmission) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.insert(submissions).values(data);
  return result;
}

export type SubmissionListFilters = {
  search?: string;
  zodiac?: string;
  bloodType?: string;
  maritalStatus?: string;
  fromDate?: string;
  toDate?: string;
};

export async function getSubmissions(filters: SubmissionListFilters = {}, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) {
    return { items: [], total: 0 };
  }

  const conditions: any[] = [];
  const search = filters.search?.trim();
  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(or(
      like(submissions.name, searchTerm),
      like(submissions.zodiac, searchTerm),
      like(submissions.currentJob, searchTerm)
    ));
  }
  if (filters.zodiac) conditions.push(eq(submissions.zodiac, filters.zodiac));
  if (filters.bloodType) conditions.push(eq(submissions.bloodType, filters.bloodType));
  if (filters.maritalStatus) conditions.push(eq(submissions.maritalStatus, filters.maritalStatus));
  if (filters.fromDate) conditions.push(gte(submissions.createdAt, new Date(`${filters.fromDate}T00:00:00`)));
  if (filters.toDate) {
    const nextDay = new Date(`${filters.toDate}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    conditions.push(lt(submissions.createdAt, nextDay));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  let query = db.select().from(submissions);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(submissions);
  if (whereClause) {
    query = query.where(whereClause) as any;
    countQuery = countQuery.where(whereClause) as any;
  }

  const items = await query.orderBy(desc(submissions.createdAt)).limit(limit).offset(offset);
  const totalResult = await countQuery;
  const total = Number(totalResult[0]?.count || 0);

  return { items, total };
}

export async function getSubmissionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(submissions).where(sql`id = ${id}`).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteSubmissionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(submissions).where(eq(submissions.id, id));
  return { success: true, id };
}

export async function deleteSubmissionsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length) await db.delete(submissions).where(sql`${submissions.id} in (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})`);
  return { success: true, ids: uniqueIds, count: uniqueIds.length };
}

export async function createAdminAuditLog(data: {
  actorUserId: number;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminAuditLogs).values(data);
}

export async function listAdminAuditLogs(options: { limit?: number; page?: number; apiOnly?: boolean; search?: string } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (options.apiOnly) conditions.push(eq(adminAuditLogs.action, "api_error"));
  const keyword = options.search?.trim();
  if (keyword) conditions.push(or(like(adminAuditLogs.action, `%${keyword}%`), like(adminAuditLogs.targetId, `%${keyword}%`), like(adminAuditLogs.details, `%${keyword}%`)));
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const page = Math.max(options.page ?? 0, 0);
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, countRows] = await Promise.all([
    db.select().from(adminAuditLogs).where(where).orderBy(desc(adminAuditLogs.createdAt)).limit(limit).offset(page * limit),
    db.select({ count: sql<number>`count(*)` }).from(adminAuditLogs).where(where),
  ]);
  return { items, total: Number(countRows[0]?.count ?? 0) };
}

export async function getAllSubmissionsForExport() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(submissions).orderBy(desc(submissions.createdAt));
}

import { adminInvitations, deletionRequests } from "../drizzle/schema";

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { totalSubmissions: 0, zodiacStats: [], bloodStats: [], maritalStats: [], currentJobStats: [], recentTrend: [] };

  const [totalCountResult, zodiacStats, bloodStats, maritalStats, currentJobStats, recentTrend] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(submissions),
    db.select({ zodiac: submissions.zodiac, count: sql<number>`count(*)` }).from(submissions).groupBy(submissions.zodiac),
    db.select({ bloodType: submissions.bloodType, count: sql<number>`count(*)` }).from(submissions).groupBy(submissions.bloodType),
    db.select({ maritalStatus: submissions.maritalStatus, count: sql<number>`count(*)` }).from(submissions).groupBy(submissions.maritalStatus),
    db.select({ currentJob: submissions.currentJob, count: sql<number>`count(*)` }).from(submissions).groupBy(submissions.currentJob).orderBy(sql`count(*) DESC`).limit(8),
    db.select({ date: sql<string>`DATE(createdAt)`, count: sql<number>`count(*)` }).from(submissions).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt) DESC`).limit(7),
  ]);
  const totalSubmissions = Number(totalCountResult[0]?.count ?? 0);

  return {
    totalSubmissions,
    zodiacStats: zodiacStats.map((item) => ({ ...item, count: Number(item.count) })),
    bloodStats: bloodStats.map((item) => ({ ...item, count: Number(item.count) })),
    maritalStats: maritalStats.map((item) => ({ ...item, count: Number(item.count) })),
    currentJobStats: currentJobStats.map((item) => ({ ...item, count: Number(item.count) })),
    recentTrend: recentTrend.map((item) => ({ ...item, count: Number(item.count) })),
  };
}

export async function createAdminInvitation(invitedByUserId: number, code: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminInvitations).values({
    code,
    invitedByUserId,
    status: "pending",
    expiresAt,
  });
}

export async function listAdminInvitations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt));
}

export async function listAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.role, "admin")).orderBy(desc(users.lastSignedIn));
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserActive(userId: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ active: active ? 1 : 0 }).where(eq(users.id, userId));
}
export async function updateAdminInvitationStatus(id: number, status: "accepted" | "revoked", acceptedUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(adminInvitations).set({ status, acceptedUserId }).where(eq(adminInvitations.id, id));
}

export async function getAdminInvitationByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminInvitations).where(eq(adminInvitations.code, code)).limit(1);
  return result[0];
}

export async function createDeletionRequest(targetEmail: string, targetName: string, targetBirthdate: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deletionRequests).values({
    targetEmail,
    targetName,
    targetBirthdate,
    reason: reason ?? null,
    status: "pending",
  });
}

export async function listDeletionRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(deletionRequests).orderBy(desc(deletionRequests.createdAt));
}

export async function getDeletionRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deletionRequests).where(eq(deletionRequests.id, id)).limit(1);
  return result[0];
}

export async function processDeletionRequest(id: number, status: "completed" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deletionRequests).set({
    status,
    processedAt: new Date(),
  }).where(eq(deletionRequests.id, id));
}

export async function deleteSubmissionsById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(submissions).where(eq(submissions.id, id));
}

export async function deleteSubmissionsByIdentity(name: string, birthdate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(submissions).where(and(eq(submissions.name, name), eq(submissions.birthdate, birthdate)));
}
