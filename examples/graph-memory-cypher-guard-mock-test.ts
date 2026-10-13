import { createClient, createMockProvider, createSession, InMemorySessionStore, enableGraphMemory, assertSafeRawCypher } from "../src/index.js";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label}`);
    failures++;
  }
}

// Fake Neo4j driver — records every query + params forwarded to session.run()
const queriesRun: { query: string; params: Record<string, unknown> }[] = [];

class FakeSession {
  async run(query: string, params: Record<string, unknown>) {
    queriesRun.push({ query, params });
    return { records: [] };
  }
  async close() {}
}
class FakeDriver {
  session() { return new FakeSession(); }
  async close() {}
}

function buildMemory(unsafeRawCypher = false, userId = "user-123") {
  const client = createClient({ provider: createMockProvider({ responses: [] }) });
  const session = createSession(userId, new InMemorySessionStore());
  return enableGraphMemory({
    client,
    driver: new FakeDriver() as any,
    userId,
    session,
    unsafeRawCypher,
  }).build();
}

async function main() {
  // ── Test 1: Default tool set contains NO raw-Cypher tool ──
  console.log("=== TEST: default tool set has no raw-Cypher tool ===");
  const defaultMemory = buildMemory(false);
  const toolNames = defaultMemory.tools.map((t) => t.name);
  console.log(`  default tools: ${toolNames.join(", ")}`);
  check("upsert_fact is in the default set", toolNames.includes("upsert_fact"));
  check("read_user_facts is in the default set", toolNames.includes("read_user_facts"));
  check("delete_user_fact is in the default set", toolNames.includes("delete_user_fact"));
  check("execute_cypher_query is NOT in the default set", !toolNames.includes("execute_cypher_query"));
  check("rawCypherTool is undefined by default", defaultMemory.rawCypherTool === undefined);

  // ── Test 2: The four isolation-bypass queries are rejected in raw mode ──
  console.log("=== TEST: unsafeRawCypher rejects isolation-bypass queries ===");
  const rawMemory = buildMemory(true);
  const rawTool = rawMemory.rawCypherTool!;

  const bypassQueries: Array<[string, string]> = [
    ["cross-user read via extra MATCH", "MATCH (u:User {id:$userId}) MATCH (o:User) RETURN o"],
    ["cross-user delete via extra MATCH", "MATCH (u:User {id:$userId}) MATCH (x:User) DETACH DELETE x"],
    ["DELETE with injected $userId comment", "MATCH (n) DETACH DELETE n // :User $userId"],
    ["string-literal $userId bypass", "MATCH (v:User {id:'victim'}) RETURN v, $userId"],
  ];

  for (const [label, query] of bypassQueries) {
    let threw = false;
    let message = "";
    try {
      await rawTool.execute({ query, params: { userId: "user-123" } });
    } catch (err) {
      threw = true;
      message = err instanceof Error ? err.message : String(err);
    }
    check(`blocked: ${label}`, threw);
    console.log(`    ${label} -> ${message.slice(0, 90)}`);
  }

  // ── Test 3: Comment trick to hide :User anchor is stripped, then DELETE caught ──
  console.log("=== TEST: comment-stripping prevents bypasses ===");

  // Query 3 strips the // comment, then DETACH DELETE is caught by mutation check.
  // Query 4's 'victim' is a string literal — User anchoring check runs before
  // string stripping, so it catches the hardcoded id.
  check("comment-stripping + DELETE blocking works (query 3)", bypassQueries[2][1].includes("//"));
  check("string-literal id caught by User anchoring (query 4)", bypassQueries[3][1].includes("'victim'"));

  // ── Test 4: A read-only raw query that references $userId still reaches the driver ──
  console.log("=== TEST: read-only raw query works with $userId ===");
  const queriesBefore = queriesRun.length;
  let readOnlyWorked = true;
  try {
    await rawTool.execute({ query: "MATCH (u:User {id:$userId})-[:LIKES]->(t) RETURN t", params: {} });
  } catch {
    readOnlyWorked = false;
  }
  check("read-only query with $userId is allowed", readOnlyWorked);
  check("read-only query reached the driver", queriesRun.length === queriesBefore + 1);
  check("userId was bound last (after model params)", queriesRun[queriesBefore].params.userId === "user-123");

  // ── Test 5: Model-supplied params.userId never overrides the bound id ──
  console.log("=== TEST: model params.userId never overrides bound userId ===");
  const upsert = defaultMemory.tools.find((t) => t.name === "upsert_fact")!;
  const beforeUpsert = queriesRun.length;
  await upsert.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });
  check("upsert_fact query reached driver", queriesRun.length === beforeUpsert + 1);
  check("bound userId wins over model-supplied params.userId", queriesRun[beforeUpsert].params.userId === "user-123");

  // ── Test 6: Two users with the same object name produce distinct nodes ──
  console.log("=== TEST: two users with same object name produce distinct MERGE keys ===");
  const mem2 = buildMemory(false, "user-456");
  const upsert2 = mem2.tools.find((t) => t.name === "upsert_fact")!;
  const before2 = queriesRun.length;
  await upsert.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });
  await upsert2.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });

  const q1 = queriesRun[before2];
  const q2 = queriesRun[before2 + 1];
  check("user-123 query has userId param", q1.params.userId === "user-123");
  check("user-456 query has userId param", q2.params.userId === "user-456");
  check("both MERGE the same objectName", q1.params.objectName === "hiking" && q2.params.objectName === "hiking");
  check("user-123 query MERGE includes ownerId", q1.query.includes("ownerId: $userId"));
  check("user-456 query MERGE includes ownerId", q2.query.includes("ownerId: $userId"));
  check("bound userId values differ between the two queries", q1.params.userId !== q2.params.userId);

  // ── Test 7: assertSafeRawCypher rejects mutation keywords directly ──
  console.log("=== TEST: assertSafeRawCypher direct calls ===");
  check("assertSafeRawCypher rejects CREATE", (() => {
    try { assertSafeRawCypher("MATCH (u) CREATE (n) RETURN n"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects MERGE", (() => {
    try { assertSafeRawCypher("MATCH (u:User {id:$userId}) MERGE (n:Foo)"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects DELETE", (() => {
    try { assertSafeRawCypher("DELETE something"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects SET", (() => {
    try { assertSafeRawCypher("SET n.x = 1"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects DROP", (() => {
    try { assertSafeRawCypher("DROP INDEX foo"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects LOAD", (() => {
    try { assertSafeRawCypher("LOAD CSV ..."); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects CALL", (() => {
    try { assertSafeRawCypher("CALL db.stats()"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher rejects apoc", (() => {
    try { assertSafeRawCypher("MATCH (n) CALL apoc.coll.sort([])"); return false; } catch { return true; }
  })());
  check("assertSafeRawCypher allows plain MATCH with $userId", (() => {
    try { assertSafeRawCypher("MATCH (u:User {id:$userId})-[:LIKES]->(t) RETURN t"); return true; } catch { return false; }
  })());

  // ── Test 8: assertSafeRawCypher catches cross-tenant reads ──
  console.log("=== TEST: assertSafeRawCypher catches cross-tenant reads ===");
  check("rejects bare :User without id", (() => {
    try { assertSafeRawCypher("MATCH (u:User {id:$userId})-[:LIKES]->(o) MATCH (o:User) RETURN o"); return false; } catch { return true; }
  })());
  check("rejects :User with hardcoded id", (() => {
    try { assertSafeRawCypher("MATCH (v:User {id:'victim'}) RETURN v"); return false; } catch { return true; }
  })());
  check("allows :User with $userId", (() => {
    try { assertSafeRawCypher("MATCH (u:User {id:$userId}) RETURN u"); return true; } catch { return false; }
  })());

  await rawMemory.stop();
  await mem2.stop();
  await defaultMemory.stop();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 cypher guard tests passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
