import { defineTool, type ToolDefinition } from "../types.js";
import { defineAgent } from "../agent.js";
import { runAgent } from "../run.js";
import { z } from "zod";
import { createUpsertFactTool, assertSafeRelation, ELEMENT_ID_RE } from "./fact-lifecycle.js";
import { assertSafeRawCypher } from "./cypher-guard.js";
import type { MetricsCollector } from "./metrics.js";

/**
 * Minimal Neo4j Driver/Session shape this module needs — kept local instead of
 * importing neo4j-driver's types directly, since neo4j-driver is an optional
 * peer dependency (see loadNeo4jDriver() below), same pattern as
 * session-stores/redis.ts uses for ioredis.
 */
export interface Neo4jSession {
  run(query: string, params?: Record<string, unknown>): Promise<{ records: Neo4jRecord[] }>;
  close(): Promise<void>;
}
export interface Neo4jRecord {
  get(key: string): unknown;
  toObject(): Record<string, unknown>;
}
export type Neo4jSessionMode = "READ" | "WRITE" | undefined;
export interface Neo4jSessionOptions { defaultAccessMode?: Neo4jSessionMode }
export interface Neo4jDriver {
  session(options?: Neo4jSessionOptions): Neo4jSession;
  /** Converts a JS number to the driver's Integer type for LIMIT/SKIP params. */
  int?: (n: number) => unknown;
  close(): Promise<void>;
}

/**
 * Requires the optional `neo4j-driver` peer dependency (`npm install neo4j-driver`);
 * imported dynamically so the rest of the SDK works fine without it installed —
 * same pattern RedisSessionStore uses for ioredis.
 */
export async function loadNeo4jDriver(creds: Neo4jCreds): Promise<Neo4jDriver> {
  let neo4j: any;
  try {
    ({ default: neo4j } = await import("neo4j-driver"));
  } catch (err) {
    throw new Error(
      "enableGraphMemory requires the optional `neo4j-driver` package. Install it with `npm install neo4j-driver`.",
      { cause: err }
    );
  }
  const driver = neo4j.driver(creds.uri, neo4j.auth.basic(creds.username, creds.password));
  (driver as any).int = neo4j.int;
  return driver;
}

/**
 * Minimal shape we need out of an samai-sdk Session — matches
 * SessionStore.getMessages() (see samai-sdk docs: "Sessions (memory)").
 * We depend on this shape rather than importing samai-sdk's Session type
 * directly, so this plugin keeps working even if that type moves.
 */
export interface MinimalMessage {
  role: string;
  content: unknown;
}

export interface MinimalSession {
  getMessages(): Promise<MinimalMessage[]> | MinimalMessage[];
}

export interface Neo4jCreds {
  uri: string;
  username: string;
  password: string;
}

export interface GraphMemoryOptions {
  /** an samai-sdk client, e.g. createClient({ provider: anthropic({...}) }) */
  client: any;
  /**
   * Provide EITHER creds (we dynamically import neo4j-driver and own the
   * resulting driver, closing it on stop()) OR an already-constructed driver
   * / driver promise (you own its lifecycle — useful for sharing one driver
   * across multiple users via createGraphMemoryManager, or injecting a fake
   * in tests without needing neo4j-driver installed at all).
   */
  creds?: Neo4jCreds;
  driver?: Neo4jDriver | Promise<Neo4jDriver>;
  /** model used by the private memory agent, default matches the SDK's docs examples */
  model?: string;
  /** how often the background sweep runs, default 3 minutes */
  intervalMs?: number;
  /** identifies whose graph this is, used as the anchor node in every query */
  userId: string;
  /** where to read recent conversation from for each sweep */
  session: MinimalSession;
  /** how many recent messages to look at per sweep, default 20 */
  windowSize?: number;
  /** optional shared metrics collector, see metrics.ts */
  metrics?: MetricsCollector;
  /**
   * Opt-in to the raw Cypher tool. When true, the memory agent also gets
   * `execute_cypher_query` — but it runs READ-only sessions and rejects any
   * mutation keywords. This is defence-in-depth, NOT tenant isolation;
   * multi-tenant setups must enforce per-user isolation at the DB level.
   * Default false.
   */
  unsafeRawCypher?: boolean;
}

/** Tools the memory agent always gets: upsert_fact + read + delete (all safe). */
const TOOL_READ_USER_FACTS = "read_user_facts";
const TOOL_DELETE_USER_FACT = "delete_user_fact";
const TOOL_UPSERT_FACT = "upsert_fact";
/** Opt-in raw Cypher tool (only when unsafeRawCypher: true). */
const TOOL_EXECUTE_CYPHER = "execute_cypher_query";

