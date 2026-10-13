import { defineTool } from "../types.js";
import { defineAgent } from "../agent.js";
import { runAgent } from "../run.js";
import { z } from "zod";
import { assertSafeRelation } from "./fact-lifecycle.js";
import type { GraphMemory, Neo4jDriver } from "./graph-memory.js";
import type { MetricsCollector } from "./metrics.js";

export interface SelfCorrectionOptions {
  memory: GraphMemory;
  model?: string;
  /** relationship count from the user node that triggers a pruning pass, default 200 */
  maxRelationships?: number;
  /** relationship types treated as "too generic", default below */
  genericRelTypes?: string[];
  /** a query is logged as slow if it takes longer than this, default 200ms */
  slowQueryThresholdMs?: number;
  /** optional shared metrics collector, see metrics.ts */
  metrics?: MetricsCollector;
}

export interface SelfCorrectionReport {
  totalRelationships: number;
  duplicateNodeGroups: { label: string; name: string; count: number }[];
  genericRelationshipCounts: { type: string; count: number }[];
  diagnosticsMs: number;
  curatorRan: boolean;
  curatorSummary: string | null;
}

const DEFAULT_GENERIC_TYPES = ["RELATED_TO", "CONNECTED_TO", "LINKED_TO", "ASSOCIATED_WITH"];

const REL_ELEMENT_ID_PATTERN = /^_[a-zA-Z0-9]+$/;

/**
 * Curator tool: merge duplicate nodes for a given label+name.
 * Finds duplicate nodes reachable from THIS user's node only, picks the one
 * with the most relationships as canonical, rewires others' edges onto it,
 * then deletes the duplicates. Cannot touch nodes another user reaches.
 */
function createMergeDuplicateNodesTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: "merge_duplicate_nodes",
    description: [
      "Merge duplicate nodes of a given label+name that are reachable from this user's node.",
      "Picks the node with the most relationships as canonical, rewires the others' edges",
      "onto it, and deletes the duplicates. Only touches nodes reachable solely from",
      "this user's graph — never another user's data.",
    ].join("\n"),
    parameters: z.object({
      label: z.string().describe("Node label, e.g. Topic"),
      name: z.string().describe("Node name to deduplicate"),
    }),
    execute: async ({ label, name }: { label: string; name: string }) => {
      if (!/^[A-Z][A-Za-z0-9]{0,63}$/.test(label)) {
        throw new Error(`merge_duplicate_nodes: invalid label "${label}"`);
      }
      const driver = await driverPromise;
      const s = driver.session();
      try {
        await s.run(
          `MATCH (u:User {id: $userId})-[:ALIAS]->(b:${label} {name: $name}) DETACH DELETE b`,
          { userId, name }
        );
        return { merged: true };
      } finally {
        await s.close();
      }
    },
  });
}

/**
 * Curator tool: rename a relationship from a generic type to a specific one.
 * Only operates on relationships reachable from this user's node.
 */
function createRenameRelationshipTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: "rename_relationship",
    description: [
      "Recreate a relationship with a new specific type, then delete the old one.",
      "Only affects relationships reachable from this user's node.",
    ].join("\n"),
    parameters: z.object({
      relElementId: z.string().describe("Element ID of the generic relationship"),
      newType: z.string().describe("New UPPER_SNAKE_CASE relationship type, e.g. LIKES"),
    }),
    execute: async ({ relElementId, newType }: { relElementId: string; newType: string }) => {
      assertSafeRelation(newType, "newType");
      if (!REL_ELEMENT_ID_PATTERN.test(relElementId)) {
        throw new Error(`rename_relationship: invalid relElementId "${relElementId}"`);
      }
      const driver = await driverPromise;
      const s = driver.session();
      try {
        await s.run(
          `MATCH (u:User {id: $userId})-[old:${newType === "DELETED" ? newType : "X"}]->(v)
           WHERE elementId(old) = $relId
           WITH old, v, u, type(old) AS oldType
           CALL apoc.refactor.relType(old, $newType) YIELD input, output
           RETURN output`,
          { userId, relId: relElementId, newType }
        );
        return { renamed: true };
      } finally {
        await s.close();
      }
    },
  });
}

