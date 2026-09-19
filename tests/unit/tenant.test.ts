import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";

const mockClient = createMockSanityClient();

vi.mock("@/lib/sanity/client", () => ({
  readClient: mockClient,
  writeClient: mockClient,
}));

// tenant.ts is server-only; the "server-only" package throws if imported
// outside a server context, which Vitest's node/jsdom environment counts
// as. Stub it out so the module under test can load normally.
vi.mock("server-only", () => ({}));

const { assertValidOrgId, orgDocId, orgRef, assertOwned } = await import(
  "@/lib/tenant"
);

describe("assertValidOrgId", () => {
  it("accepts a well-formed Clerk org id", () => {
    expect(() => assertValidOrgId("org_2abc123XYZ")).not.toThrow();
  });

  it.each([
    ["empty string", ""],
    ["missing org_ prefix", "2abc123XYZ"],
    ["wrong prefix", "user_2abc123XYZ"],
    ["path traversal attempt", "org_../../etc/passwd"],
    ["GROQ injection attempt", 'org_1" || true || "'],
    ["whitespace", "org_ abc"],
    ["null byte", "org_abc\0"],
  ])("rejects %s (%p)", (_label, value) => {
    expect(() => assertValidOrgId(value)).toThrow("Invalid organization id");
  });
});

describe("orgDocId / orgRef", () => {
  it("prefixes the Clerk org id to build the Sanity doc id", () => {
    expect(orgDocId("org_abc123")).toBe("org.org_abc123");
  });

  it("builds a weak reference so sync lag never blocks writes", () => {
    expect(orgRef("org_abc123")).toEqual({
      _type: "reference",
      _ref: "org.org_abc123",
      _weak: true,
    });
  });
});

describe("assertOwned", () => {
  beforeEach(() => {
    mockClient.fetch.mockReset();
  });

  it("resolves with the document id when it belongs to the org", async () => {
    mockClient.fetch.mockResolvedValueOnce("doc_1");
    await expect(assertOwned("doc_1", "org_abc")).resolves.toBe("doc_1");
    expect(mockClient.fetch).toHaveBeenCalledWith(
      expect.stringContaining("_id == $id && orgId == $orgId"),
      { id: "doc_1", orgId: "org_abc" },
    );
  });

  it("throws when the document belongs to a different org (or doesn't exist)", async () => {
    mockClient.fetch.mockResolvedValueOnce(null);
    await expect(assertOwned("doc_1", "org_other")).rejects.toThrow(
      "Not found in this organization",
    );
  });

  it("validates the orgId before ever querying Sanity", async () => {
    await expect(assertOwned("doc_1", "not-a-valid-org-id")).rejects.toThrow(
      "Invalid organization id",
    );
    expect(mockClient.fetch).not.toHaveBeenCalled();
  });
});
