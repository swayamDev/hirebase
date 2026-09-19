import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";

const mockClient = createMockSanityClient();

vi.mock("@/lib/sanity/client", () => ({
  readClient: mockClient,
  writeClient: mockClient,
}));
vi.mock("server-only", () => ({}));

const { countJobs, countCandidates, enforceCreateLimit, FREE_JOB_LIMIT, FREE_CANDIDATE_LIMIT } =
  await import("@/lib/plan-limits");

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.delete.mockClear();
});

describe("limit constants", () => {
  it("free plan allows exactly 1 job and 25 candidates", () => {
    expect(FREE_JOB_LIMIT).toBe(1);
    expect(FREE_CANDIDATE_LIMIT).toBe(25);
  });
});

describe("countJobs / countCandidates", () => {
  it("counts jobs scoped to the given org", async () => {
    mockClient.fetch.mockResolvedValueOnce(3);
    const total = await countJobs("org_abc");
    expect(total).toBe(3);
    expect(mockClient.fetch).toHaveBeenCalledWith(
      expect.stringContaining('_type == "job" && orgId == $orgId'),
      { orgId: "org_abc" },
    );
  });

  it("excludes archived candidates from the count", async () => {
    mockClient.fetch.mockResolvedValueOnce(10);
    await countCandidates("org_abc");
    expect(mockClient.fetch).toHaveBeenCalledWith(
      expect.stringContaining("archived != true"),
      { orgId: "org_abc" },
    );
  });
});

describe("enforceCreateLimit", () => {
  it("keeps the document when it's within the survivor set (the common, non-racing case)", async () => {
    mockClient.fetch.mockResolvedValueOnce(["doc_new"]);
    const kept = await enforceCreateLimit({
      type: "job",
      orgId: "org_abc",
      limit: 1,
      newId: "doc_new",
    });
    expect(kept).toBe(true);
    expect(mockClient.delete).not.toHaveBeenCalled();
  });

  it("rolls back the document when a concurrent request already filled the quota", async () => {
    // Simulates the race: by the time this request re-counts, an earlier
    // concurrent create already claimed the only slot.
    mockClient.fetch.mockResolvedValueOnce(["doc_earlier"]);
    const kept = await enforceCreateLimit({
      type: "job",
      orgId: "org_abc",
      limit: 1,
      newId: "doc_new",
    });
    expect(kept).toBe(false);
    expect(mockClient.delete).toHaveBeenCalledWith("doc_new");
  });

  it("orders survivors by (createdAt, _id) so the earliest writer always wins, regardless of request order", async () => {
    await enforceCreateLimit({
      type: "candidate",
      orgId: "org_abc",
      limit: 25,
      newId: "doc_new",
      extraFilter: "archived != true",
    }).catch(() => {});
    expect(mockClient.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/order\(_createdAt asc, _id asc\)\[0\.\.\.25\]/),
      { type: "candidate", orgId: "org_abc" },
    );
  });

  it("applies the extraFilter clause (e.g. excluding archived candidates)", async () => {
    mockClient.fetch.mockResolvedValueOnce(["doc_new"]);
    await enforceCreateLimit({
      type: "candidate",
      orgId: "org_abc",
      limit: 25,
      newId: "doc_new",
      extraFilter: "archived != true",
    });
    expect(mockClient.fetch).toHaveBeenCalledWith(
      expect.stringContaining("archived != true"),
      expect.anything(),
    );
  });
});
