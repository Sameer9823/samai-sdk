#!/usr/bin/env node
/**
 * Live Neo4j 5 smoke test for samai-sdk graph-memory (0.3.7).
 *
 * NOT part of `npm test` (needs a running database). Run manually:
 *
 *   # Start Neo4j 5 in Docker:
 *   docker run -d --name neo4j-smoke -p 7687:7687 -e NEO4J_AUTH=neo4j/testpass neo4j:5
 *   # Wait ~15s for it to be ready, then:
 *   NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=testpass npm run smoke:neo4j
 *
 * Exits 0 on all-pass, 1 on any failure.
 */
import {
  loadNeo4jDriver,
  enableGraphMemory,
  assertSafeRawCypher,
  createUpsertFactTool,
  assertSafeRelation,
  ELEMENT_ID_RE,
  ensureGraphConstraints,
  deleteUserGraph,
  migrateToPerUserNodes,
} from "../src/index.ts";
import { createRenameRelationshipTool, createDeleteRelationshipTool } from "../src/graph-memory/self-correction.ts";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) console.log("  \u2705 " + label);
  else { console.log("  \u274c " + label + (detail ? " \u2014 " + detail : "")); failures++; }
}

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
  console.error("Smoke test skipped \u2014 set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD env vars.");
  console.error("Start Neo4j 5: docker run -d --name neo4j-smoke -p 7687:7687 -e NEO4J_AUTH=neo4j/testpass neo4j:5");
  process.exit(0);
}