export interface GraphMemory {
  /** All tools available for this memory instance (fixed, parameterized + optional raw Cypher). */
  tools: ToolDefinition<any, any>[];
  /** The raw Cypher tool — only present when `unsafeRawCypher: true` was set; otherwise undefined. */
  rawCypherTool?: ToolDefinition<any, any>;
  /**
   * Resolves to the underlying Neo4j driver. A promise (not a plain Driver)
   * because neo4j-driver is dynamically imported (see loadNeo4jDriver) — it
   * resolves once and every internal caller reuses the same promise, so
   * awaiting it after the first call is effectively instant.
   */
  driverPromise: Promise<Neo4jDriver>;
  /** samai-sdk client, exposed so self-correction.ts can run its own curator agent without a second connection */
  client: any;
  userId: string;
  /** current running-context string, safe to read any time */
  getRunningContext(): string;
  /** run one sweep immediately and return the updated running context */
  sweepOnce(): Promise<string>;
  /** start the interval-based background sweep */
  start(): void;
  /** stop the background sweep and close the Neo4j driver */
  stop(): Promise<void>;
}

function createReadUserFactsTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: TOOL_READ_USER_FACTS,
    description: [
      "Read facts (relationships + connected object nodes) that originate from this user's node.",
      "You cannot read another user's facts — all queries are anchored on (u:User {id: $userId}).",
    ].join("\n"),
    parameters: z.object({
      relationType: z.string()
        .regex(/^[A-Z][A-Z0-9_]{0,63}$/)
        .optional()
        .describe("If given, only read relationships of this exact type (e.g. LIKES, WORKS_AT)."),
      objectName: z.string()
        .optional()
        .describe("If given, only read facts about this object name (e.g. 'hiking')."),
      limit: z.number().int().max(50).optional().default(50).describe("Hard cap at 50 rows."),
    }),
    execute: async ({ relationType, objectName, limit = 50 }: {
      relationType?: string;
      objectName?: string;
      limit?: number;
    }) => {
      const driver = await driverPromise;
      const s = driver.session();
      try {
        const cappedLimit = Math.min(limit, 50);

        if (relationType) {
          assertSafeRelation(relationType, "relationType");
        }

        let query = `MATCH (u:User {id: $userId})-[r]->(o)
                    RETURN type(r) AS relationType, o.name AS objectName, labels(o) AS labels,
                           elementId(r) AS relElementId
                    ORDER BY r.updatedAt DESC`;
        const params: Record<string, unknown> = { userId, limit: driver.int ? driver.int(cappedLimit) : cappedLimit };

        if (relationType) {
          query = query.replace(
            "-[r]->(o)",
            `-[r:${relationType}]->(o)`
          );
        }
        if (objectName) {
          query = query.replace(
            "RETURN",
            "WHERE o.name = $objectName RETURN"
          );
          params.objectName = objectName;
        }
        query += " LIMIT $limit";

        const result = await s.run(query, params);
        return result.records.map((r) => r.toObject());
      } finally {
        await s.close();
      }
    },
  });
}

function createDeleteUserFactTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: TOOL_DELETE_USER_FACT,
    description: [
      "Delete a SINGLE relationship that starts at this user's node, identified by the",
      "relationship's internal element ID. Only one relationship is ever deleted per call.",
      "You cannot delete relationships belonging to another user.",
    ].join("\n"),
    parameters: z.object({
      relElementId: z.string().describe("The element ID of the relationship to delete (from read_user_facts)."),
    }),
    execute: async ({ relElementId }: { relElementId: string }) => {
      if (!relElementId || typeof relElementId !== "string" || !ELEMENT_ID_RE.test(relElementId)) {
        throw new Error(`delete_user_fact: invalid relElementId "${relElementId}"`);
      }
      const driver = await driverPromise;
      const s = driver.session();
      try {
        const result = await s.run(
          `MATCH (u:User {id: $userId})-[r]->()
           WHERE elementId(r) = $relId
           DELETE r
           RETURN count(r) AS deleted`,
          { userId, relId: relElementId }
        );
        const deleted = result.records.length > 0 ? Number(result.records[0].get("deleted")) : 0;
        return { deleted };
      } finally {
        await s.close();
      }
    },
  });
}

function createExecuteCypherTool(driverPromise: Promise<Neo4jDriver>, userId: string) {
  return defineTool({
    name: TOOL_EXECUTE_CYPHER,
    description: [
      "Run a READ-ONLY Cypher query against this user's personal knowledge graph in Neo4j.",
      "This is an escaped hatch — prefer upsert_fact / read_user_facts / delete_user_fact.",
      "The query runs in a READ-only session and must reference $userId.",
    ].join("\n"),
    parameters: z.object({
      query: z.string().describe("A read-only Cypher query, using $userId and any other named parameters"),
      params: z.record(z.any()).optional().describe("Query parameters"),
    }),
    execute: async ({ query, params }: { query: string; params?: Record<string, unknown> }) => {
      assertSafeRawCypher(query);
      const driver = await driverPromise;
      const s = driver.session({ defaultAccessMode: "READ" });
      try {
        const result = await s.run(query, { ...(params ?? {}), userId });
        return result.records.map((r) => r.toObject());
      } finally {
        await s.close();
      }
    },
  });
}

