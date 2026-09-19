import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Runs once before the e2e suite. Requires a Clerk DEVELOPMENT instance's
 * keys (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY) in the
 * environment - clerkSetup() throws if given production keys, which is a
 * deliberate safety rail against ever running e2e tests against real data.
 * See TESTING.md for the full list of required env vars.
 */
export default async function globalSetup() {
  await clerkSetup();
}