async function main() {
  console.log("=== Neo4j 5 smoke test for samai-sdk 0.3.7 ===\n");

  const driver = await loadNeo4jDriver({
    uri: NEO4J_URI,
    username: NEO4J_USER,
    password: NEO4J_PASSWORD,
  });

  try {
    // Setup: constraints
    console.log("> ensureGraphConstraints");
    await ensureGraphConstraints(driver);
    check("constraints created", true);

    // Use enableGraphMemory with unsafeRawCypher so we get all tools
    const memory = enableGraphMemory({
      driver,
      userId: "smoke-test-user",
      unsafeRawCypher: true,
    }).build();

    const upsertTool = memory.tools.find((t) => t.name === "upsert_fact")!;
    const readTool = memory.tools.find((t) => t.name === "read_user_facts")!;
    const deleteFactTool = memory.tools.find((t) => t.name === "delete_user_fact")!;
    const rawCypherTool = memory.tools.find((t) => t.name === "execute_cypher_query")!;

    const s = driver.session();

    // Test 1: Two users with same fact name get distinct nodes
    console.log("\n> test 1: upsert_fact per-user isolation");
    await upsertTool.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });
    await upsertTool.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });

    // Also upsert for a different user to verify isolation
    const upsertOther = createUpsertFactTool(Promise.resolve(driver), "smoke-test-user-2");
    await upsertOther.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "hiking" });

    const countResult = await s.run(
      "MATCH (u:User {id: $ua})-[r:LIKES]->(a:Topic {name: 'hiking', ownerId: $ua}) " +
      "MATCH (u2:User {id: $ub})-[r2:LIKES]->(b:Topic {name: 'hiking', ownerId: $ub}) " +
      "RETURN CASE WHEN elementId(a) = elementId(b) THEN 'SAME' ELSE 'DISTINCT' END AS nodeRelation",
      { ua: "smoke-test-user", ub: "smoke-test-user-2" }
    );
    const row = countResult.records[0]?.toObject();
    check("two users with same fact name get distinct nodes", row?.nodeRelation === "DISTINCT", String(row?.nodeRelation));

    // Test 2: read_user_facts returns rows with relElementId
    console.log("\n> test 2: read_user_facts with elementId");
    const readResult = await readTool.execute({ relationType: "LIKES" });
    check("read_user_facts returns rows", Array.isArray(readResult) && readResult.length > 0);
    check("each row has relElementId", readResult.every((r: any) => r?.relElementId !== undefined));

    const readResultAll = await readTool.execute({});
    check("read_user_facts (no filter) returns rows", Array.isArray(readResultAll) && readResultAll.length >= 1);

    const readResultLimited = await readTool.execute({ limit: 50 });
    check("read_user_facts with limit returns rows", Array.isArray(readResultLimited) && readResultLimited.length >= 1);

    // Test 3: delete_user_fact by element ID — only deletes matching rel
    console.log("\n> test 3: delete_user_fact isolation");
    const relElementId = readResult[0].relElementId as string;
    check("relElementId passes ELEMENT_ID_RE", ELEMENT_ID_RE.test(relElementId), relElementId);

    await deleteFactTool.execute({ relElementId });

    const checkDeleted = await s.run(
      "MATCH (u:User {id: $userId})-[r]->(o) WHERE elementId(r) = $relId RETURN count(r) AS cnt",
      { userId: "smoke-test-user", relId: relElementId }
    );
    check("relationship deleted (count=0)", Number(checkDeleted.records[0]?.get("cnt")) === 0);

    // Verify user 2's data is untouched
    const checkB = await s.run(
      "MATCH (u:User {id: $userId})-[r]->(o:Topic {name: 'hiking'}) RETURN count(r) AS cnt",
      { userId: "smoke-test-user-2" }
    );
    check("user 2's data untouched", Number(checkB.records[0]?.get("cnt")) === 1);

    // Test 4: rename_relationship (uses elementId-based WHERE)
    console.log("\n> test 4: rename_relationship");
    await upsertTool.execute({ relation: "LIKES", objectLabel: "Topic", objectName: "cycling" });

    const beforeRename = await s.run(
      "MATCH (u:User {id: $userId})-[r:LIKES]->(o:Topic {name: 'cycling', ownerId: $userId}) " +
      "RETURN elementId(r) AS id",
      { userId: "smoke-test-user" }
    );
    const renameRelId = beforeRename.records[0]?.get("id");
    check("found LIKES->cycling to rename", renameRelId !== undefined);

    if (renameRelId) {
      // Use the public rename tool (from self-correction.ts)
      const renameTool = createRenameRelationshipTool(Promise.resolve(driver), "smoke-test-user");
      await renameTool.execute({ relElementId: renameRelId, newType: "WANTS_TO_DO" });

      const afterRename = await s.run(
        "MATCH (u:User {id: $userId})-[r]->(o:Topic {name: 'cycling'}) " +
        "WHERE elementId(r) = $relId RETURN type(r) AS t",
        { userId: "smoke-test-user", relId: renameRelId }
      );
      const r = afterRename.records[0]?.toObject();
      check("rename_relationship changed the type", r?.t === "WANTS_TO_DO", String(r?.t));
    }

    // Test 5: assertSafeRawCypher
    console.log("\n> test 5: assertSafeRawCypher guard");
    try {
      assertSafeRawCypher("MATCH (u:User {id:$userId})-[r]->(o) RETURN o.name");
      check("anchored read query accepted", true);
    } catch (e) {
      check("anchored read query accepted", false, (e as Error).message);
    }

    try {
      assertSafeRawCypher("MATCH (u:User {id:$userId}) MATCH (o) RETURN o");
      check("unanchored second MATCH rejected", false);
    } catch {
      check("unanchored second MATCH rejected", true);
    }

    try {
      assertSafeRawCypher("MATCH (u:User {id:$userId}) DETACH DELETE u");
      check("write clause blocked", false);
    } catch {
      check("write clause blocked", true);
    }

    try {
      assertSafeRelation("LIKES_BAD", "relation");
      check("bad relation name rejected", false);
    } catch {
      check("bad relation name rejected", true);
    }

    try {
      assertSafeRelation("LIKES", "relation");
      check("valid relation name accepted", true);
    } catch {
      check("valid relation name accepted", false);
    }

    // Test 5b: execute_cypher_query read-only with unsafeRawCypher
    console.log("\n> test 5b: execute_cypher_query read-only session");
    try {
      await rawCypherTool.execute({ query: "MATCH (u:User {id:$userId})-[r]->(o) RETURN count(r) AS cnt" });
      check("raw read query executes", true);
    } catch (e) {
      check("raw read query executes", false, (e as Error).message);
    }

    try {
      await rawCypherTool.execute({ query: "MATCH (u:User {id:$userId}) SET u.test = 'x' RETURN u" });
      check("raw write query rejected by guard", false);
    } catch {
      check("raw write query rejected by guard", true);
    }

    // Test 6: migrateToPerUserNodes dryRun
    console.log("\n> test 6: migrateToPerUserNodes");
    // Seed a legacy node that belongs to a user but lacks ownerId
    await s.run(
      "MERGE (u:User {id: 'smoke-migrator'}) " +
      "MERGE (o:Topic {name: 'legacy-no-owner'}) " +
      "MERGE (u)-[:LIKES]->(o)",
      {}
    );

    const preCount = await s.run(
      "MATCH (o:Topic {name: 'legacy-no-owner'}) WHERE o.ownerId IS NULL RETURN count(o) AS cnt",
      {}
    );
    check("seeded a legacy node without ownerId", Number(preCount.records[0]?.get("cnt")) === 1);

    // Need a driver that points to the same DB but with a different userId
    const migratorMemory = enableGraphMemory({
      driver,
      userId: "smoke-migrator",
      unsafeRawCypher: false,
    }).build();

    const preMigration = await migrateToPerUserNodes(driver);
    check("migration completed (objectsNeedingOwnerId = 0 or clones created)",
      preMigration.objectsNeedingOwnerId === 0 || preMigration.clonesCreated > 0,
      JSON.stringify(preMigration));

    // Verify the legacy node now has an ownerId
    const postMigrate = await s.run(
      "MATCH (o:Topic {name: 'legacy-no-owner'}) WHERE o.ownerId IS NOT NULL RETURN count(o) AS cnt",
      {}
    );
    check("legacy node now has ownerId after migration", Number(postMigrate.records[0]?.get("cnt")) >= 1);

    await s.close();
  } finally {
    console.log("\n> cleanup");
    for (const uid of ["smoke-test-user", "smoke-test-user-2", "smoke-migrator"]) {
      await deleteUserGraph(driver, uid, { deep: true }).catch(() => {});
    }
    await driver.close();
  }

  if (failures) {
    console.log("\n\u274c " + failures + " smoke test(s) failed");
    process.exit(1);
  }
  console.log("\n\u2705 All Neo4j smoke tests passed");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
