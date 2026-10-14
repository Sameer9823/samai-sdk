import {
  createClient,
  createMockProvider,
  createSession,
  InMemorySessionStore,
  enableGraphMemory,
  assertSafeRawCypher,
  assertSafeRelation,
  ELEMENT_ID_RE,
  createRenameRelationshipTool,
  createMergeDuplicateNodesTool,
} from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✅ ${label}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failures++;
  }
}

// ── Param-completeness checker for the fake driver ──
// Extracts all $paramName tokens from a Cypher query (ignoring those inside
// string literals and // comments) and throws if any are absent from the params.
function checkParamCompleteness(query: string, params: Record<string, unknown>): void {
  const missing: string[] = [];
  let i = 0;
  while (i < query.length) {
    const ch = query[i];
    // Skip single-quoted string literals
    if (ch === "'") {
      i++;
      while (i < query.length && query[i] !== "'") {
        if (query[i] === "\\" && i + 1 < query.length) { i += 2; continue; }
        i++;
      }
      i++;
      continue;
    }
    // Skip double-quoted string literals
    if (ch === '"') {
      i++;
      while (i < query.length && query[i] !== '"') {
        if (query[i] === "\\" && i + 1 < query.length) { i += 2; continue; }
        i++;
      }
      i++;
      continue;
    }
    // Skip // comments
    if (ch === "/" && query[i + 1] === "/") {
      i += 2;
      while (i < query.length && query[i] !== "\n") i++;
      continue;
    }
    // Detect $paramName
    if (ch === "$") {
      i++;
      const start = i;
      while (i < query.length && /[A-Za-z0-9_]/.test(query[i])) i++;
      if (i > start) {
        const name = query.slice(start, i);
        if (!(name in params)) missing.push(name);
      }
      continue;
    }
    i++;
  }
  if (missing.length > 0) {
    throw new MissingCypherParameterError(missing);
  }
}
class MissingCypherParameterError extends Error {
  constructor(public readonly missingParams: string[]) {
    super("Missing Cypher parameter(s): " + missingParams.join(", "));
    this.name = "MissingCypherParameterError";
  }
}

// ── Fake driver that records queries, params, and session options ──
const queriesRun: { query: string; params: Record<string, unknown> }[] = [];
const sessionCalls: { options?: Record<string, unknown> }[] = [];

class FakeSession {
  // Configurable result rows — defaults to empty (0 rows). Tests can set
  // `FakeSession.overrideRows` before calling a tool to simulate DB output.
  static overrideRows: Record<string, unknown>[] = [];
  async run(query: string, params: Record<string, unknown>) {
    queriesRun.push({ query, params });
    checkParamCompleteness(query, params);
    return { records: FakeSession.overrideRows.map((r) => new FakeRecord(r)) };
  }
  async close() {}
}
class FakeRecord {
  constructor(private data: Record<string, unknown>) {}
  get(key: string) { return this.data[key]; }
  toObject() { return { ...this.data }; }
}
class FakeDriver {
  int: (n: number) => unknown;
  constructor(intImpl?: (n: number) => unknown) {
    this.int = intImpl ?? ((n: number) => n);
  }
  session(options?: Record<string, unknown>) {
    sessionCalls.push({ options });
    return new FakeSession();
  }
  async close() {}
}

function buildMemory(driver: FakeDriver, unsafeRawCypher = false, userId = "user-123") {
  const client = createClient({ provider: createMockProvider({ responses: [] }) });
  const session = createSession(userId, new InMemorySessionStore());
  return enableGraphMemory({
    client,
    driver: driver as any,
    userId,
    session,
    unsafeRawCypher,
  }).build();
}

// ── Step 3: Param-completeness check itself throws when a param is missing ──
function testParamCompletenessCheck() {
  console.log("=== TEST: fake driver throws on missing Cypher parameter ===");

  // $userId missing from params → should throw
  let threw = false;
  let errMsg = "";
  try {
    checkParamCompleteness("MATCH (u:User {id: $userId}) RETURN u", {});
  } catch (err) {
    threw = true;
    errMsg = (err as Error).message;
  }
  check("missing $userId param is rejected", threw);
  check("error message lists the missing param", errMsg.includes("Missing Cypher parameter(s): $userId") || errMsg.includes("userId"));

  // $param inside a string literal is NOT treated as a parameter
  threw = false;
  errMsg = "";
  try {
    checkParamCompleteness("MATCH (n) RETURN 'has $1 in it', $realParam", { realParam: 1 });
  } catch (err) {
    threw = true;
    errMsg = (err as Error).message;
  }
  check("string-literal $ is ignored, real param present", !threw, errMsg);

  // $param inside a // comment is NOT treated as a parameter
  threw = false;
  errMsg = "";
  try {
    checkParamCompleteness("MATCH (n) // $commentedParam RETURN $real", { real: 1 });
  } catch (err) {
    threw = true;
    errMsg = (err as Error).message;
  }
  check("comment $ is ignored, real param present", !threw, errMsg);

  // All params present → no throw
  threw = false;
  try {
    checkParamCompleteness("MATCH (u:User {id: $userId})-[r:LIKES]->(o) WHERE elementId(r)=$relId RETURN o.name", { userId: "x", relId: "y" });
  } catch {
    threw = true;
  }
  check("all params present → no throw", !threw);
}

