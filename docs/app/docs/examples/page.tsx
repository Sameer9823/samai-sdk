import { DocPage, DocPager } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const RUN_CODE = `npm run example:basic
npm run example:agent-handoff                    # needs ANTHROPIC_API_KEY
npm run example:agent-runtime-mock-test          # no API key needed
npm run example:reliability-mock-test            # no API key needed
npm run example:resilience-tracing-mock-test     # no API key needed
npm run example:session-stores-mock-test         # no API key needed
npm run example:checkpoint-resume-mock-test      # no API key needed
npm run example:otel-export-mock-test            # no API key needed
npm run example:graph-memory-mock-test           # no API key needed
npm test                                         # runs all 28 mock-test suites together`;

const EXAMPLES: [string, string][] = [
  ["examples/basic.ts", "Minimal createClient() + tool call round-trip against a real provider."],
  ["examples/agent-handoff.ts", "Two agents, a real provider, one handing off packing advice to the other."],
  ["examples/agent-runtime-mock-test.ts", "Tool calls, handoffs, loop prevention, and session persistence — no API key needed."],
  ["examples/agent-structured-output-mock-test.ts", "generateObject() validate + repair loop — no API key needed."],
  ["examples/reliability-mock-test.ts", "withTimeout(), tool guardrails, and the full approval workflow — no API key needed."],
  ["examples/resilience-tracing-mock-test.ts", "Retries, fallbacks, and timeouts exercised against real wrappers, asserted visible in RunTrace."],
  ["examples/session-stores-mock-test.ts", "SqliteSessionStore against a real on-disk database, plus RedisSessionStore logic."],
  ["examples/provider-conversion-mock-test.ts", "Bedrock/Anthropic message + prompt-caching conversion logic — no API key needed."],
  ["examples/rag-mock-test.ts", "Vector store + retrieval tool, embed → search → return, end to end — no API key needed."],
  ["examples/cli-mock-test.ts", "Runs the real built CLI binary, typechecks the scaffolded output."],
  ["examples/checkpoint-resume-mock-test.ts", "Genuine simulated crash mid-run + resume, proves no tool call is re-executed."],
  ["examples/testing-utils-mock-test.ts", "createMockProvider(), withConcurrencyLimit(), withRateLimit() — real timing assertions."],
  ["examples/otel-export-mock-test.ts", "exportRunTraceToOtel() against the real @opentelemetry/sdk-trace-base in-memory exporter."],
  ["examples/trace-viewer-mock-test.ts", "renderTraceHTML() content + the real CLI trace server, fetched over HTTP."],
  ["examples/generate-object.ts", "generateObject() against a real provider with a zod schema."],
  ["examples/stream-object.ts", "streamObject() driving a progressively-filled UI card."],
  ["examples/react-usage.tsx", "useAgent() driving a chat component end to end."],
  ["examples/vue-usage-mock-test.ts", "Vue useAgent() against real Vue reactivity."],
  ["examples/svelte-usage-mock-test.ts", "Svelte useAgent() against a real store subscription."],
  ["examples/graph-memory-mock-test.ts", "enableGraphMemory() sweep -> tool call -> fake driver, asserted end to end."],
  ["examples/graph-memory-self-correction-mock-test.ts", "Plants duplicate nodes/generic relations/overload; curator's fix asserted against the driver."],
  ["examples/graph-memory-self-correction-clean-mock-test.ts", "A clean graph correctly skips the curator entirely."],
  ["examples/graph-memory-feed-engine-mock-test.ts", "Hybrid ranking: a low-like post with social+interest match outranks raw virality."],
  ["examples/graph-memory-admin-mock-test.ts", "DB uniqueness constraints + deleteUserGraph(), both shallow and deep modes."],
  ["examples/graph-memory-fact-lifecycle-mock-test.ts", "upsert_fact timestamping/contradictions, decay math, and an actual injection attempt rejected."],
  ["examples/graph-memory-metrics-mock-test.ts", "createMetricsCollector() aggregation across every recorded event, asserted numerically."],
  ["examples/graph-memory-manager-mock-test.ts", "Shared driver across users, cached per-user, closed exactly once on stopAll()."],
];

export default function ExamplesPage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="Examples"
        description="Every example in the repo, and whether it needs a real API key. The *-mock-test.ts files run against createMockProvider() or real local infrastructure (SQLite, a mock WebSocket server, the built CLI) — no external calls, no API key."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map(([file, desc]) => (
            <div
              key={file}
              className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4"
            >
              <code className="text-[13px] text-[var(--guard-400)]">{file}</code>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <h2 id="running">Running them</h2>
        <CodeBlock code={RUN_CODE} lang="bash" label="terminal" />
      </DocPage>
      <DocPager current="/docs/examples" />
    </>
  );
}
