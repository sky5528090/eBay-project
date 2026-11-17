import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
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
import { and, desc, eq, gte, lt, sql, like, or } from "drizzle-orm";

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
  return await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
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
