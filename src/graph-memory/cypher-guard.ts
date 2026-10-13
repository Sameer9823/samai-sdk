/**
 * Best-effort, defence-in-depth guard for the `execute_cypher_query` tool, which
 * lets a language model run arbitrary Cypher against a per-user Neo4j graph.
 *
 * THIS IS NOT A SANDBOX. A determined or confused model can still craft queries
 * that harm the user's own graph. Its job is to cheaply reject the common,
 * obviously-dangerous classes of query up-front:
 *
 *   - anything not anchored on `$userId` (would read/scatter across users)
 *   - `CALL` / `LOAD CSV` / `apoc.*` (can invoke sub-queries, read arbitrary
 *     files, or run arbitrary JVM code via apoc)
 *   - `DELETE`/`DETACH DELETE` that isn't anchored to the user's own node
 *     (a bare `MATCH (n) DELETE n` wipes a whole label)
 *
 * For ordinary subject-relation-object facts, prefer `upsert_fact`, which issues
 * fixed, reviewable Cypher and never accepts a raw query string from the model.
 */

/** The query is only safe if it is scoped to this user via the $userId parameter. */
const USER_ID_PARAM = /\$userId/i;

/** `CALL` sub-queries / procedures (including `apoc.*`, covered separately too). */
const CALL_RE = /\bCALL\b/i;

/** `LOAD CSV ...` can read arbitrary files reachable from the DB server. */
const LOAD_CSV_RE = /\bLOAD\s+CSV\b/i;

/** `apoc.*` procedures can execute arbitrary code/IO on the server. */
const APOC_RE = /\bapoc\./i;

/** Any `DELETE` or `DETACH DELETE` (case-insensitive). */
const DELETE_RE = /\b(?:DETACH\s+)?DELETE\b/i;

/**
 * True when a DELETE is anchored to the current user's node, i.e. the graph is
 * walked *from* a `:User` node rather than matching a bare `(n)` and wiping it.
 * We look for the literal `:User` label (not just the substring "User", which
 * would also match `$userId`) together with the `$userId` parameter.
 */
function isUserAnchored(query: string): boolean {
  return /:User\b/i.test(query) && USER_ID_PARAM.test(query);
}

/**
 * Validates a model-supplied Cypher query before it runs against the user's
 * graph. Throws an `Error` with a human-readable reason if the query looks
 * dangerous; returns nothing if it's plausibly-scoped. See the module docs
 * above for why this is defence-in-depth, not a sandbox.
 */
export function assertSafeCypher(query: string): void {
  if (!USER_ID_PARAM.test(query)) {
    throw new Error(
      "execute_cypher_query: query must reference $userId so it is scoped to this user's graph node."
    );
  }
  if (CALL_RE.test(query)) {
    throw new Error(
      "execute_cypher_query: CALL/sub-query procedures are blocked; use upsert_fact or a dedicated tool instead."
    );
  }
  if (LOAD_CSV_RE.test(query)) {
    throw new Error("execute_cypher_query: LOAD CSV is blocked — it can read arbitrary files.");
  }
  if (APOC_RE.test(query)) {
    throw new Error("execute_cypher_query: apoc.* procedures are blocked.");
  }
  if (DELETE_RE.test(query) && !isUserAnchored(query)) {
    throw new Error(
      "execute_cypher_query: unanchored DELETE/DETACH DELETE is blocked. Anchor deletes on the user node, e.g. MATCH (u:User {id: $userId})-[...]->(n) DELETE n."
    );
  }
}
