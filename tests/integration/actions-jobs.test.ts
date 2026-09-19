import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";
import { makeAuthState, MockRedirectError } from "../mocks/clerk";

const mockClient = createMockSanityClient();
const mockAuth = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sanity/client", () => ({
  readClient: mockClient,
  writeClient: mockClient,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new MockRedirectError(path);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createJob, closeJob, reopenJob, updateJob } = await import(
  "@/lib/actions/jobs"
);

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.create.mockReset();
  mockClient.delete.mockClear();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(makeAuthState());
});

describe("createJob", () => {
  it("rejects a missing title before touching Sanity", async () => {
    mockClient.fetch.mockResolvedValueOnce(0); // countJobs pre-check
    const result = await createJob(formData({ companyId: "co_1" }));
    expect(result).toEqual({ error: "Give the job a title." });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("rejects a missing company", async () => {
    mockClient.fetch.mockResolvedValueOnce(0);
    const result = await createJob(formData({ title: "Engineer" }));
    expect(result).toEqual({ error: "Choose a client company." });
  });

  it("rejects when the free-plan job limit is already reached", async () => {
    mockClient.fetch.mockResolvedValueOnce(1); // countJobs pre-check: already at limit
    const result = await createJob(
      formData({ title: "Engineer", companyId: "co_1" }),
    );
    expect(result).toEqual({
      error:
        "Free plan includes 1 job - closing a job does not free the slot.",
      upgrade: true,
    });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("rejects when the company doesn't belong to this org", async () => {
    mockClient.fetch
      .mockResolvedValueOnce(0) // countJobs pre-check: room available
      .mockResolvedValueOnce(null); // assertOwned(companyId): not found
    const result = await createJob(
      formData({ title: "Engineer", companyId: "co_other_org" }),
    );
    expect(result).toEqual({ error: "That company is not in this workspace." });
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("creates the job on the happy path", async () => {
    mockClient.fetch
      .mockResolvedValueOnce(0) // countJobs pre-check
      .mockResolvedValueOnce("co_1") // assertOwned(companyId)
      .mockResolvedValueOnce(["job_new"]); // enforceCreateLimit survivors
    mockClient.create.mockResolvedValueOnce({ _id: "job_new" });

    const result = await createJob(
      formData({
        title: "Senior Engineer",
        companyId: "co_1",
        seniority: "senior",
        salaryRange: "$150k-$180k",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "job",
        orgId: "org_abc123",
        title: "Senior Engineer",
        status: "open",
        seniority: "senior",
        salaryRange: "$150k-$180k",
      }),
    );
  });

  it("rejects an invalid seniority value rather than storing it", async () => {
    mockClient.fetch
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce("co_1")
      .mockResolvedValueOnce(["job_new"]);
    mockClient.create.mockResolvedValueOnce({ _id: "job_new" });

    await createJob(
      formData({
        title: "Engineer",
        companyId: "co_1",
        seniority: "<script>alert(1)</script>",
      }),
    );

    const created = mockClient.create.mock.calls[0][0];
    expect(created).not.toHaveProperty("seniority");
  });

  it("rolls back the job when a concurrent request wins the race for the last free slot", async () => {
    mockClient.fetch
      .mockResolvedValueOnce(0) // countJobs pre-check: looked like room
      .mockResolvedValueOnce("co_1") // assertOwned
      .mockResolvedValueOnce(["job_from_other_request"]); // post-write: someone else got there first
    mockClient.create.mockResolvedValueOnce({ _id: "job_mine" });

    const result = await createJob(
      formData({ title: "Engineer", companyId: "co_1" }),
    );

    expect(result).toEqual({
      error:
        "Free plan includes 1 job - closing a job does not free the slot.",
      upgrade: true,
    });
    expect(mockClient.delete).toHaveBeenCalledWith("job_mine");
  });

  it("skips both limit checks entirely for orgs with the unlimited_jobs feature", async () => {
    mockAuth.mockResolvedValueOnce(
      makeAuthState({ has: ({ feature }) => feature === "unlimited_jobs" }),
    );
    mockClient.fetch.mockResolvedValueOnce("co_1"); // only assertOwned is called
    mockClient.create.mockResolvedValueOnce({ _id: "job_new" });

    const result = await createJob(
      formData({ title: "Engineer", companyId: "co_1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockClient.fetch).toHaveBeenCalledTimes(1); // no countJobs, no enforceCreateLimit
  });

  it("redirects to sign-in when there's no authenticated user", async () => {
    mockAuth.mockResolvedValueOnce(makeAuthState({ userId: null }));
    await expect(
      createJob(formData({ title: "Engineer", companyId: "co_1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/sign-in");
  });

  it("redirects to onboarding when the user has no active org", async () => {
    mockAuth.mockResolvedValueOnce(makeAuthState({ orgId: null }));
    await expect(
      createJob(formData({ title: "Engineer", companyId: "co_1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });
});

describe("closeJob / reopenJob", () => {
  it("closes a job the org owns", async () => {
    mockClient.fetch.mockResolvedValueOnce("job_1");
    await closeJob("job_1");
    expect(mockClient.patch).toHaveBeenCalledWith("job_1");
  });

  it("refuses to close a job belonging to another org", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    await expect(closeJob("job_other_org")).rejects.toThrow(
      "Not found in this organization",
    );
  });

  it("reopens a job the org owns", async () => {
    mockClient.fetch.mockResolvedValueOnce("job_1");
    await reopenJob("job_1");
    expect(mockClient.patch).toHaveBeenCalledWith("job_1");
  });
});

describe("updateJob", () => {
  it("rejects when the job isn't in this workspace", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    const result = await updateJob("job_other_org", formData({ title: "X" }));
    expect(result).toEqual({ error: "That job is not in this workspace." });
  });

  it("rejects a blank title", async () => {
    mockClient.fetch.mockResolvedValueOnce("job_1");
    const result = await updateJob("job_1", formData({ title: "   " }));
    expect(result).toEqual({ error: "Give the job a title." });
  });

  it("rejects when the new company isn't in this workspace", async () => {
    mockClient.fetch
      .mockResolvedValueOnce("job_1") // assertOwned(job)
      .mockResolvedValueOnce(null); // assertOwned(companyId)
    const result = await updateJob(
      "job_1",
      formData({ title: "Engineer", companyId: "co_other_org" }),
    );
    expect(result).toEqual({ error: "That company is not in this workspace." });
  });

  it("updates on the happy path", async () => {
    mockClient.fetch.mockResolvedValueOnce("job_1");
    const result = await updateJob(
      "job_1",
      formData({ title: "Staff Engineer", seniority: "staff" }),
    );
    expect(result).toEqual({ ok: true });
    expect(mockClient.patch).toHaveBeenCalledWith("job_1");
  });
});
