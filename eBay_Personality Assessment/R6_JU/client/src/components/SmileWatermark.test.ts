import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("branding synchronization", () => {
  it("listens to same-tab, storage, BroadcastChannel, and visibility updates", () => {
    const watermark = readFileSync(new URL("./SmileWatermark.tsx", import.meta.url), "utf8");
    const admin = readFileSync(new URL("../pages/AdminDashboard.tsx", import.meta.url), "utf8");
    expect(watermark).toContain("personality-branding-settings-v1");
    expect(watermark).toContain("window.addEventListener(\"storage\"");
    expect(watermark).toContain("document.addEventListener(\"visibilitychange\"");
    expect(watermark).toContain("settings.refetch()");
    expect(admin).toContain("window.dispatchEvent(new CustomEvent(\"branding-settings-updated\"");
    expect(admin).toContain("channel.postMessage(message)");
  });
});
