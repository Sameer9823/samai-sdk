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
 *   - Walks the query once in a single-pass tokenizer that tracks string,
 *     comment, and backtick-identifier state — a `//` inside a string is NOT
 *     mistaken for a line comment (the old two-pass regex approach had this bug)
 *   - Produces a code-only string with all string/comment content neutralised
 *   - Requires `$userId` to appear in the code-only output
 *   - Rejects CREATE, MERGE, SET, DELETE, REMOVE, DROP, CALL, LOAD, FOREACH,
 *     and apoc.* — the session also runs READ-only, so this is defence-in-depth
 *   - Verifies every :User node pattern is anchored with {id: $userId} and
 *     requires at least one such anchor
 *
 * READ access mode on the session is the real backstop; this guard is best-effort.
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

type LexState = "code" | "single" | "double" | "backtick" | "line" | "block";

/**
 * Single-pass tokenizer: walks the query character by character, tracking
 * whether we're inside a single-quoted string, double-quoted string,
 * backtick-quoted identifier, line comment, or block comment.
 * String/comment content is replaced with spaces (newlines preserved in
 * line comments), so the resulting code-only string has:
 *   - No string contents (can't hide DELETE in a string)
 *   - No comment contents (can't hide DELETE after a // comment)
 *   - No `//` inside a string mistaken for a comment, and vice versa
 */
function toCodeOnly(query: string): string {
  let result = "";
  let i = 0;
  const n = query.length;
  let state: LexState = "code";

  while (i < n) {
    const ch = query[i];
    const next = query[i + 1] ?? "";

    switch (state) {
      case "code":
        if (ch === "'") {
          state = "single";
          result += " ";
          i += 1;
        } else if (ch === '"') {
          state = "double";
          result += " ";
          i += 1;
        } else if (ch === "`") {
          state = "backtick";
          result += " ";
          i += 1;
        } else if (ch === "/" && next === "/") {
          state = "line";
          result += " ";
          i += 2;
        } else if (ch === "/" && next === "*") {
          state = "block";
          result += " ";
          i += 2;
        } else {
          result += ch;
          i += 1;
        }
        break;

      case "single":
        if (ch === "'") {
          state = "code";
          result += " ";
          i += 1;
        } else {
          result += " ";
          i += 1;
        }
        break;

      case "double":
        if (ch === '"' && query[i - 1] !== "\\") {
          state = "code";
          result += " ";
          i += 1;
        } else {
          result += " ";
          i += 1;
        }
        break;

      case "backtick":
        if (ch === "`") {
          state = "code";
          result += " ";
          i += 1;
        } else {
          result += " ";
          i += 1;
        }
        break;

      case "line":
        if (ch === "\n") {
          state = "code";
          result += "\n";
          i += 1;
        } else {
          result += " ";
          i += 1;
        }
        break;

      case "block":
        if (ch === "*" && next === "/") {
          state = "code";
          result += " ";
          i += 2;
        } else {
          result += " ";
          i += 1;
        }
        break;
    }
  }

  if (state === "single" || state === "double" || state === "backtick") {
    throw new Error("unsafeRawCypher: unterminated string literal");
  }
  // Line and block comments that reach EOF are implicitly terminated — no error.

  return result;
}

/**
 * Best-effort check: every :User node pattern must be anchored with {id: $userId},
 * and at least one such anchor must exist. Catches cross-tenant read attacks:
 *   MATCH (o:User) RETURN o                 — bare :User, no id property
 *   MATCH (v:User {id: 'victim'})           — :User with a hardcoded id
 *   MATCH (o) WHERE o:User RETURN o         — :User in WHERE, not anchored
 *
 * This is a heuristic. Database-level isolation is required for real safety.
 */
function assertUserAnchored(codeOnly: string): void {
  const userRe = /:User/g;
  let found = false;
  let m: RegExpExecArray | null;

  while ((m = userRe.exec(codeOnly)) !== null) {
    found = true;
    const after = codeOnly.slice(m.index + m[0].length);
    const braceMatch = /^\s*(\{[^}]*\})/.exec(after);

    if (!braceMatch) {
      throw new Error(
        "unsafeRawCypher: bare :User label without {id: $userId} — " +
        "every :User pattern must be anchored on the bound user id."
      );
    }

    const inside = braceMatch[1];
    if (!/\$userId/.test(inside)) {
      throw new Error(
        "unsafeRawCypher: :User node must be anchored with {id: $userId} — " +
        "hardcoded IDs are blocked."
      );
    }
  }

  if (!found) {
    throw new Error(
      "unsafeRawCypher: query must anchor on (u:User {id: $userId}) — " +
      "no :User pattern found."
    );
  }
}

/**
 * Best-effort guard for raw Cypher queries.
 *
 * Runs a single-pass tokenizer to produce a code-only string (strings and
 * comments neutralised), then checks: $userId must appear, no mutation
 * keywords, and every :User pattern must be anchored with {id: $userId}.
 *
 * READ access mode on the session is the real backstop — this is defence-in-depth.
 */
export function assertSafeRawCypher(query: string): void {
  const codeOnly = toCodeOnly(query);

  if (!/\$userId/.test(codeOnly)) {
    throw new Error(
      "unsafeRawCypher: query must reference $userId"
    );
  }

  for (const kw of MUTATION_KEYWORDS) {
    if (kw.test(codeOnly)) {
      throw new Error(
        "unsafeRawCypher: mutation keyword blocked (query must be read-only). " +
        `Detected: ${kw.source}`
      );
    }
  }

  assertUserAnchored(codeOnly);
}
