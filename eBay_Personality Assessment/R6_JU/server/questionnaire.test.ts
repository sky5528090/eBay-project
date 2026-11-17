import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-openid",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("questionnaire router", () => {
  it("allows public submission of questionnaire", async () => {
    const ctx = createMockContext("user");
    const caller = appRouter.createCaller(ctx);

    const mockPayload = {
      name: "單元測試王",
      birthdate: "1998-01-01",
      submitDate: "2026-08-13",
      zodiac: "摩羯",
      bloodType: "A",
      maritalStatus: "未婚",
      hasChildren: "沒有",
      fatherJob: "公務員",
      motherJob: "教師",
      currentJob: "工程師",
      siblings: "有",
      siblingsRank: "排行老二，共有兩位兄弟姐妹",
      siblingsJobs: "哥哥是工程師，妹妹是教師",
      preferredTime: "平日白天",
      groupedRounds: Array.from({ length: 5 }, () => [[0, 1, 2, 3], [0, 1], [0]]),
    };

    const result = await caller.questionnaire.submit(mockPayload);
    expect(result).toEqual({ success: true });
  });

  it("accepts a complete submission when siblings are absent and detail fields are empty", async () => {
    const caller = appRouter.createCaller(createMockContext("user"));
    const result = await caller.questionnaire.submit({
      name: "無兄弟姐妹測試", birthdate: "1995-05-05", submitDate: "2026-09-03", zodiac: "金牛座", bloodType: "O 型", maritalStatus: "未婚", hasChildren: "沒有", fatherJob: "教師", motherJob: "護理師", currentJob: "設計師", siblings: "沒有", siblingsRank: "", siblingsJobs: "", preferredTime: "假日白天",
      groupedRounds: Array.from({ length: 5 }, () => [[0, 1, 2, 3], [0, 1], [0]]),
    });
    expect(result).toEqual({ success: true });
  });

  it("accepts 15 DISC answers and rejects an incomplete DISC payload", async () => {
    const caller = appRouter.createCaller(createMockContext("user"));
    const base = { name: "DISC 測試", birthdate: "1992-02-02", submitDate: "2026-10-30", zodiac: "水瓶座", bloodType: "B 型", maritalStatus: "未婚", hasChildren: "沒有", fatherJob: "商業", motherJob: "教育", currentJob: "企劃", siblings: "沒有" as const, siblingsRank: "", siblingsJobs: "", preferredTime: "平日晚間" as const, groupedRounds: Array.from({ length: 5 }, () => [[0, 1, 2, 3], [0, 1], [0]]), discAnswers: Array(15).fill(1) };
    await expect(caller.questionnaire.submit(base)).resolves.toEqual({ success: true });
    await expect(caller.questionnaire.submit({ ...base, discAnswers: Array(14).fill(1) })).rejects.toThrow();
  });

  it("requires sibling rank and job details when siblings are present", async () => {
    const caller = appRouter.createCaller(createMockContext("user"));
    await expect(caller.questionnaire.submit({
      name: "條件測試", birthdate: "1998-01-01", submitDate: "2026-08-13", zodiac: "摩羯座", bloodType: "A 型", maritalStatus: "未婚", hasChildren: "沒有", fatherJob: "公務員", motherJob: "教師", currentJob: "工程師", siblings: "有", preferredTime: "平日白天",
    })).rejects.toThrow("兄弟姐妹排行狀況");
  });

  it("forbids non-admin users from listing submissions", async () => {
    const ctx = createMockContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.questionnaire.list({ limit: 10, offset: 0 })).rejects.toThrow();
  });

  it("allows admin users to list submissions", async () => {
    const ctx = createMockContext("admin");
    const caller = appRouter.createCaller(ctx);

    const res = await caller.questionnaire.list({ zodiac: "雙子座", bloodType: "A 型", maritalStatus: "未婚", fromDate: "2026-01-01", toDate: "2026-12-31", limit: 10, offset: 0 });
    expect(res).toHaveProperty("items");
    expect(res).toHaveProperty("total");
  });

  it("accepts search and filter inputs only for admins", async () => {
    const adminCaller = appRouter.createCaller(createMockContext("admin"));
    const result = await adminCaller.questionnaire.list({ search: "測試", zodiac: "水瓶座", bloodType: "O 型", maritalStatus: "已婚", fromDate: "2026-01-01", toDate: "2026-12-31", limit: 10, offset: 0 });
    expect(result).toMatchObject({ items: expect.any(Array), total: expect.any(Number) });

    const userCaller = appRouter.createCaller(createMockContext("user"));
    await expect(userCaller.questionnaire.list({ zodiac: "水瓶座", limit: 10, offset: 0 })).rejects.toThrow();
  });
});
