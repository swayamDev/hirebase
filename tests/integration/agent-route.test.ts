import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockCheckAgentRateLimit = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("@/lib/agent-rate-limit", () => ({
  checkAgentRateLimit: mockCheckAgentRateLimit,
  AGENT_DAILY_MESSAGE_LIMIT: 10,
}));

// The route also imports the AI SDK / MCP / Sanity Insights machinery used
// past these guard clauses. None of it runs in the cases tested here (every
// case below returns before touching it), and mocking the full streaming
// stack is a deliberately-skipped, documented scope decision (see
// TESTING.md) - these two mocks exist only so the module import itself
// doesn't require real network/env setup.
vi.mock("@/lib/sanity/client", () => ({ writeClient: {} }));
vi.mock("@/lib/mcp", () => ({
  initialContextFor: vi.fn(),
  orgScopedMcpUrl: vi.fn(),
}));

const { POST } = await import("@/app/api/agent/route");

function fakeRequest(body: unknown = { messages: [] }) {
  return new Request("https://hire.swayam.space/api/agent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  mockCheckAgentRateLimit.mockReset();
});

describe("POST /api/agent - guard clauses", () => {
  it("401s when there's no signed-in user", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null, orgId: null, has: () => false });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(mockCheckAgentRateLimit).not.toHaveBeenCalled();
  });

  it("401s when there's no active org", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "user_1", orgId: null, has: () => false });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(401);
  });

  it("403s when the org's plan doesn't include the AI agent", async () => {
    mockAuth.mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_abc",
      has: () => false,
    });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "upgrade_required" });
    expect(mockCheckAgentRateLimit).not.toHaveBeenCalled();
  });

  it("429s once the org's daily rate limit is hit, without ever reaching the LLM call", async () => {
    mockAuth.mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_abc",
      has: ({ feature }: { feature: string }) => feature === "ai_agent",
    });
    mockCheckAgentRateLimit.mockResolvedValueOnce({
      allowed: false,
      count: 11,
      limit: 10,
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({
      error: "rate_limited",
      message: expect.stringContaining("10-message daily limit"),
    });
  });

  it("checks the rate limit for the org, only after confirming access", async () => {
    mockAuth.mockResolvedValueOnce({
      userId: "user_1",
      orgId: "org_xyz",
      has: () => true,
    });
    mockCheckAgentRateLimit.mockResolvedValueOnce({ allowed: false, count: 11, limit: 10 });

    await POST(fakeRequest());

    expect(mockCheckAgentRateLimit).toHaveBeenCalledWith("org_xyz");
  });
});
