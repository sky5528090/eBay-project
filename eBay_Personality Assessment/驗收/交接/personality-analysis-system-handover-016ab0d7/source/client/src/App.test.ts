import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("service error recovery", () => {
  it("offers API retry and full reload actions", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
    const router = readFileSync(new URL("../../server/routers/adminTools.ts", import.meta.url), "utf8");
    expect(source).toContain("再次嘗試 API");
    expect(source).toContain("queryClient.refetchQueries({ type: \"active\" })");
    expect(source).toContain("重新載入整頁");
    expect(source).toContain("MAX_API_RETRIES = 3");
    expect(source).toContain("RETRY_COOLDOWN_SECONDS = 5");
    expect(source).toContain("已達重試上限");
    expect(source).toContain("recordApiError.mutate");
    expect(source).toContain('lazy(() => import("@/pages/AdminDashboard"))');
    expect(source).toContain('className="route-loading"');
    expect(router).toContain('action: "api_error"');
    expect(router).toContain("targetId: input.route");
    expect(router).toContain("apiOnly");
    expect(router).toContain("search");
    expect(css).toContain(".service-error-actions");
    expect(css).toContain(".service-reload-button:disabled");
  });
});
