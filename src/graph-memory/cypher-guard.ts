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
 * READ access mode on the session is the real backstop; this guard is best-effort
 * and cannot replace database-level tenant isolation.
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
 * Splits a string by a top-level delimiter, ignoring delimiters inside (), [], {}.
 */
function splitTopLevel(s: string, delim: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (depth === 0 && s.slice(i, i + delim.length) === delim) {
      result.push(current);
      current = "";
      i += delim.length - 1;
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}

/**
 * Extracts the first (...) group from a pattern string.
 */
function extractFirstNode(pattern: string): string | null {
  const idx = pattern.indexOf("(");
  if (idx === -1) return null;
  let depth = 0;
  let start = -1;
  for (let i = idx; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) return pattern.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Checks if a node pattern is an anchored user node: `(var:User {id: $userId})`.
 */
function isAnchoredUserNode(nodeText: string): boolean {
  return /:User/i.test(nodeText) && /id\s*:\s*\$userId/.test(nodeText);
}

/**
 * Extracts the leading variable name from a node pattern like `(u:User {props})` or `(u)`.
 */
function extractVarName(nodeText: string): string | null {
  const inner = nodeText.slice(1, -1).trim();
  if (!inner) return null;
  const m = /^([a-zA-Z_][a-zA-Z0-9_]*)/.exec(inner);
  return m ? m[1] : null;
}

/**
 * Best-effort check: every MATCH / OPTIONAL MATCH pattern must start from an
 * anchored user node `(u:User {id: $userId})` or a variable that was bound
 * to such a node in a prior clause and carried through any WITH.
 *
 * Rejects cross-tenant reads like:
 *   MATCH (u:User {id:$userId}) MATCH (o) RETURN o
 *   MATCH (u:User {id:$userId}), (o) RETURN o
 *   OPTIONAL MATCH (o) RETURN o
 *   MATCH (u:User {id:$userId}) WITH u MATCH (o) RETURN o
 *
 * Accepts path expansion from the anchor:
 *   MATCH (u:User {id:$userId})-[r]->(o) RETURN o        — single anchored pattern
 *   ... OPTIONAL MATCH (u)-[r]->(o) RETURN o             — extends from bound var
 *
 * This is a heuristic. Database-level isolation is required for real safety.
 */
function assertAllMatchesAnchored(codeOnly: string): void {
  const anchoredVars = new Set<string>();
  const matchRe = /\b(?:OPTIONAL\s+)?MATCH\s+\(/gi;
  let cursor = 0;
  let matchResult: RegExpExecArray | null;

  while ((matchResult = matchRe.exec(codeOnly)) !== null) {
    // Text between the previous MATCH and this one — may contain WITH.
    const beforeMatch = codeOnly.slice(cursor, matchResult.index);
    cursor = matchRe.lastIndex;

    // Parse WITH clauses to track which anchored vars survive.
    const withRe = /\bWITH\s+(.+?)(?=\b(?:MATCH|OPTIONAL\s+MATCH|RETURN|ORDER|LIMIT|WHERE|UNLOAD|INTO|FROM|UNION)\b|$)/gi;
    let withResult: RegExpExecArray | null;
    while ((withResult = withRe.exec(beforeMatch)) !== null) {
      const withVars = [...withResult[1].matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)].map((m) => m[0]);
      for (const v of [...anchoredVars]) {
        if (!withVars.includes(v)) anchoredVars.delete(v);
      }
    }

    // Extract the pattern text: from the opening ( to the next clause keyword.
    const patternText = codeOnly.slice(matchRe.lastIndex - 1);
    const endMatch = /\b(?:WHERE|WITH|RETURN|ORDER|LIMIT|UNLOAD|INTO|FROM|UNION|OPTIONAL\s+MATCH|MATCH)\b/gi.exec(patternText);
    const patternsStr = endMatch ? patternText.slice(0, endMatch.index) : patternText;

    // Split by top-level commas into individual patterns.
    const patterns = splitTopLevel(patternsStr, ",");

    for (const pattern of patterns) {
      const firstNode = extractFirstNode(pattern.trim());
      if (!firstNode) continue;

      if (isAnchoredUserNode(firstNode)) {
        const varName = extractVarName(firstNode);
        if (varName) anchoredVars.add(varName);
      } else {
        const varName = extractVarName(firstNode);
        if (varName && anchoredVars.has(varName)) {
          // OK — starts from a bound anchored variable.
        } else {
          throw new Error(
            "unsafeRawCypher: every MATCH pattern must start from an anchored " +
            "(u:User {id: $userId}) node or a variable bound to one."
          );
        }
      }
    }
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
  assertAllMatchesAnchored(codeOnly);
}
