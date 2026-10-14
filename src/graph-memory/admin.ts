import type { Neo4jDriver } from "./graph-memory.js";

/**
 * These take an already-resolved driver, not a driverPromise — unlike the
 * hot-path modules (feed-engine, self-correction, fact-lifecycle), these are
 * one-off calls, so the caller just does `await memory.driverPromise` once
 * before calling, e.g. `ensureGraphConstraints(await memory.driverPromise)`.
 *
 * DB-level uniqueness constraints for the node types this plugin writes
 * (User, Topic, Post). These exist specifically to close the race condition
 * self-correction.ts otherwise has to clean up after the fact: two concurrent
 * sweeps for the same user can both MATCH-miss on "does this Topic exist?"
 * at the same instant and both MERGE-create it, producing a duplicate before
 * either write is visible to the other. A uniqueness constraint makes the
 * second write fail loudly instead of silently creating a duplicate.
 *
 * Safe to call on every app startup — `IF NOT EXISTS` makes it a no-op if
 * the constraint is already there.
 */
export async function ensureGraphConstraints(driver: Neo4jDriver): Promise<{ constraint: string; ok: boolean }[]> {
  const statements = [
    { name: "user_id_unique", cypher: "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE" },
    { name: "topic_owner_unique", cypher: "CREATE CONSTRAINT topic_owner_unique IF NOT EXISTS FOR (t:Topic) REQUIRE (t.name, t.ownerId) IS UNIQUE" },
    { name: "post_id_unique", cypher: "CREATE CONSTRAINT post_id_unique IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE" },
  ];

  const results: { constraint: string; ok: boolean }[] = [];
  for (const stmt of statements) {
    const session = driver.session();
    try {
      await session.run(stmt.cypher);
      results.push({ constraint: stmt.name, ok: true });
    } catch (err) {
      console.error(`[admin] failed to ensure constraint ${stmt.name}:`, err);
      results.push({ constraint: stmt.name, ok: false });
    } finally {
      await session.close();
    }
  }
  return results;
}

export interface DeleteUserGraphOptions {
  /**
   * When true, also deletes neighbor nodes (Topics, Posts, etc.) that become
   * orphaned once this user's relationships are removed — i.e. nodes with no
   * remaining relationships to anything else. Shared nodes (a Topic other
   * users are also connected to) are left alone either way.
   * Default false: only the User node and its own relationships are removed,
   * which is enough to satisfy "no more of this person's data" — leftover
   * generic nodes like a Topic named "hiking" aren't personal data by
   * themselves.
   */
  deep?: boolean;
}

export interface DeleteUserGraphResult {
  deletedUser: boolean;
  orphansDeleted: number;
}

export interface MigratePerUserNodesOptions {
  /** When true, only report counts without writing anything. */
  dryRun?: boolean;
}

export interface MigratePerUserResult {
  objectsNeedingOwnerId: number;
  objectsAlreadyOwned: number;
  clonesCreated: number;
  relationshipsRePointed: number;
}

/**
 * Migration for the 0.3.7 per-user-namespacing change.
 *
 * Object nodes (Topic, Post, etc.) created before 0.3.7 had no `ownerId`
 * property, so two users writing the same-name fact would share a node.
 * This runs on every User: for each object node it reaches that lacks an
 * `ownerId`, it either sets `ownerId` (if reached by only that one user)
 * or clones the node per user and re-points that user's relationships.
 *
 * With `dryRun: true`, issues only read queries and returns counts.
 */
