/**
 * Defence-in-depth guard for the opt-in `unsafeRawCypher` path.
 *
 * IMPORTANT: This is NOT a sandbox and NOT tenant isolation. A regex cannot
 * make model-written Cypher safe — a determined model can always craft queries
 * that read or mutate the wrong user's data in ways a regex won't catch.
 *
 * The real protection is architectural:
 *   1. By DEFAULT, the memory agent only has fixed, parameterized tools
 *      (upsert_fact, read_user_facts, delete_user_fact) — the model passes
 *      values, never query text.
 *   2. Raw Cypher is behind an explicit opt-in (`unsafeRawCypher: true`).
 *      When enabled, sessions are READ-only and mutation keywords are blocked.
 *   3. In multi-tenant deployments, isolation MUST be enforced at the database
 *      level — a per-user database, or per-user Neo4j roles — never by hoping
 *      a regex catches everything.
 *
 * For the opt-in path, this module:
 *   - Strips line and block comments before any scanning
 *   - Strips string literals before mutation-keyword scanning (so a query cant
 *     hide a MERGE inside a string literal)
 *   - Rejects CREATE, MERGE, SET, DELETE, REMOVE, DROP, CALL, LOAD, FOREACH,
 *     and apoc.* — the session also runs READ-only, so even if a mutation
 *     somehow slips through the regex, Neo4j will refuse it.
 *   - Verifies every :User node pattern is anchored on $userId (not a hardcoded
 *     string ID or a bare :User) — this is best-effort and documented as such.
 */

const MUTATION_KEYWORDS = [
  /\bCREATE\b/i,
  /\bMERGE\b/i,
  /\bSET\b/i,
  /\bDELETE\b/i,
  /\bREMOVE\b/i,
  /\bDROP\b/i,
  /\bCALL\b/i,
  /\bLOAD\b/i,
  /\bFOREACH\b/i,
  /\bapoc\./i,
];

function stripComments(query: string): string {
  let cleaned = query.replace(/\/\*[\s\S]*?\*\//g, " ");
  cleaned = cleaned.replace(/\/\/[^\n]*/g, " ");
  return cleaned;
}

function stripStringLiterals(query: string): string {
  let cleaned = query.replace(/'[^']*'/g, " '' ");
  cleaned = cleaned.replace(/"[^"]*"/g, " \"\" ");
  cleaned = cleaned.replace(/`[^`]*`/g, " `` ");
  return cleaned;
}

/**
 * Best-effort check: every :User node pattern must be anchored on $userId.
 * Catches common cross-tenant read attacks:
 *   MATCH (o:User) RETURN o          — bare :User, no id property
 *   MATCH (v:User {id: 'victim'})    — :User with a hardcoded id
 *
 * This is a heuristic, not a guarantee. Database-level isolation is required
 * for real multi-tenant safety.
 */
function assertUserAnchored(commentStripped: string): void {
  const userNodeRe = /:User\s*([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = userNodeRe.exec(commentStripped)) !== null) {
    if (!/\$userId/i.test(match[1])) {
      throw new Error(
        "unsafeRawCypher: every :User node must be anchored with {id: $userId} — " +
        "hardcoded IDs or bare :User matches are blocked."
      );
    }
  }
}

export function assertSafeRawCypher(query: string): void {
  const noComments = stripComments(query);
  assertUserAnchored(noComments);

  const cleaned = stripStringLiterals(noComments);
  for (const kw of MUTATION_KEYWORDS) {
    if (kw.test(cleaned)) {
      throw new Error(
        "unsafeRawCypher: mutation keyword blocked (query must be read-only). " +
        `Detected: ${kw.toString()}`
      );
    }
  }
}
