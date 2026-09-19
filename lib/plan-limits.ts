import "server-only";
import { readClient, writeClient } from "./sanity/client";

export const FREE_JOB_LIMIT = 1;
export const FREE_CANDIDATE_LIMIT = 25;

/** Counts ALL jobs (open or closed) - closing a job does not free the slot. */
export function countJobs(orgId: string): Promise<number> {
  return readClient.fetch<number>(
    `count(*[_type == "job" && orgId == $orgId])`,
    { orgId },
  );
}

/** Counts non-archived candidates. */
export function countCandidates(orgId: string): Promise<number> {
  return readClient.fetch<number>(
    `count(*[_type == "candidate" && orgId == $orgId && archived != true])`,
    { orgId },
  );
}

/**
 * A count-then-create check has a race: two concurrent requests can both
 * read a count under the limit before either write lands, letting a
 * free-plan org exceed its cap. There's no built-in "insert only if count
 * < N" primitive in Sanity, so this closes the race after the fact instead:
 * once the new document exists, re-rank all of the org's documents of this
 * type by (createdAt, _id) and keep only the first `limit`. If the
 * newly-created document didn't make the cut, delete it and report the
 * limit as reached. Whichever concurrent writer landed first keeps its
 * document; every later one is rolled back - so the cap holds regardless of
 * request ordering, at the cost of an extra read (and occasional delete) on
 * every create.
 */
export async function enforceCreateLimit(opts: {
  type: "job" | "candidate";
  orgId: string;
  limit: number;
  newId: string;
  /** Extra GROQ filter clause, e.g. `archived != true`. */
  extraFilter?: string;
}): Promise<boolean> {
  const { type, orgId, limit, newId, extraFilter } = opts;
  const filter = `_type == $type && orgId == $orgId${extraFilter ? ` && ${extraFilter}` : ""}`;
  const survivors = await readClient.fetch<string[]>(
    `*[${filter}] | order(_createdAt asc, _id asc)[0...${limit}]._id`,
    { type, orgId },
  );
  if (survivors.includes(newId)) return true;
  await writeClient.delete(newId);
  return false;
}