/**
 * enableGraphMemory({ client, creds, userId, session }).build()
 *
 * Wires a per-user Neo4j graph as long-term memory for an samai-sdk agent:
 *  - a private memory agent autonomously writes Cypher against the graph
 *  - a background interval periodically sweeps recent conversation into the graph
 *  - the sweep's output becomes "running context" you inject into your main
 *    agent's system prompt on each turn (see with-running-context.ts)
 *
 * By default the memory agent only gets fixed, parameterized tools:
 *   - upsert_fact   (write a subject-relation-object edge)
 *   - read_user_facts (read the user's own facts, with optional filtering)
 *   - delete_user_fact (delete one relationship by element ID)
 * All Cypher in these tools is written by us — the model passes values, never
 * query text — and every query is anchored on (u:User {id: $userId}) with
 * userId bound server-side and never taken from model params.
 *
 * Set `unsafeRawCypher: true` to additionally get `execute_cypher_query`
 * (READ-only, mutation keywords stripped/blocked). This is defence-in-depth,
 * NOT tenant isolation — production multi-tenant setups must enforce
 * isolation at the database level.
 */
export function enableGraphMemory(options: GraphMemoryOptions): { build(): GraphMemory } {
  const {
    client,
    creds,
    userId,
    session,
    model = "claude-sonnet-4-6",
    intervalMs = 3 * 60_000,
    windowSize = 20,
    metrics,
    unsafeRawCypher = false,
  } = options;

  if (!options.creds && !options.driver) {
    throw new Error("enableGraphMemory requires either `creds` or a pre-built `driver`");
  }
  const ownsDriver = !options.driver;
  const driverPromise: Promise<Neo4jDriver> = options.driver
    ? Promise.resolve(options.driver)
    : loadNeo4jDriver(creds!);

  const upsertFact = createUpsertFactTool(driverPromise, userId);
  const readUserFacts = createReadUserFactsTool(driverPromise, userId);
  const deleteUserFact = createDeleteUserFactTool(driverPromise, userId);

  const defaultTools = [upsertFact, readUserFacts, deleteUserFact];
  const rawCypherTool = unsafeRawCypher ? createExecuteCypherTool(driverPromise, userId) : undefined;
  const allTools = rawCypherTool ? [...defaultTools, rawCypherTool] : defaultTools;

  const memoryAgent = defineAgent({
    name: "private_memory_agent",
    instructions: [
      "You maintain a per-user knowledge graph in Neo4j via three safe, parameterized tools:",
      "- upsert_fact: store a subject-relation-object fact (e.g. LIKES -> Topic(hiking)).",
      "  Timestamps automatically. Use `contradicts` to retire a superseded relation type.",
      "- read_user_facts: read the user's own facts (optionally filter by relation or name).",
      "- delete_user_fact: delete ONE relationship by element ID.",
      "All queries are anchored on (u:User {id: $userId}) — you cannot read or write",
      "another user's graph. There is no raw Cypher tool available.",
      "",
      "You'll be given a slice of recent conversation. Decide what durable facts about the",
      "user are worth storing (preferences, relationships, ongoing projects, recurring topics)",
      "and write them to the graph. First check if a matching node already exists before creating one.",
      "",
      "After updating the graph, your final answer must be a short (3-5 line) plain-text summary",
      "of what you now know about this user — that summary becomes another agent's context,",
      "not a report of the steps you took.",
    ].join("\n"),
    model,
    tools: allTools,
  });

  let runningContext = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  async function sweepOnce(): Promise<string> {
    const messages = await session.getMessages();
    const recent = messages.slice(-windowSize);
    if (recent.length === 0) return runningContext;

    const transcript = recent
      .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n");

    const t0 = Date.now();
    try {
      const result = await runAgent(
        client,
        memoryAgent,
        `Recent conversation with user ${userId}:\n${transcript}\n\nUpdate the graph, then summarize what you know about this user.`
      );
      if (result.output) runningContext = result.output;
      metrics?.recordSweep(true, Date.now() - t0);
      return runningContext;
    } catch (err) {
      metrics?.recordSweep(false, Date.now() - t0);
      throw err;
    }
  }

  return {
    build(): GraphMemory {
      return {
        tools: allTools,
        rawCypherTool,
        driverPromise,
        client,
        userId,
        getRunningContext: () => runningContext,
        sweepOnce,
        start() {
          if (timer) return;
          sweepOnce().catch((err) => console.error("[graph-memory] sweep failed:", err));
          timer = setInterval(() => {
            sweepOnce().catch((err) => console.error("[graph-memory] sweep failed:", err));
          }, intervalMs);
        },
        async stop() {
          if (timer) clearInterval(timer);
          timer = null;
          if (ownsDriver) {
            const driver = await driverPromise;
            await driver.close();
          }
        },
      };
    },
  };
}
