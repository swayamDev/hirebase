import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";

const mockClient = createMockSanityClient();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sanity/client", () => ({ writeClient: mockClient }));

beforeEach(() => {
  vi.resetModules();
  mockClient.createIfNotExists.mockReset().mockResolvedValue({});
  mockClient.__chain.commit.mockReset();
});

async function importFresh() {
  return await import("@/lib/agent-rate-limit");
}

describe("checkAgentRateLimit", () => {
  it("allows the request and reports the count/limit when under the cap", async () => {
    mockClient.__chain.commit.mockResolvedValueOnce({ count: 3 });
    const { checkAgentRateLimit, AGENT_DAILY_MESSAGE_LIMIT } = await importFresh();

    const result = await checkAgentRateLimit("org_abc");

    expect(result).toEqual({ allowed: true, count: 3, limit: AGENT_DAILY_MESSAGE_LIMIT });
  });

  it("allows the request that exactly hits the limit", async () => {
    mockClient.__chain.commit.mockResolvedValueOnce({ count: 10 });
    const { checkAgentRateLimit } = await importFresh();

    const result = await checkAgentRateLimit("org_abc");

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(10);
  });

  it("denies the request once over the limit", async () => {
    mockClient.__chain.commit.mockResolvedValueOnce({ count: 11 });
    const { checkAgentRateLimit } = await importFresh();

    const result = await checkAgentRateLimit("org_abc");

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(11);
  });

  it("still increments (denies, doesn't just no-op) on a repeated over-limit call", async () => {
    mockClient.__chain.commit
      .mockResolvedValueOnce({ count: 11 })
      .mockResolvedValueOnce({ count: 12 });
    const { checkAgentRateLimit } = await importFresh();

    await checkAgentRateLimit("org_abc");
    const second = await checkAgentRateLimit("org_abc");

    expect(mockClient.__chain.commit).toHaveBeenCalledTimes(2);
    expect(second).toEqual({ allowed: false, count: 12, limit: expect.any(Number) });
  });

  it("scopes the usage document to today's date and this org (idempotent doc id)", async () => {
    mockClient.__chain.commit.mockResolvedValueOnce({ count: 1 });
    const { checkAgentRateLimit } = await importFresh();

    await checkAgentRateLimit("org_abc");

    const today = new Date().toISOString().slice(0, 10);
    expect(mockClient.createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: `agent-usage.org_abc.${today}`,
        _type: "agentUsage",
        orgId: "org_abc",
        date: today,
        count: 0,
      }),
    );
    expect(mockClient.patch).toHaveBeenCalledWith(`agent-usage.org_abc.${today}`);
  });

  it("respects AGENT_DAILY_MESSAGE_LIMIT overrides", async () => {
    vi.stubEnv("AGENT_DAILY_MESSAGE_LIMIT", "3");
    mockClient.__chain.commit.mockResolvedValueOnce({ count: 4 });
    const { checkAgentRateLimit, AGENT_DAILY_MESSAGE_LIMIT } = await importFresh();

    expect(AGENT_DAILY_MESSAGE_LIMIT).toBe(3);
    const result = await checkAgentRateLimit("org_abc");
    expect(result).toEqual({ allowed: false, count: 4, limit: 3 });
    vi.unstubAllEnvs();
  });
});
