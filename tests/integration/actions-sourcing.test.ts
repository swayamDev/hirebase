import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";
import { makeAuthState } from "../mocks/clerk";

const mockClient = createMockSanityClient();
const mockAuth = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sanity/client", () => ({
  readClient: mockClient,
  writeClient: mockClient,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { sourceCandidates } = await import("@/lib/actions/sourcing");

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(
    makeAuthState({ has: ({ feature }) => feature === "ai_agent" }),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("sourceCandidates - access", () => {
  it("prompts to upgrade when the org lacks the ai_agent feature", async () => {
    mockAuth.mockResolvedValueOnce(makeAuthState({ has: () => false }));
    const result = await sourceCandidates("job_1");
    expect(result).toEqual({ upgrade: true });
    expect(mockClient.fetch).not.toHaveBeenCalled();
  });

  it("rejects a job that isn't in this workspace", async () => {
    mockClient.fetch.mockResolvedValueOnce(null); // assertOwned
    const result = await sourceCandidates("job_other_org");
    expect(result).toEqual({ error: "That job is not in this workspace." });
  });

  it("handles a job that was deleted between the ownership check and the fetch", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1") // assertOwned
      .mockResolvedValueOnce(null); // job fetch
    const result = await sourceCandidates("job_1");
    expect(result).toEqual({ error: "Job not found." });
  });
});

describe("sourceCandidates - scoring", () => {
  it("returns an empty match list without dividing by zero when no candidates score", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce({ title: "Engineer", description: null, seniority: null })
      .mockResolvedValueOnce([]);
    const result = await sourceCandidates("job_1");
    expect(result).toEqual({ matches: [] });
  });

  it("stretches scores across the 35-95% band, best candidate first", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce({ title: "Engineer", description: null, seniority: null })
      .mockResolvedValueOnce([
        { _id: "c1", name: "Best match", headline: null, avatarUrl: null, skills: null, _score: 0.9 },
        { _id: "c2", name: "Middle", headline: null, avatarUrl: null, skills: null, _score: 0.6 },
        { _id: "c3", name: "Worst match", headline: null, avatarUrl: null, skills: null, _score: 0.3 },
      ]);
    const result = await sourceCandidates("job_1");
    expect(result).toMatchObject({
      matches: [
        { _id: "c1", pct: 95 },
        { _id: "c2", pct: 65 },
        { _id: "c3", pct: 35 },
      ],
    });
  });

  it("falls back to a flat 75% when every candidate scores identically (zero spread)", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce({ title: "Engineer", description: null, seniority: null })
      .mockResolvedValueOnce([
        { _id: "c1", name: "A", headline: null, avatarUrl: null, skills: null, _score: 0.5 },
        { _id: "c2", name: "B", headline: null, avatarUrl: null, skills: null, _score: 0.5 },
      ]);
    const result = await sourceCandidates("job_1");
    expect(result).toMatchObject({
      matches: [
        { _id: "c1", pct: 75 },
        { _id: "c2", pct: 75 },
      ],
    });
  });

  it("caps results at the top 8 matches", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce({ title: "Engineer", description: null, seniority: null })
      .mockResolvedValueOnce(
        Array.from({ length: 30 }, (_, i) => ({
          _id: `c${i}`,
          name: `Candidate ${i}`,
          headline: null,
          avatarUrl: null,
          skills: null,
          _score: 1 - i * 0.01,
        })),
      );
    const result = await sourceCandidates("job_1");
    expect("matches" in result && result.matches).toHaveLength(8);
  });
});
