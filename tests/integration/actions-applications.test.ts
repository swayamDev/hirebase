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

const { moveApplication, createApplication, recordOffer } = await import(
  "@/lib/actions/applications"
);

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.create.mockReset();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(makeAuthState());
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("moveApplication", () => {
  it("rejects an unrecognized stage without touching Sanity", async () => {
    const result = await moveApplication("app_1", "not-a-real-stage" as never);
    expect(result).toEqual({ error: "Unknown stage." });
    expect(mockClient.fetch).not.toHaveBeenCalled();
  });

  it("moves the application on the happy path", async () => {
    mockClient.fetch.mockResolvedValueOnce("app_1");
    const result = await moveApplication("app_1", "interviewing");
    expect(result).toMatchObject({ stage: "interviewing" });
    expect(mockClient.patch).toHaveBeenCalledWith("app_1");
  });

  it("returns a generic error and LOGS the real one when the application isn't owned by this org", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    const result = await moveApplication("app_other_org", "offer");
    expect(result).toEqual({ error: "Could not move the candidate. Try again." });
    // This is the audit fix: the error must not be silently swallowed.
    expect(console.error).toHaveBeenCalledWith(
      "[moveApplication]",
      expect.objectContaining({ id: "app_other_org" }),
      expect.any(Error),
    );
  });
});

describe("createApplication", () => {
  it("rejects when the job or candidate isn't owned by this org", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1") // assertOwned(jobId)
      .mockRejectedValueOnce(new Error("Not found in this organization")); // assertOwned(candidateId)
    const result = await createApplication("job_1", "candidate_other_org");
    expect(result).toEqual({ error: "Candidate or job is not in this workspace." });
    expect(console.warn).toHaveBeenCalled();
  });

  it("rejects a duplicate application for the same job/candidate pair", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("candidate_1")
      .mockResolvedValueOnce({ jobOk: true, candidateOk: true, dupes: 1 });
    const result = await createApplication("job_1", "candidate_1");
    expect(result).toEqual({ error: "This candidate is already in the pipeline." });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("rejects an archived candidate even if the ownership check somehow passed", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("candidate_1")
      .mockResolvedValueOnce({ jobOk: true, candidateOk: false, dupes: 0 });
    const result = await createApplication("job_1", "candidate_1");
    expect(result).toEqual({ error: "Candidate or job is not available." });
  });

  it("creates the application on the happy path", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("candidate_1")
      .mockResolvedValueOnce({ jobOk: true, candidateOk: true, dupes: 0 });
    const result = await createApplication("job_1", "candidate_1");
    expect(result).toEqual({ ok: true });
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "application", stage: "applied" }),
    );
  });
});

describe("recordOffer", () => {
  it("rejects when the application isn't in this workspace", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    const result = await recordOffer("app_other_org", { amount: "$10k" });
    expect(result).toEqual({ error: "That application is not in this workspace." });
  });

  it("rejects a blank amount", async () => {
    mockClient.fetch.mockResolvedValueOnce("app_1");
    const result = await recordOffer("app_1", { amount: "   " });
    expect(result).toEqual({ error: "Enter the offer amount." });
  });

  it("advances the stage to 'offer' on first recording", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1") // assertOwned
      .mockResolvedValueOnce({ stage: "interviewing", offerSentAt: null }); // current
    const result = await recordOffer("app_1", { amount: "$120k" });
    expect(result).toEqual({ ok: true });
    const patchCall = mockClient.patch.mock.calls.find((c) => c[0] === "app_1");
    expect(patchCall).toBeDefined();
  });

  it("does not regress the stage when an offer is edited after being hired", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1")
      .mockResolvedValueOnce({ stage: "hired", offerSentAt: "2026-01-01T00:00:00.000Z" });
    const result = await recordOffer("app_1", { amount: "$130k" });
    expect(result).toEqual({ ok: true });
  });
});