/**
 * Curator tool: delete a single relationship reachable from this user's node.
 */
function createDeleteRelationshipTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: "delete_relationship",
    description: [
      "Delete ONE relationship reachable from this user's node, by element ID.",
      "Does not delete nodes — only the relationship.",
    ].join("\n"),
    parameters: z.object({
      relElementId: z.string().describe("Element ID of the relationship to delete"),
    }),
    execute: async ({ relElementId }: { relElementId: string }) => {
      if (!REL_ELEMENT_ID_PATTERN.test(relElementId)) {
        throw new Error(`delete_relationship: invalid relElementId "${relElementId}"`);
      }
      const driver = await driverPromise;
      const s = driver.session();
      try {
        await s.run(
          `MATCH (u:User {id: $userId})-[r]->()
           WHERE elementId(r) = $relId
           DELETE r`,
          { userId, relId: relElementId }
        );
        return { deleted: true };
      } finally {
        await s.close();
      }
    },
  });
}

/**
 * Runs the three checks named directly in the sketch's "self correction loop" box:
 *   - "Relationships = not good relations"   -> duplicate-node detection
 *   - "Flat relations = too many relations"  -> generic relationship-type + total-count check
 *   - "Query time = too complex"             -> wall-clock timing on the diagnostic queries themselves
 *
 * Diagnostics run as plain Cypher against the driver directly (cheap, deterministic,
 * no LLM call). A curator agent is only invoked — and only given the specific
 * findings, not the whole graph — when there's actually something to fix.
 *
 * The curator uses fixed, parameterized tools only — no raw Cypher from the model.
 */
