import "server-only";
import { assertValidOrgId } from "./tenant";

const AGENT_CONTEXT_SLUG = "hirebase";
const DOC_TYPES = [
  "company",
  "job",
  "candidate",
  "application",
  "interview",
] as const;

/**
 * The tenant filter LIVES IN THIS URL. Build it per request and never hoist
 * the MCP client (or anything derived from this URL) to module scope - the
 * first org to warm an instance would pin its filter for every other org.
 *
 * The orgId is interpolated as a quoted GROQ literal because query-string
 * filters cannot bind $params; assertValidOrgId keeps injection out.
 */
export function orgScopedMcpUrl(orgId: string): string {
  assertValidOrgId(orgId);
  const base = process.env.SANITY_CONTEXT_MCP_BASE_URL;
  if (!base) throw new Error("SANITY_CONTEXT_MCP_BASE_URL is not set");
  const filter = `_type in [${DOC_TYPES.map((t) => `"${t}"`).join(", ")}] && orgId == "${orgId}" && !(_id in path("drafts.**"))`;
  const url = `${base}/${AGENT_CONTEXT_SLUG}?groqFilter=${encodeURIComponent(filter)}`;
  if (!url.includes("groqFilter=")) {
    throw new Error("MCP URL is missing the tenant filter");
  }
  return url;
}

/**
 * /initial-context gives the agent the schema (plus document counts) so the
 * first message needs no tool call. Counts are computed under the org filter,
 * so the cache is keyed BY ORG - an unfiltered or shared fetch would leak
 * dataset-wide numbers into every tenant's prompt.
 *
 * Bounded LRU: without a cap, every distinct org that ever calls the agent
 * would leave a permanent entry for the life of the process - an unbounded
 * memory leak on a long-running instance. Map preserves insertion order, so
 * deleting-then-re-setting a key moves it to the "most recently used" end;
 * when the cache is full we evict from the other end (`.next().value`, the
 * oldest key).
 */
const initialContextCache = new Map<string, { value: string; at: number }>();
const INITIAL_CONTEXT_TTL_MS = 10 * 60 * 1000;
const INITIAL_CONTEXT_MAX_ENTRIES = 500;

export async function initialContextFor(orgId: string): Promise<string> {
  const cached = initialContextCache.get(orgId);
  if (cached) {
    if (Date.now() - cached.at < INITIAL_CONTEXT_TTL_MS) {
      // Refresh recency without refreshing the value.
      initialContextCache.delete(orgId);
      initialContextCache.set(orgId, cached);
      return cached.value;
    }
    initialContextCache.delete(orgId);
  }
  const [path, query] = orgScopedMcpUrl(orgId).split("?");
  const res = await fetch(`${path}/initial-context?${query}`, {
    headers: {
      Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
    },
  });
  if (!res.ok) {
    throw new Error(`initial-context fetch failed: ${res.status}`);
  }
  const value = await res.text();
  if (initialContextCache.size >= INITIAL_CONTEXT_MAX_ENTRIES) {
    const oldestKey = initialContextCache.keys().next().value;
    if (oldestKey !== undefined) initialContextCache.delete(oldestKey);
  }
  initialContextCache.set(orgId, { value, at: Date.now() });
  return value;
}