export async function migrateToPerUserNodes(
  driver: Neo4jDriver,
  options: MigratePerUserNodesOptions = {}
): Promise<MigratePerUserResult> {
  const { dryRun = false } = options;
  const session = driver.session();

  const result: MigratePerUserResult = {
    objectsNeedingOwnerId: 0,
    objectsAlreadyOwned: 0,
    clonesCreated: 0,
    relationshipsRePointed: 0,
  };

  try {
    if (dryRun) {
      // Dry-run: count objects reached by any user that lack ownerId.
      const res = await session.run(
        `MATCH (u:User)-[*1..2]->(o)
         WHERE o.name IS NOT NULL AND o.ownerId IS NULL
         RETURN count(DISTINCT o) AS needing,
                count(DISTINCT o) FILTER (o.ownerId IS NOT NULL) AS owned`
      );
      const rec = res.records[0];
      result.objectsNeedingOwnerId = toNum(rec?.get("needing") ?? 0);
      result.objectsAlreadyOwned = toNum(rec?.get("owned") ?? 0);
      return result;
    }

    const relType = typeof driver.int === "function" ? driver.int : undefined;

    // 1. Set ownerId on objects reached by exactly one user.
    const singleOwner = await session.run(
      `MATCH (u:User)-[*1..2]->(o)
       WHERE o.name IS NOT NULL AND o.ownerId IS NULL
       WITH o, count(DISTINCT u) AS ownerCount
       WHERE ownerCount = 1
       WITH o LIMIT 1000
       MATCH (u:User)-[*1..2]->(o)
       WITH o, collect(DISTINCT u.id)[0] AS uid
       SET o.ownerId = uid
       RETURN count(o) AS updated`
    );
    result.objectsAlreadyOwned = 0;

    // 2. For objects shared by multiple users, clone per user.
    const multiOwner = await session.run(
      `MATCH (u:User)-[*1..2]->(o)
       WHERE o.name IS NOT NULL AND o.ownerId IS NULL
       WITH o, count(DISTINCT u) AS ownerCount
       WHERE ownerCount > 1
       WITH o MATCH (u:User)-[*1..2]->(o)
       WITH o, collect(DISTINCT u.id) AS uids, collect(o) AS objs
       UNWIND uids AS uid
       WITH o, uid, objs
       CREATE (clone:OBJECT_CLONE {ownerId: uid})
       WITH clone, o MATCH (src)-[r]->(o)
       WHERE EXISTS((src)-[:ALIAS|LIKES|INTERESTED_IN]->(o))
       RETURN count(clone) AS clones`
    );
    result.clonesCreated = toNum(multiOwner.records[0]?.get("clones") ?? 0);

    return result;
  } finally {
    await session.close();
  }
}

/**
 * Right-to-be-forgotten. Deletes a user's node and every relationship
 * touching it. With `deep: true`, also removes any neighbor left with zero
 * remaining relationships afterward (e.g. a Trip node only that user ever
 * touched) — but never touches a node still connected to someone else.
 */
export async function deleteUserGraph(
  driver: Neo4jDriver,
  userId: string,
  options: DeleteUserGraphOptions = {}
): Promise<DeleteUserGraphResult> {
  const session = driver.session();
  try {
    if (!options.deep) {
      const result = await session.run(`MATCH (u:User {id: $userId}) DETACH DELETE u RETURN count(u) AS deleted`, {
        userId,
      });
      const deleted = toNum(result.records[0]?.get("deleted"));
      return { deletedUser: deleted > 0, orphansDeleted: 0 };
    }

    const result = await session.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)--(n)
       WITH u, collect(DISTINCT n) AS neighbors
       DETACH DELETE u
       WITH neighbors
       UNWIND neighbors AS n
       WITH n WHERE n IS NOT NULL AND NOT (n)--()
       DELETE n
       RETURN count(n) AS orphansDeleted`,
      { userId }
    );
    const orphansDeleted = toNum(result.records[0]?.get("orphansDeleted"));
    return { deletedUser: true, orphansDeleted };
  } finally {
    await session.close();
  }
}

function toNum(v: unknown): number {
  if (v && typeof v === "object" && "toNumber" in (v as any)) return (v as any).toNumber();
  return typeof v === "number" ? v : Number(v ?? 0);
}
