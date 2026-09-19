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

const { createCandidate, archiveCandidate, updateCandidate } = await import(
  "@/lib/actions/candidates"
);

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.create.mockReset();
  mockClient.delete.mockClear();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(makeAuthState());
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createCandidate - validation", () => {
  it("requires a name", async () => {
    const result = await createCandidate({ name: "   " });
    expect(result).toEqual({ error: "Name is required." });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it.each([
    "not-an-email",
    "missing-at-sign.com",
    "two@@signs.com",
    "trailing@dot.",
    "@no-local-part.com",
    "spaces in@address.com",
  ])("rejects a malformed email: %s", async (email) => {
    const result = await createCandidate({ name: "Ada Lovelace", email });
    expect(result).toEqual({
      error: "That doesn't look like a valid email address.",
    });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it.each([
    "ada@example.com",
    "ada.lovelace+jobs@sub.example.co.uk",
    "a@b.co",
  ])("accepts a well-formed email: %s", async (email) => {
    mockClient.fetch.mockResolvedValueOnce(0).mockResolvedValueOnce(["cand_new"]);
    mockClient.create.mockResolvedValueOnce({ _id: "cand_new" });
    const result = await createCandidate({ name: "Ada Lovelace", email });
    expect(result).toEqual({ id: "cand_new" });
  });

  it("treats an empty email as absent rather than invalid", async () => {
    mockClient.fetch.mockResolvedValueOnce(0).mockResolvedValueOnce(["cand_new"]);
    mockClient.create.mockResolvedValueOnce({ _id: "cand_new" });
    const result = await createCandidate({ name: "Ada Lovelace", email: "" });
    expect(result).toEqual({ id: "cand_new" });
  });
});

describe("createCandidate - free plan limit", () => {
  it("rejects once the free-plan candidate count is reached", async () => {
    mockClient.fetch.mockResolvedValueOnce(25); // countCandidates pre-check
    const result = await createCandidate({ name: "Ada Lovelace" });
    expect(result).toEqual({
      error: "Free plan is limited to 25 candidates - upgrade for unlimited.",
      limitReached: true,
    });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("rolls back the candidate when a concurrent request wins the race for the last slot", async () => {
    mockClient.fetch
      .mockResolvedValueOnce(24) // countCandidates pre-check: looked like room
      .mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => `other_${i}`)); // post-write survivors don't include ours
    mockClient.create.mockResolvedValueOnce({ _id: "cand_mine" });

    const result = await createCandidate({ name: "Ada Lovelace" });
    expect(result).toEqual({
      error: "Free plan is limited to 25 candidates - upgrade for unlimited.",
      limitReached: true,
    });
    expect(mockClient.delete).toHaveBeenCalledWith("cand_mine");
  });

  it("skips the limit checks for orgs with the unlimited_candidates feature", async () => {
    mockAuth.mockResolvedValueOnce(
      makeAuthState({ has: ({ feature }) => feature === "unlimited_candidates" }),
    );
    mockClient.create.mockResolvedValueOnce({ _id: "cand_new" });
    const result = await createCandidate({ name: "Ada Lovelace" });
    expect(result).toEqual({ id: "cand_new" });
    expect(mockClient.fetch).not.toHaveBeenCalled();
  });
});

describe("archiveCandidate", () => {
  it("archives a candidate the org owns", async () => {
    mockClient.fetch.mockResolvedValueOnce("cand_1");
    await archiveCandidate("cand_1");
    expect(mockClient.patch).toHaveBeenCalledWith("cand_1");
  });

  it("refuses to archive a candidate from another org", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    await expect(archiveCandidate("cand_other_org")).rejects.toThrow(
      "Not found in this organization",
    );
  });
});

describe("updateCandidate", () => {
  it("rejects when the candidate isn't in this workspace", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    const result = await updateCandidate("cand_other_org", { name: "New Name" });
    expect(result).toEqual({ error: "That candidate is not in this workspace." });
  });

  it("validates email on update too", async () => {
    mockClient.fetch.mockResolvedValueOnce("cand_1");
    const result = await updateCandidate("cand_1", {
      name: "Ada Lovelace",
      email: "not-an-email",
    });
    expect(result).toEqual({
      error: "That doesn't look like a valid email address.",
    });
  });

  it("updates on the happy path", async () => {
    mockClient.fetch.mockResolvedValueOnce("cand_1");
    const result = await updateCandidate("cand_1", {
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    expect(result).toEqual({ ok: true });
  });
});