// ── Phase 1.1: Cypher injection in read_user_facts ──
async function testReadUserFactsInjection() {
  console.log("=== TEST: read_user_facts rejects relationType injection ===");
  queriesRun.length = 0;
  const driver = new FakeDriver();
  const mem = buildMemory(driver, false);

  const read = mem.tools.find((t) => t.name === "read_user_facts")!;

  const injectionPayloads = [
    "X]->(o) WITH u MATCH (v:User) DETACH DELETE v //",
    "LIKES) DETACH DELETE n //",
  ];

  for (const payload of injectionPayloads) {
    let threw = false;
    try {
      await read.execute({ relationType: payload });
    } catch {
      threw = true;
    }
    check(`injection "${payload.slice(0, 30)}..." is rejected`, threw);
  }

  check("fake driver received NO queries from rejected calls", queriesRun.length === 0);

  // Valid relation type still works.
  const beforeValid = queriesRun.length;
  await read.execute({ relationType: "LIKES" });
  check("valid LIKES reaches the driver", queriesRun.length === beforeValid + 1);
  check("query contains -[r:LIKES]->", queriesRun[beforeValid].query.includes("-[r:LIKES]->"));

  await mem.stop();
}

// ── Phase 1.2: Raw Cypher READ-only + tokenizer ──
async function testRawCypherGuard() {
  console.log("=== TEST: assertSafeRawCypher single-pass tokenizer ===");

  // Must reject:
  const mustReject = [
    ["bare MATCH no user", "MATCH (o) RETURN o"],
    ["bare :User without id", "MATCH (o) WHERE o:User RETURN o"],
    ["string-literal // hides DELETE", "MATCH (n) WITH n, 'a//' AS s\nDETACH DELETE n\nWITH 1 AS z RETURN 'b'"],
    ["DELETE after comment strip", "MATCH (n) DETACH DELETE n // :User $userId"],
    ["cross-user read via extra MATCH", "MATCH (u:User {id:$userId}) MATCH (o:User) RETURN o"],
    ["hardcoded victim id", "MATCH (v:User {id:'victim'}) RETURN v, $userId"],
    ["second MATCH with unanchored node", "MATCH (u:User {id:$userId}) MATCH (o) RETURN o"],
    ["second MATCH with labels() bypass", "MATCH (u:User {id:$userId}) MATCH (o) WHERE 'User' IN labels(o) RETURN o"],
    ["comma-separated unanchored pattern", "MATCH (u:User {id:$userId}), (o) RETURN o"],
    ["OPTIONAL MATCH unanchored", "OPTIONAL MATCH (o) RETURN o"],
    ["WITH u then MATCH (o)", "MATCH (u:User {id:$userId}) WITH u MATCH (o) RETURN o"],
  ];

  for (const [label, query] of mustReject) {
    let threw = false;
    let msg = "";
    try {
      assertSafeRawCypher(query);
    } catch (err) {
      threw = true;
      msg = (err as Error).message.slice(0, 60);
    }
    check(`rejected: ${label}`, threw, msg);
  }

  // Must accept:
  let accepted = true;
  let acceptErr = "";
  try {
    assertSafeRawCypher("MATCH (u:User {id:$userId})-[r]->(o) RETURN type(r), o.name");
  } catch (err) {
    accepted = false;
    acceptErr = (err as Error).message;
  }
  check("accepted: anchored READ query", accepted, acceptErr);

  // Accept: OPTIONAL MATCH that extends from the anchored var.
  accepted = true;
  try {
    assertSafeRawCypher("MATCH (u:User {id:$userId}) OPTIONAL MATCH (u)-[r]->(o) RETURN o");
  } catch (err) {
    accepted = false;
    acceptErr = (err as Error).message;
  }
  check("accepted: OPTIONAL MATCH from anchored var", accepted, acceptErr);

  // Accept: path expansion from anchored user node.
  accepted = true;
  try {
    assertSafeRawCypher("MATCH (u:User {id:$userId})-[:LIKES]->(o)<-[:LIKES]-(other) RETURN o.name");
  } catch (err) {
    accepted = false;
    acceptErr = (err as Error).message;
  }
  check("accepted: multi-hop path from anchored node", accepted, acceptErr);

  // Verify the raw tool session uses READ access mode.
  console.log("=== TEST: execute_cypher_query opens READ-only session ===");
  queriesRun.length = 0;
  sessionCalls.length = 0;
  const driver = new FakeDriver();
  const rawMem = buildMemory(driver, true);
  const rawTool = rawMem.rawCypherTool!;

  await rawTool.execute({ query: "MATCH (u:User {id:$userId})-[:LIKES]->(t) RETURN t", params: {} });
  check("session called with READ mode", sessionCalls.some((c) => c.options?.defaultAccessMode === "READ"));
  check("query reached the driver", queriesRun.length === 1);
  check("userId bound into params", queriesRun[0].params.userId === "user-123");

  await rawMem.stop();
}

