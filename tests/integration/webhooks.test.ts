import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSanityClient } from "../mocks/sanity";

const mockClient = createMockSanityClient();
const mockVerifyWebhook = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sanity/client", () => ({
  readClient: mockClient,
  writeClient: mockClient,
}));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mockVerifyWebhook }));

const { POST } = await import("@/app/api/webhooks/route");

function fakeRequest() {
  return new Request("https://hire.swayam.space/api/webhooks", {
    method: "POST",
  }) as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  mockVerifyWebhook.mockReset();
  mockClient.createOrReplace.mockReset();
  mockClient.patch.mockClear();
  mockClient.__chain.commit.mockClear();
  mockClient.__chain.commit.mockResolvedValue({});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("signature verification", () => {
  it("returns 400 and logs, without touching Sanity, when verification fails", async () => {
    mockVerifyWebhook.mockRejectedValueOnce(new Error("bad signature"));
    const res = await POST(fakeRequest());
    expect(res.status).toBe(400);
    expect(mockClient.createOrReplace).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "[clerk-webhook] signature verification failed",
      expect.any(Error),
    );
  });
});

describe("organization.created / organization.updated", () => {
  it("upserts the Sanity organization document", async () => {
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "organization.created",
      data: { id: "org_abc", name: "Acme Recruiting" },
    });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(200);
    expect(mockClient.createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "org.org_abc",
        _type: "organization",
        name: "Acme Recruiting",
        clerkOrgId: "org_abc",
      }),
    );
  });

  it("falls back to the org id when no name is provided", async () => {
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "organization.updated",
      data: { id: "org_abc" },
    });
    await POST(fakeRequest());
    expect(mockClient.createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ name: "org_abc" }),
    );
  });
});

describe("organization.deleted", () => {
  it("soft-deletes by setting deletedAt", async () => {
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "organization.deleted",
      data: { id: "org_abc" },
    });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(200);
    expect(mockClient.patch).toHaveBeenCalledWith("org.org_abc");
  });

  it("does not throw, but does log, when the org doc was never synced", async () => {
    mockClient.__chain.commit.mockRejectedValueOnce(new Error("not found"));
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "organization.deleted",
      data: { id: "org_never_synced" },
    });
    const res = await POST(fakeRequest());
    // The audit fix: this must not throw a 500 for an expected case, but it
    // must log so an unexpected failure (auth, network) is still visible.
    expect(res.status).toBe(200);
    expect(console.warn).toHaveBeenCalledWith(
      "[clerk-org-sync] delete-patch failed (may be unsynced org)",
      expect.objectContaining({ orgId: "org_never_synced" }),
      expect.any(Error),
    );
  });
});

describe("billing events", () => {
  it("acknowledges subscription events with 200 without writing to Sanity", async () => {
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "subscription.created",
      data: { id: "sub_1", payer: { organization_id: "org_abc" } },
    });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(200);
    expect(mockClient.createOrReplace).not.toHaveBeenCalled();
    expect(mockClient.patch).not.toHaveBeenCalled();
  });

  it("acknowledges subscriptionItem events (cancellation arrives this way, not as subscription.canceled)", async () => {
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "subscriptionItem.canceled",
      data: { id: "item_1", payer: { organization_id: "org_abc" } },
    });
    const res = await POST(fakeRequest());
    expect(res.status).toBe(200);
  });
});
