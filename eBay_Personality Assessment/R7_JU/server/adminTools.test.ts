import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-tools-test-user",
      email: "admin-tools@example.com",
      name: "Admin Tools Test",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("adminTools router", () => {
  it("blocks analytics for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.analytics()).rejects.toThrow();
  });

  it("exposes public watermark settings with safe defaults", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    const result = await caller.adminTools.branding.public();
    expect(result).toMatchObject({ brandName: expect.any(String), smileSize: expect.any(Number), smileOpacity: expect.any(Number) });
    expect(result).toHaveProperty("brandPhotoUrl");
  });

  it("blocks branding updates for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.branding.update({ brandName: "測試品牌", smileSize: 80, smileOpacity: 20 })).rejects.toThrow();
  });

  it("blocks brand photo uploads for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.branding.uploadPhoto({ fileName: "photo.png", mimeType: "image/png", dataUrl: "data:image/png;base64,AA==" })).rejects.toThrow();
  });

  it("blocks brand photo removal for non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.branding.removePhoto()).rejects.toThrow();
  });

  it("rejects unsupported brand photo formats before storage", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.adminTools.branding.uploadPhoto({ fileName: "photo.gif", mimeType: "image/png" as "image/png", dataUrl: "data:image/gif;base64,AA==" })).rejects.toThrow();
  });

  it("returns analytics shape for admins", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.adminTools.analytics();
    expect(result).toMatchObject({
      totalSubmissions: expect.any(Number),
      zodiacStats: expect.any(Array),
      bloodStats: expect.any(Array),
      maritalStats: expect.any(Array),
      currentJobStats: expect.any(Array),
      recentTrend: expect.any(Array),
    });
  });

  it("prevents an admin from changing their own role", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.adminTools.admins.setRole({ userId: 1, role: "user" })).rejects.toThrow();
  });

  it("validates public deletion requests before writing", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.deletion.request({
      targetEmail: "not-an-email",
      targetName: "測試者",
      targetBirthdate: "1990-01-01",
    })).rejects.toThrow();
  });

  it("rejects an invalid invitation code", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.adminTools.invitations.accept({ code: "invalid-code" })).rejects.toThrow();
  });
});
