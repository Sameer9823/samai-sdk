import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const SETUP_CODE = `import {
  createClient, anthropic, defineAgent, createSession, InMemorySessionStore,
  enableGraphMemory, chatWithMemory, ensureGraphConstraints,
} from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });
const session = createSession("user-123", new InMemorySessionStore());

const memory = enableGraphMemory({
  client,
  creds: { uri: process.env.NEO4J_URI!, username: process.env.NEO4J_USERNAME!, password: process.env.NEO4J_PASSWORD! },
  userId: "user-123",
  session,
}).build();

const assistant = defineAgent({
  name: "assistant",
  instructions: "You are a helpful assistant.",
  model: "claude-sonnet-4-6",
});

await ensureGraphConstraints(await memory.driverPromise); // once at startup, idempotent
memory.start(); // background sweep begins (default every 3 min)

const result = await chatWithMemory(client, assistant, memory, "Planning a trip to Kyoto next month.", { session });`;

const MANAGER_CODE = `import { createGraphMemoryManager, chatWithMemory } from "samai-sdk";

const manager = createGraphMemoryManager({ client, creds: { uri, username, password } });

// call per incoming request — creates on first contact, reuses (same driver,
// same background sweep timer) after
const memory = manager.getOrCreate(userId, session);
if (!manager.has(userId)) memory.start();

await manager.stopAll(); // stops every user's sweep, closes the ONE shared driver`;

const CONTRADICTION_CODE = `// what the memory agent does when it hears "I don't hike anymore":
// upsert_fact({ relation: "DISLIKES", objectLabel: "Topic", objectName: "hiking",
//               contradicts: ["LIKES"] })
// -> old LIKES->hiking edge deleted, THEN DISLIKES->hiking written.

import { applyRecencyDecay } from "samai-sdk";

const report = await applyRecencyDecay({
  driverPromise: memory.driverPromise,
  userId: "user-123",
  halfLifeDays: 30,     // a fact's weight halves every 30 days without reinforcement
  pruneThreshold: 0.05, // facts decayed below this are deleted outright
});`;

const FEED_CODE = `import { createFeedEngine } from "samai-sdk";

const feed = createFeedEngine({ driverPromise: memory.driverPromise });

await feed.upsertPost({ id: "post-1", niche: "hiking", topics: ["trail running", "gear"] });
await feed.recordFollow("user-123", "user-456");
await feed.recordLike("user-456", "post-1");

const ranked = await feed.getFeed({ userId: "user-123", limit: 20 });
// ranked[0] is highest-scored: social proximity + interest-graph match + log-scaled engagement`;

export default function GraphMemoryPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Graph memory (Neo4j)"
        description="Per-user long-term memory backed by a Neo4j knowledge graph, instead of replaying the full conversation transcript on every turn. A private memory agent writes facts to each user's graph in the background; your main agent only ever sees a plain-text summary of what's relevant."
      >
        <Callout tone="signal" title="Optional peer dependency">
          Requires <code>neo4j-driver</code> (dynamically imported, same
          pattern as <code>RedisSessionStore</code>/<code>ioredis</code> —
          the rest of the SDK works fine without it installed).
          <br />
          <code>npm install neo4j-driver</code>
        </Callout>

        <h2 id="setup">Setup</h2>
        <CodeBlock code={SETUP_CODE} lang="ts" label="graph-memory.ts" />

        <h2 id="many-users">Serving many users</h2>
        <p>
          <code>enableGraphMemory({"{"} creds {"}"})</code> creates its own
          driver — fine for one user, wasteful for many.{" "}
          <code>createGraphMemoryManager()</code> shares a single driver (and
          its connection pool) across every user instead.
        </p>
        <CodeBlock code={MANAGER_CODE} lang="ts" label="manager.ts" />

        <h2 id="contradictions">Timestamped facts &amp; contradictions</h2>
        <p>
          The memory agent writes ordinary facts through{" "}
          <code>upsert_fact</code> automatically (wired in already — nothing
          to configure), which guarantees timestamping and can retire a
          contradicting old fact in the same call.{" "}
          <code>applyRecencyDecay()</code> fades old, unreinforced facts and
          prunes anything past a threshold.
        </p>
        <CodeBlock code={CONTRADICTION_CODE} lang="ts" label="decay.ts" />

        <h2 id="self-correction">Self-correction</h2>
        <p>
          <code>runSelfCorrection()</code> /{" "}
          <code>startSelfCorrectionLoop()</code> run real Cypher diagnostics
          (duplicate nodes, overly generic relationship types,
          relationship-count overload) and only invoke a curator agent — with
          the specific findings, not the whole graph — when there&apos;s
          something to actually fix.
        </p>

        <h2 id="feed">Feed ranking</h2>
        <p>
          <code>createFeedEngine()</code> ranks content with a hybrid score —
          social proximity, interest-graph affinity (pulled from the same
          memory graph <code>upsert_fact</code> writes to), and log-scaled
          engagement — rather than pure follow-graph or raw like-count
          ranking.
        </p>
        <CodeBlock code={FEED_CODE} lang="ts" label="feed.ts" />

        <h2 id="pieces">The pieces</h2>
        <table>
          <thead>
            <tr>
              <th>Need</th>
              <th>Function</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Give an agent per-user long-term memory</td>
              <td>
                <code>enableGraphMemory()</code>
              </td>
            </tr>
            <tr>
              <td>Share one DB connection across many users</td>
              <td>
                <code>createGraphMemoryManager()</code>
              </td>
            </tr>
            <tr>
              <td>Inject memory into your main agent&apos;s turn</td>
              <td>
                <code>chatWithMemory()</code>
              </td>
            </tr>
            <tr>
              <td>Fade/prune stale facts</td>
              <td>
                <code>applyRecencyDecay()</code>
              </td>
            </tr>
            <tr>
              <td>Clean up duplicate/flat relationships</td>
              <td>
                <code>runSelfCorrection()</code> /{" "}
                <code>startSelfCorrectionLoop()</code>
              </td>
            </tr>
            <tr>
              <td>Rank content for a feed</td>
              <td>
                <code>createFeedEngine()</code>
              </td>
            </tr>
            <tr>
              <td>DB constraints + right-to-be-forgotten</td>
              <td>
                <code>ensureGraphConstraints()</code> /{" "}
                <code>deleteUserGraph()</code>
              </td>
            </tr>
            <tr>
              <td>Observability across all of the above</td>
              <td>
                <code>createMetricsCollector()</code>
              </td>
            </tr>
          </tbody>
        </table>

        <Callout tone="guard" title="Not run against a real Neo4j instance">
          Every graph-memory example and test in this repo runs against an
          injected fake driver. Run it against a real (even free-tier Aura)
          Neo4j instance before trusting it in production.
        </Callout>
      </DocPage>
      <DocPager current="/docs/graph-memory" />
    </>
  );
}
