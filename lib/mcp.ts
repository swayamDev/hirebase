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
 */
const initialContextCache = new Map<string, { value: string; at: number }>();
const INITIAL_CONTEXT_TTL_MS = 10 * 60 * 1000;

export async function initialContextFor(orgId: string): Promise<string> {
  const cached = initialContextCache.get(orgId);
  if (cached && Date.now() - cached.at < INITIAL_CONTEXT_TTL_MS) {
    return cached.value;
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
  initialContextCache.set(orgId, { value, at: Date.now() });
  return value;
}
