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
      hasChildren: "無",
      fatherJob: "公務員",
      motherJob: "教師",
      currentJob: "工程師",
      siblings: "一個哥哥",
      preferredTime: "平日白天",
      diningRole: "決定者",
      friendshipStyle: "直來直往",
      socialRole: "主動",
      workDecision: "喜歡結果",
      workHabit: "目標導向",
      taskFocus: "重結果",
      conflictHandling: "說服對方",
      communicationStyle: "直接了當",
      meetingRole: "據理力爭",
      workEnvironment: "具領導地位",
      groupRole: "激發別人",
      traitDescription: "果敢",
      friendDescription: "熱情",
      consumptionHabit: "付錢走人",
      shoppingStyle: "心中自有定見",
    };

    const result = await caller.questionnaire.submit(mockPayload);
    expect(result).toEqual({ success: true });
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
