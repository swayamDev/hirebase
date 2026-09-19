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

const { createCompany, updateCompany } = await import("@/lib/actions/companies");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  mockClient.fetch.mockReset();
  mockClient.create.mockReset();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(makeAuthState());
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("createCompany", () => {
  it("requires a name", async () => {
    await expect(createCompany(formData({}))).rejects.toThrow("Name is required");
    expect(mockClient.create).not.toHaveBeenCalled();
  });

  it("creates the company on the happy path", async () => {
    await createCompany(formData({ name: "Acme Inc" }));
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "company", name: "Acme Inc" }),
    );
  });

  it("prefixes a bare domain with https://", async () => {
    await createCompany(formData({ name: "Acme Inc", website: "acme.com" }));
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ website: "https://acme.com" }),
    );
  });

  it("leaves an already-schemed URL untouched", async () => {
    await createCompany(
      formData({ name: "Acme Inc", website: "http://acme.com" }),
    );
    expect(mockClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ website: "http://acme.com" }),
    );
  });
});

describe("updateCompany", () => {
  it("rejects when the company isn't in this workspace", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    const result = await updateCompany("co_other_org", formData({ name: "X" }));
    expect(result).toEqual({ error: "That company is not in this workspace." });
  });

  it("rejects a blank name", async () => {
    mockClient.fetch.mockResolvedValueOnce("co_1");
    const result = await updateCompany("co_1", formData({ name: "" }));
    expect(result).toEqual({ error: "Name is required." });
  });

  it("updates on the happy path", async () => {
    mockClient.fetch.mockResolvedValueOnce("co_1");
    const result = await updateCompany("co_1", formData({ name: "Acme Inc" }));
    expect(result).toEqual({ ok: true });
  });
});
