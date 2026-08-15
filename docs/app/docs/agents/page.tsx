import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const HANDOFF_CODE = `import { z } from "zod";
import { createClient, anthropic, defineAgent, runAgent } from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: "..." }) });

const getWeather = {
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => \`18C and cloudy in \${city}\`,
};

const packingAgent = defineAgent({
  name: "packing_specialist",
  instructions: "Give concise packing advice based on the weather already in the conversation.",
  model: "claude-sonnet-4-6",
});

const routerAgent = defineAgent({
  name: "trip_router",
  instructions: "Look up weather with get_weather, then hand off to packing_specialist.",
  model: "claude-sonnet-4-6",
  tools: [getWeather],
  handoffs: [packingAgent], // <- agents this one is allowed to delegate to
});

const result = await runAgent(client, routerAgent, "What should I pack for Tokyo?");

console.log(result.output);          // packing_specialist's final answer
console.log(result.finalAgent);      // "packing_specialist" — may differ from the starting agent
console.log(result.trace.agentPath); // ["trip_router", "packing_specialist"]`;

const STREAM_CODE = `import { runAgentStream } from "samai-sdk";

for await (const event of runAgentStream(client, routerAgent, "What should I pack for Tokyo?")) {
  switch (event.type) {
    case "text-delta": process.stdout.write(event.textDelta); break;
    case "tool-started": console.log("calling", event.toolName, event.args); break;
    case "tool-completed": console.log("tool result", event.result); break;
    case "handoff-started": console.log(\`\${event.fromAgent} -> \${event.toAgent}: \${event.reason}\`); break;
    case "guardrail-triggered": console.warn(\`\${event.stage} guardrail blocked: \${event.reason}\`); break;
    case "run-completed": console.log("done", event.usage); break;
    case "run-failed": console.error(event.error); break;
  }
}`;

const ERROR_CODE = `try {
  await runAgent(client, routerAgent, input);
} catch (err) {
  if (err instanceof AgentRunError) {
    console.error(err.cause);        // HandoffLoopError, MaxTurnsExceededError, etc.
    console.error(err.trace.events); // full trace up to the failure point
  }
}`;

const SESSION_CODE = `import {
  createSession,
  InMemorySessionStore,
  FileSessionStore,
  RedisSessionStore,
  SqliteSessionStore,
} from "samai-sdk";

// In-memory — lives for the process lifetime, good for scripts/tests
const session = createSession("user-123", new InMemorySessionStore());

// Or persist to disk as JSON — survives process restarts, no extra infra
const fileSession = createSession("user-123", new FileSessionStore("./sessions"));

// Or persist to Redis — shared across processes/instances, with optional TTL
// Requires the optional \`ioredis\` peer dependency
const redisSession = createSession(
  "user-123",
  new RedisSessionStore({ url: process.env.REDIS_URL, ttlSeconds: 60 * 60 * 24 })
);`;

export default function AgentsPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Agents, handoffs & sessions"
        description="defineAgent() bundles instructions, model, tools, and optional handoffs into one reusable unit. The run loop owns tool execution and multi-turn orchestration itself, so behavior is identical no matter which provider backs each agent."
      >
        <h2 id="defining-agents">Defining and delegating between agents</h2>
        <p>
          Any agent listed in another agent&apos;s <code>handoffs</code>{" "}
          becomes callable as a synthetic tool the model can invoke like any
          other tool call. The run loop intercepts these before normal tool
          execution, switches the active agent, and carries the full message
          history forward — the new agent sees everything that happened
          before the handoff.
        </p>
        <CodeBlock code={HANDOFF_CODE} lang="ts" label="handoff.ts" />

        <h2 id="streaming-events">Streaming events</h2>
        <p>
          <code>runAgent()</code> drains the run and returns the final
          result. For live updates — driving a chat UI, say — use{" "}
          <code>runAgentStream()</code> directly and consume its events:
        </p>
        <CodeBlock code={STREAM_CODE} lang="ts" label="stream.ts" />

        <h2 id="loop-prevention">Loop prevention</h2>
        <p>
          To stop infinite delegation (A → B → A → B → ...), the run loop
          tracks every agent visited during a run: handing off to an
          already-visited agent throws <code>HandoffLoopError</code>, and a
          hard <code>maxHandoffs</code> cap (default 5, override via{" "}
          <code>runAgent(client, agent, input, {"{"} maxHandoffs: 10 {"}"})</code>
          ) catches runaway delegation even across distinct agents. Both are
          wrapped in an <code>AgentRunError</code> that also carries the
          trace collected up to the point of failure:
        </p>
        <CodeBlock code={ERROR_CODE} lang="ts" label="error-handling.ts" />

        <h2 id="sessions">Sessions (memory)</h2>
        <p>
          A <code>Session</code> persists conversation history across
          separate <code>runAgent()</code> calls — kept deliberately distinct
          from <code>defineAgent()</code>&apos;s static config and the
          transient message list a single run builds internally.
        </p>
        <CodeBlock code={SESSION_CODE} lang="ts" label="sessions.ts" />

        <Callout tone="signal" title="Tracing is always on">
          Every <code>runAgent()</code> call produces a <code>RunTrace</code>{" "}
          for free — see <a href="/docs/reliability#tracing">Reliability & tracing</a>{" "}
          for exporting it to OpenTelemetry or rendering it as an HTML
          timeline.
        </Callout>
      </DocPage>
      <DocPager current="/docs/agents" />
    </>
  );
}
