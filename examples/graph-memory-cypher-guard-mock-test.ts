import { createClient, createMockProvider, createSession, InMemorySessionStore, enableGraphMemory } from "../src/index.js";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label}`);
    failures++;
  }
}

// Fake Neo4j driver injected via the `driver` option — records every query + params
// the execute_cypher_query tool forwards to `session.run()`, so we can assert on the
// bound userId and on whether blocked queries ever reach the driver at all.
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

const client = createClient({ provider: createMockProvider({ responses: [] }) });
const session = createSession("user-123", new InMemorySessionStore());
const memory = enableGraphMemory({
  client,
  driver: new FakeDriver() as any,
  userId: "user-123",
  session,
}).build();

async function main() {
  // ── Item 6: a model-supplied params.userId must NOT override the bound id ──
  console.log("=== TEST: model cannot override $userId via params ===");
  const before = queriesRun.length;
  await memory.tool.execute({
    query: "MERGE (u:User {id: $userId})-[:LIKES]->(t:Topic {name: 'hiking'})",
    params: { userId: "EVIL-HIJACK", topic: "hiking" },
  });

  check("the query reached the fake driver", queriesRun.length === before + 1);
  const boundParams = queriesRun[before].params;
  console.log(`  driver received params: ${JSON.stringify(boundParams)}`);
  check("bound userId wins over model-supplied params.userId", boundParams.userId === "user-123");
  check("model-supplied 'EVIL-HIJACK' did not override the bound id", boundParams.userId !== "EVIL-HIJACK");
  check("other model params are still passed through", boundParams.topic === "hiking");

  // ── Item 7: defence-in-depth cypher guard blocks dangerous queries ──
  console.log("=== TEST: execute_cypher_query rejects dangerous queries ===");
  const blocked: Array<[string, string]> = [
    ["query without $userId", "MERGE (n:Thing) RETURN n"],
    ["CALL procedure", "MATCH (u:User {id:$userId}) CALL db.indexes() RETURN n"],
    ["LOAD CSV", "LOAD CSV WITH HEADERS FROM 'file:///etc/passwd' AS row MATCH (u:User {id:$userId}) RETURN row"],
    ["apoc procedure", "MATCH (u:User {id:$userId}) CALL apoc.cypher.doIt('RETURN 1', {}) YIELD value RETURN value"],
    ["unanchored DETACH DELETE", "MATCH (n:Foo) DETACH DELETE n"],
    ["DELETE referencing $userId but no User anchor", "MATCH (n:Foo {id: $userId}) DETACH DELETE n"],
  ];

  for (const [label, query] of blocked) {
    let threw = false;
    let message = "";
    try {
      await memory.tool.execute({ query, params: { userId: "user-123" } });
    } catch (err) {
      threw = true;
      message = err instanceof Error ? err.message : String(err);
    }
    check(`blocked: ${label}`, threw);
    console.log(`    ${label} -> ${message.slice(0, 80)}`);
  }

  // A delete that IS anchored to the user node must still be allowed (heuristic, not a wall).
  let anchoredDeleteAllowed = true;
  try {
    await memory.tool.execute({
      query: "MATCH (u:User {id: $userId})-[:ALIAS]->(n:Note) DELETE n",
    });
  } catch {
    anchoredDeleteAllowed = false;
  }
  check("user-anchored DELETE is still allowed", anchoredDeleteAllowed);

  // None of the blocked queries should have reached the driver.
  check("blocked queries never reached the fake driver", queriesRun.length === before + 2);

  await memory.stop();
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