// ── Phase 1.3: merge_duplicate_nodes owner check ──
async function testMergeDuplicateNodesOwnerCheck() {
  console.log("=== TEST: merge_duplicate_nodes Cypher includes ownerId + cross-user guard ===");
  queriesRun.length = 0;
  const driver = new FakeDriver();
  const driverPromise = Promise.resolve(driver as any);

  const mergeTool = createMergeDuplicateNodesTool(driverPromise, "user-123");
  await mergeTool.execute({ label: "Topic", name: "hiking" });

  check("exactly one query reached the driver", queriesRun.length === 1);
  check("Cypher includes ownerId: $userId in node match", queriesRun[0].query.includes("ownerId: $userId"));
  check("Cypher includes cross-user guard (NOT EXISTS)", queriesRun[0].query.includes("NOT EXISTS"));
  check("Cypher anchors on (u:User {id: $userId})", queriesRun[0].query.includes("(u:User {id: $userId})"));
  check("Cypher uses DETACH DELETE on the owned node", queriesRun[0].query.includes("DETACH DELETE"));
}

// ── Phase 2.1: Element ID format ──
async function testElementIdRegex() {
  console.log("=== TEST: ELEMENT_ID_RE accepts Neo4j 5 format ===");
  check("real Neo4j 5 element id passes", ELEMENT_ID_RE.test("5:0f5a7c1e-1111-4222-8333-444455556666:12"));
  check("legacy numeric id passes", ELEMENT_ID_RE.test("123"));
  check("old internal _abc form rejected", !ELEMENT_ID_RE.test("_abc"));
  check("SQL injection rejected", !ELEMENT_ID_RE.test("1;DROP"));
  check("empty string rejected", !ELEMENT_ID_RE.test(""));
  check("empty string rejected (delete_user_fact)", !ELEMENT_ID_RE.test(""));

  // Also test delete_user_fact uses ELEMENT_ID_RE
  console.log("=== TEST: delete_user_fact uses ELEMENT_ID_RE ===");
  const driver = new FakeDriver();
  const mem = buildMemory(driver, false);
  const del = mem.tools.find((t) => t.name === "delete_user_fact")!;

  let threwOldFormat = false;
  try { await del.execute({ relElementId: "_abc" }); } catch { threwOldFormat = true; }
  check("_abc rejected by delete_user_fact", threwOldFormat);

  let threwNewFormat = false;
  try { await del.execute({ relElementId: "5:0f5a7c1e-1111-4222-8333-444455556666:12" }); } catch { threwNewFormat = true; }
  check("Neo4j 5 format accepted by delete_user_fact", !threwNewFormat);

  await mem.stop();
}

// ── Phase 2.2: read_user_facts returns elementId(r) ──
async function testReadUserFactsReturnsElementId() {
  console.log("=== TEST: read_user_facts query includes elementId(r) ===");
  queriesRun.length = 0;
  const driver = new FakeDriver();
  const mem = buildMemory(driver, false);
  const read = mem.tools.find((t) => t.name === "read_user_facts")!;

  await read.execute({ relationType: "LIKES" });
  check("RETURN clause includes elementId(r) AS relElementId", queriesRun[0].query.includes("elementId(r) AS relElementId"));

  await mem.stop();
}