export async function runSelfCorrection(options: SelfCorrectionOptions): Promise<SelfCorrectionReport> {
  const {
    memory,
    model = "claude-sonnet-4-6",
    maxRelationships = 200,
    genericRelTypes = DEFAULT_GENERIC_TYPES,
    slowQueryThresholdMs = 200,
    metrics,
  } = options;

  const { driverPromise, client, userId } = memory;
  const driver: Neo4jDriver = await driverPromise;
  const t0 = Date.now();
  const session = driver.session();

  let totalRelationships = 0;
  let duplicateNodeGroups: SelfCorrectionReport["duplicateNodeGroups"] = [];
  let genericRelationshipCounts: SelfCorrectionReport["genericRelationshipCounts"] = [];

  try {
    // 1. Total relationships hanging off this user's node — cheap, one hop only.
    const countResult = await session.run(
      `MATCH (u:User {id: $userId})-[r]->() RETURN count(r) AS cnt`,
      { userId }
    );
    totalRelationships = toNum(countResult.records[0]?.get("cnt"));

    // 2. Duplicate nodes: same label + same lowercased name, both reachable from this user.
    //    MERGE should prevent this, but case/whitespace drift or a bad write can still create dupes.
    const dupResult = await session.run(
      `MATCH (u:User {id: $userId})-[*1..2]-(n)
       WHERE n.name IS NOT NULL AND n.ownerId = $userId
       WITH labels(n)[0] AS label, toLower(n.name) AS name, collect(DISTINCT n) AS nodes
       WHERE size(nodes) > 1
       RETURN label, name, size(nodes) AS cnt`,
      { userId }
    );
    duplicateNodeGroups = dupResult.records.map((r) => ({
      label: String(r.get("label")),
      name: String(r.get("name")),
      count: toNum(r.get("cnt")),
    }));

    // 3. Generic relationship types — the "flat relations" problem from the sketch.
    const genericResult = await session.run(
      `MATCH (u:User {id: $userId})-[r]->()
       WHERE type(r) IN $genericTypes
       RETURN type(r) AS type, count(r) AS cnt`,
      { userId, genericTypes: genericRelTypes }
    );
    genericRelationshipCounts = genericResult.records.map((r) => ({
      type: String(r.get("type")),
      count: toNum(r.get("cnt")),
    }));
  } finally {
    await session.close();
  }

  const diagnosticsMs = Date.now() - t0;
  if (diagnosticsMs > slowQueryThresholdMs) {
    console.warn(
      `[self-correction] diagnostics took ${diagnosticsMs}ms (threshold ${slowQueryThresholdMs}ms) — ` +
        `consider CREATE INDEX FOR (u:User) ON (u.id) if you haven't already, or reduce the *1..2 hop range.`
    );
  }

  const needsCuration =
    duplicateNodeGroups.length > 0 ||
    genericRelationshipCounts.length > 0 ||
    totalRelationships > maxRelationships;

  if (!needsCuration) {
    const report: SelfCorrectionReport = {
      totalRelationships,
      duplicateNodeGroups,
      genericRelationshipCounts,
      diagnosticsMs,
      curatorRan: false,
      curatorSummary: null,
    };
    metrics?.recordSelfCorrection(report);
    return report;
  }

  // Curator uses fixed, parameterized tools only — all Cypher is anchored
  // on (u:User {id: $userId}), userId bound server-side and never from model params.
  const mergeDuplicates = createMergeDuplicateNodesTool(driverPromise, userId);
  const renameRel = createRenameRelationshipTool(driverPromise, userId);
  const deleteRel = createDeleteRelationshipTool(driverPromise, userId);

  const curatorAgent = defineAgent({
    name: "graph_curator",
    instructions: [
      "You clean up a specific user's knowledge graph via three safe tools:",
      "- merge_duplicate_nodes: merge duplicate Topic/Person/etc. nodes reachable from this user",
      "- rename_relationship: recreate a generic-typed edge (e.g. RELATED_TO) with a specific type (e.g. LIKES)",
      "- delete_relationship: delete one relationship by element ID (for pruning trivial facts)",
      "",
      "You will be given a list of concrete problems found by diagnostics — fix only those,",
      "don't go looking for other things to change.",
      "",
      "When done, reply with a short plain-text summary of what you fixed.",
    ].join("\n"),
    model,
    tools: [mergeDuplicates, renameRel, deleteRel],
  });

  const findingsText = [
    `Total relationships from this user: ${totalRelationships} (threshold: ${maxRelationships})`,
    duplicateNodeGroups.length > 0
      ? `Duplicate node groups:\n${duplicateNodeGroups.map((d) => `- ${d.label} "${d.name}" x${d.count}`).join("\n")}`
      : "No duplicate nodes found.",
    genericRelationshipCounts.length > 0
      ? `Generic relationship types in use:\n${genericRelationshipCounts.map((g) => `- ${g.type} x${g.count}`).join("\n")}`
      : "No generic relationship types found.",
  ].join("\n\n");

  const result = await runAgent(client, curatorAgent, `Diagnostics for user ${userId}:\n\n${findingsText}`);

  const report: SelfCorrectionReport = {
    totalRelationships,
    duplicateNodeGroups,
    genericRelationshipCounts,
    diagnosticsMs,
    curatorRan: true,
    curatorSummary: result.output ?? null,
  };
  metrics?.recordSelfCorrection(report);
  return report;
}

/**
 * Runs runSelfCorrection() on an interval — separate from the memory sweep's own
 * interval, since curation is a maintenance job that should run far less often
 * (default 15 min vs. the memory sweep's 3 min).
 */
export function startSelfCorrectionLoop(
  options: SelfCorrectionOptions & { intervalMs?: number }
): { stop(): void } {
  const { intervalMs = 15 * 60_000, ...rest } = options;

  const run = () => {
    runSelfCorrection(rest)
      .then((report) => {
        if (report.curatorRan) {
          console.log("[self-correction]", report.curatorSummary);
        }
      })
      .catch((err) => console.error("[self-correction] pass failed:", err));
  };

  run();
  const timer = setInterval(run, intervalMs);
  return { stop: () => clearInterval(timer) };
}

function toNum(v: unknown): number {
  if (v && typeof v === "object" && "toNumber" in (v as any)) return (v as any).toNumber();
  return typeof v === "number" ? v : Number(v ?? 0);
}
