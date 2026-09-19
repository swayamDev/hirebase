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

const { createInterview } = await import("@/lib/actions/interviews");

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.create.mockReset();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(makeAuthState());
});

describe("createInterview", () => {
  it("requires an applicationId", async () => {
    const result = await createInterview({
      candidateId: "cand_1",
      applicationId: "",
      roundName: "Tech screen",
    });
    expect(result).toEqual({ error: "Choose an application." });
  });

  it("requires a round name", async () => {
    mockClient.fetch.mockResolvedValueOnce("app_1"); // assertOwned
    const result = await createInterview({
      candidateId: "cand_1",
      applicationId: "app_1",
      roundName: "   ",
    });
    expect(result).toEqual({ error: "Round name is required." });
  });

  it("rejects an application that doesn't belong to the given candidate", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1") // assertOwned
      .mockResolvedValueOnce(null); // scoped candidate/application match
    const result = await createInterview({
      candidateId: "cand_wrong",
      applicationId: "app_1",
      roundName: "Tech screen",
    });
    expect(result).toEqual({
      error: "That application does not belong to this candidate.",
    });
  });

  it("rejects an invalid scheduledAt", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1")
      .mockResolvedValueOnce("app_1");
    const result = await createInterview({
      candidateId: "cand_1",
      applicationId: "app_1",
      roundName: "Tech screen",
      scheduledAt: "not-a-date",
    });
    expect(result).toEqual({ error: "Enter a valid date and time." });
  });

  it("creates the interview on the happy path", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1")
      .mockResolvedValueOnce("app_1");
    mockClient.create.mockResolvedValueOnce({ _id: "iv_1" });
    const result = await createInterview({
      candidateId: "cand_1",
      applicationId: "app_1",
      roundName: "Tech screen",
      outcome: "pass",
    });
    expect(result).toEqual({ id: "iv_1" });
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "interview", outcome: "pass" }),
    );
  });

  it("defaults an unrecognized outcome to 'pending' rather than storing it verbatim", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("app_1")
      .mockResolvedValueOnce("app_1");
    mockClient.create.mockResolvedValueOnce({ _id: "iv_1" });
    await createInterview({
      candidateId: "cand_1",
      applicationId: "app_1",
      roundName: "Tech screen",
      outcome: "<script>",
    });
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "pending" }),
    );
  });

  // Documents current behavior found while writing this suite: unlike every
  // other action in lib/actions, createInterview does not wrap assertOwned
  // in a try/catch, so a cross-org applicationId throws instead of
  // returning a friendly { error } like its siblings do. Not fixed here -
  // out of scope for the testing task - but pinned down so it's visible
  // and doesn't get "fixed" into a silent behavior change by accident.
  it("throws (rather than returning a friendly error) for a cross-org applicationId - inconsistent with other actions, flagged not fixed", async () => {
    mockClient.fetch.mockRejectedValueOnce(
      new Error("Not found in this organization"),
    );
    await expect(
      createInterview({
        candidateId: "cand_1",
        applicationId: "app_other_org",
        roundName: "Tech screen",
      }),
    ).rejects.toThrow("Not found in this organization");
  });
});
