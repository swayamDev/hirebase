import "server-only";
import { writeClient } from "./sanity/client";

/**
 * Messages a single org can send to the AI agent per UTC day. This exists
 * purely as a cost-control safety net for the public demo deployment - the
 * agent calls a real LLM on every message, and this app has no other limit
 * on how many times a signed-in user can hit that route. Not a billing
 * feature (compare lib/plan-limits.ts, which gates free vs. paid); every
 * org gets the same cap regardless of plan.
 *
 * Override via AGENT_DAILY_MESSAGE_LIMIT if you're not running the public
 * demo and want it higher (or effectively unlimited).
 */
export const AGENT_DAILY_MESSAGE_LIMIT = Number(
  process.env.AGENT_DAILY_MESSAGE_LIMIT ?? 10,
);

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Increments today's message count for the org and reports whether this
 * message is within the limit. Denied requests still increment - that's
 * deliberate: it means retrying after a denial doesn't reset or bypass the
 * window, same as most rate limiters.
 *
 * Concurrency note: Sanity's `inc()` is an atomic document-level mutation,
 * so the count itself is always correct under concurrent requests. What's
 * NOT fully race-proof is the boundary case where two concurrent requests
 * both land right at the limit - both could see "allowed" before either
 * commit is visible to the other. Unlike lib/plan-limits.ts's
 * enforceCreateLimit (which closes that exact race for paid-plan limits,
 * because going over there has real business/billing consequences), that
 * level of rigor isn't worth it here: worst case a handful of orgs get 11
 * messages instead of 10 on a given day. This is a cost guardrail, not a
 * contract.
 */
export async function checkAgentRateLimit(
  orgId: string,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const date = todayUTC();
  const docId = `agent-usage.${orgId}.${date}`;

  await writeClient.createIfNotExists({
    _id: docId,
    _type: "agentUsage",
    orgId,
    date,
    count: 0,
  });

  const result = await writeClient
    .patch(docId)
    .setIfMissing({ count: 0 })
    .inc({ count: 1 })
    .commit<{ count: number }>({ returnDocuments: true });

  const count = result.count;
  return { allowed: count <= AGENT_DAILY_MESSAGE_LIMIT, count, limit: AGENT_DAILY_MESSAGE_LIMIT };
}
