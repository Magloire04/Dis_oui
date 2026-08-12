import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {
        "x-forwarded-for": "127.0.0.1",
      },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("Dis oui API router", () => {
  it("fetches public stats successfully", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.invitations.stats();
    expect(stats).toBeDefined();
    expect(stats.totalCreated).toBeGreaterThan(0);
    expect(stats.totalResponses).toBeGreaterThan(0);
  });

  it("fails gracefully on non-existent invitation slug", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.invitations.getBySlug({ slug: "non-existent-slug-9999" })).rejects.toThrow();
  });
});