// ── Phase 1: LIMIT/SKIP use toInteger($param), no driver.int dependency ──
async function testLimitToInteger() {
  console.log("=== TEST: LIMIT uses toInteger($limit), works without driver.int ===");
  queriesRun.length = 0;

  // Driver with NO `int` method — simulates a user-supplied neo4j-driver instance.
  class DriverWithoutInt {
    session() { return new FakeSession(); }
    async close() {}
  }

  const mem = buildMemory(new DriverWithoutInt() as any, false);
  const read = mem.tools.find((t) => t.name === "read_user_facts")!;

  await read.execute({ relationType: "LIKES" });
  // Only one query should have run (read_user_facts).
  const q = queriesRun.find((r) => r.query.includes("RETURN"));
  check("exactly one query ran", queriesRun.length === 1);
  check("Cypher uses toInteger($limit)", q!.query.includes("LIMIT toInteger($limit)"));
  check("Cypher does NOT use bare LIMIT $limit", !q!.query.includes("LIMIT $limit"));
  check("limit param is a plain number", typeof q!.params.limit === "number");
  check("limit param has no __isInt wrapper", !(q!.params.limit as any)?.__isInt);

  await mem.stop();
}

// ── Phase 1: grep-style assertion — no bare LIMIT $ or SKIP $ in src/graph-memory/ ──
async function testNoBareLimitSkip() {
  console.log("=== TEST: no bare LIMIT $ or SKIP $ in graph-memory source ===");
  const fs = await import("node:fs");
  const dir = "src/graph-memory";
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts"));
  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(`${dir}/${file}`, "utf8");
    const bareLimit = /LIMIT \$/g.exec(content);
    const bareSkip = /SKIP \$/g.exec(content);
    if (bareLimit) violations.push(`${file}: bare 'LIMIT $'`);
    if (bareSkip) violations.push(`${file}: bare 'SKIP $'`);
  }
  check("no bare LIMIT $limit or SKIP $skip in src/graph-memory/", violations.length === 0, violations.length ? violations.join(", ") : "");
}

// ── Phase 2.4: rename_relationship Cypher ──
async function testRenameRelationshipCypher() {
  console.log("=== TEST: rename_relationship uses elementId(old), no apoc ===");
  queriesRun.length = 0;
  const driver = new FakeDriver();
  const driverPromise = Promise.resolve(driver as any);

  const renameTool = createRenameRelationshipTool(driverPromise, "user-123");
  await renameTool.execute({
    relElementId: "42:0f5a7c1e-1111-4222-8333-444455556666:12",
    newType: "LIKES",
  });

  check("exactly one query reached the driver", queriesRun.length === 1);
  check("Cypher contains elementId(old)", queriesRun[0].query.includes("elementId(old)"));
  check("Cypher does NOT contain apoc", !queriesRun[0].query.includes("apoc"));
  check("Cypher does NOT contain [old:X] placeholder", !/\[old:X\]/.test(queriesRun[0].query));
  check("newType is interpolated after validation", queriesRun[0].query.includes("new:LIKES"));
  check("params include newType === 'LIKES'", queriesRun[0].params.newType === "LIKES");
  check("params include relId", queriesRun[0].params.relId === "42:0f5a7c1e-1111-4222-8333-444455556666:12");
  check("params include userId", queriesRun[0].params.userId === "user-123");

  // Invalid relElementId is rejected before touching the driver.
  queriesRun.length = 0;
  let threw = false;
  try { await renameTool.execute({ relElementId: "not-a-valid-id", newType: "LIKES" }); } catch { threw = true; }
  check("invalid relElementId rejected", threw);
  check("no query for invalid id", queriesRun.length === 0);

  // When the DB returns count(new)=0 (wrong ID, already renamed, etc.),
  // the tool must report { renamed: false }.
  queriesRun.length = 0;
  FakeSession.overrideRows = [{ renamed: 0 }];
  const resultZero = await renameTool.execute({
    relElementId: "42:0f5a7c1e-1111-4222-8333-444455556666:12",
    newType: "LIKES",
  });
  check("returns { renamed: false } when DB count is 0", resultZero.renamed === false);
  check("still passed newType to the query", queriesRun[0].params.newType === "LIKES");
  FakeSession.overrideRows = [];
}

async function main() {
  await testReadUserFactsInjection();      // 1.1
  await testRawCypherGuard();               // 1.2
  await testMergeDuplicateNodesOwnerCheck(); // 1.3
  await testElementIdRegex();                // 2.1
  await testReadUserFactsReturnsElementId(); // 2.2
  await testLimitToInteger();                 // 1 (limit)
  await testNoBareLimitSkip();                // 1 (grep)
  await testRenameRelationshipCypher();       // 2.4
  testParamCompletenessCheck();                 // 3 — param-completeness guard

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 graph-memory security + Neo4j 5 tests passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
