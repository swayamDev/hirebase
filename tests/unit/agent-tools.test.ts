import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions/companies", () => ({ createCompany: vi.fn() }));
vi.mock("@/lib/actions/jobs", () => ({
  createJob: vi.fn(),
  closeJob: vi.fn(),
  reopenJob: vi.fn(),
}));
vi.mock("@/lib/actions/candidates", () => ({
  createCandidate: vi.fn(),
  archiveCandidate: vi.fn(),
}));
vi.mock("@/lib/actions/applications", () => ({
  createApplication: vi.fn(),
  moveApplication: vi.fn(),
}));
vi.mock("@/lib/actions/interviews", () => ({ createInterview: vi.fn() }));

const { buildActionTools, buildClientTools } = await import("@/lib/agent-tools");
const { createCompany } = await import("@/lib/actions/companies");
const { createJob, closeJob, reopenJob } = await import("@/lib/actions/jobs");
const { createCandidate, archiveCandidate } = await import(
  "@/lib/actions/candidates"
);
const { createApplication, moveApplication } = await import(
  "@/lib/actions/applications"
);
const { createInterview } = await import("@/lib/actions/interviews");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("create_company tool", () => {
  it("returns ok on success", async () => {
    vi.mocked(createCompany).mockResolvedValueOnce(undefined);
    const tools = buildActionTools();
    const result = await tools.create_company.execute!(
      { name: "Acme Inc" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("catches, logs, and surfaces the error message from the action instead of throwing into the model loop", async () => {
    vi.mocked(createCompany).mockRejectedValueOnce(new Error("Name is required"));
    const tools = buildActionTools();
    const result = await tools.create_company.execute!(
      { name: "" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "Name is required" });
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("set_job_status tool", () => {
  it("closes a job", async () => {
    vi.mocked(closeJob).mockResolvedValueOnce(undefined);
    const tools = buildActionTools();
    const result = await tools.set_job_status.execute!(
      { jobId: "job_1", status: "closed" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toMatchObject({ ok: true });
    expect(closeJob).toHaveBeenCalledWith("job_1");
    expect(reopenJob).not.toHaveBeenCalled();
  });

  it("returns a friendly error (does not throw) for a cross-org job", async () => {
    vi.mocked(closeJob).mockRejectedValueOnce(
      new Error("Not found in this organization"),
    );
    const tools = buildActionTools();
    const result = await tools.set_job_status.execute!(
      { jobId: "job_other_org", status: "closed" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "That job is not in this workspace." });
  });
});

describe("archive_candidate tool", () => {
  it("returns a friendly error (does not throw) for a cross-org candidate", async () => {
    vi.mocked(archiveCandidate).mockRejectedValueOnce(
      new Error("Not found in this organization"),
    );
    const tools = buildActionTools();
    const result = await tools.archive_candidate.execute!(
      { candidateId: "cand_other_org" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "That candidate is not in this workspace." });
  });
});

describe("pass-through tools", () => {
  it("create_job forwards the action's error shape unchanged", async () => {
    vi.mocked(createJob).mockResolvedValueOnce({ error: "Give the job a title." });
    const tools = buildActionTools();
    const result = await tools.create_job.execute!(
      { title: "", companyId: "co_1" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "Give the job a title." });
  });

  it("create_candidate includes a dashboard link on success", async () => {
    vi.mocked(createCandidate).mockResolvedValueOnce({ id: "cand_1" });
    const tools = buildActionTools();
    const result = await tools.create_candidate.execute!(
      { name: "Ada Lovelace" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toMatchObject({
      ok: true,
      candidateId: "cand_1",
      message: expect.stringContaining("/dashboard/candidates/cand_1"),
    });
  });

  it("add_to_pipeline forwards duplicate-application errors unchanged", async () => {
    vi.mocked(createApplication).mockResolvedValueOnce({
      error: "This candidate is already in the pipeline.",
    });
    const tools = buildActionTools();
    const result = await tools.add_to_pipeline.execute!(
      { jobId: "job_1", candidateId: "cand_1" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "This candidate is already in the pipeline." });
  });

  it("move_application reports the new stage on success", async () => {
    vi.mocked(moveApplication).mockResolvedValueOnce({
      stage: "offer",
      stageUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    const tools = buildActionTools();
    const result = await tools.move_application.execute!(
      { applicationId: "app_1", stage: "offer" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toMatchObject({ ok: true, stage: "offer" });
  });

  it("log_interview forwards the action's error shape unchanged", async () => {
    vi.mocked(createInterview).mockResolvedValueOnce({
      error: "Round name is required.",
    });
    const tools = buildActionTools();
    const result = await tools.log_interview.execute!(
      { candidateId: "cand_1", applicationId: "app_1", roundName: "" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result).toEqual({ error: "Round name is required." });
  });
});

describe("client tools", () => {
  it("get_current_page and navigate_to are schema-only (no execute) - the browser runs them, not the server", () => {
    const tools = buildClientTools();
    expect(tools.get_current_page.execute).toBeUndefined();
    expect(tools.navigate_to.execute).toBeUndefined();
  });
});
