import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { readClient } from "./sanity/client";

/**
 * Every read filters on orgId; every write goes through assertOwned first.
 * The orgId ALWAYS comes from auth() - never from client input.
 */
export async function requireOrg() {
  const { userId, orgId, has } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");
  assertValidOrgId(orgId);
  return { userId, orgId, has };
}

/** Sanity _id of the synced organization document for a Clerk org. */
export function orgDocId(orgId: string): string {
  return `org.${orgId}`;
}

/** Weak reference to the org document - weak because sync may lag creation. */
export function orgRef(orgId: string) {
  return { _type: "reference" as const, _ref: orgDocId(orgId), _weak: true };
}

export function assertValidOrgId(orgId: string) {
  if (!/^org_[A-Za-z0-9]+$/.test(orgId)) {
    throw new Error("Invalid organization id");
  }
}

/**
 * Sanity patches/deletes target _ids and carry no filter - this guard is the
 * write-side tenant boundary. Throws unless the document belongs to the org.
 */
export async function assertOwned(id: string, orgId: string): Promise<string> {
  assertValidOrgId(orgId);
  const hit = await readClient.fetch<string | null>(
    `*[_id == $id && orgId == $orgId][0]._id`,
    { id, orgId },
  );
  if (!hit) throw new Error("Not found in this organization");
  return hit;
}
