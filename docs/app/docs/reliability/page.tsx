import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const RESILIENT_CODE = `import { createClient, anthropic, openai, createResilientProvider } from "samai-sdk";

// Both retries and fallback: each provider gets its own retries before falling through
const resilient = createResilientProvider(
  [anthropic({ apiKey: "..." }), openai({ apiKey: "..." })],
  {
    retry: { maxRetries: 2, initialDelayMs: 500 },
    fallback: {
      onFallback: ({ failedProvider, nextProvider }) =>
        console.warn(\`\${failedProvider} failed, falling back to \${nextProvider}\`),
    },
  }
);

const client = createClient({ provider: resilient });
const result = await client.generate({ model: "claude-sonnet-4-6", messages: [/* ... */] });`;

const TIMEOUT_CODE = `import { withTimeout, withRetry, anthropic } from "samai-sdk";

// Put timeout innermost so every retry attempt gets its own fresh window
const provider = withRetry(
  withTimeout(anthropic({ apiKey: "..." }), { timeoutMs: 15_000 }),
  { maxRetries: 2 }
);`;

const CONCURRENCY_CODE = `import { withConcurrencyLimit, withRateLimit, anthropic } from "samai-sdk";

// Caps in-flight calls — a QUEUE, not a rejection
const capped = withConcurrencyLimit(anthropic({ apiKey: "..." }), { maxConcurrent: 5 });

// Caps requests per time window — token-bucket, refills continuously
const throttled = withRateLimit(anthropic({ apiKey: "..." }), { maxRequests: 60, intervalMs: 60_000 });`;

const TRACE_CODE = `import { writeFileSync } from "node:fs";
import { runAgent, renderTraceHTML, exportRunTraceToOtel } from "samai-sdk";

const result = await runAgent(client, agent, "hi");

// Render as a self-contained, offline-viewable HTML timeline
writeFileSync("trace.json", JSON.stringify(result.trace));
writeFileSync("trace.html", renderTraceHTML(result.trace));

// Or export as real OpenTelemetry spans on your existing tracer
await exportRunTraceToOtel(result.trace); // needs the optional @opentelemetry/api peer dependency`;

const CLI_TRACE = `npx samai-sdk trace ./trace.json --port 4949
# ✅ Trace viewer running at http://localhost:4949`;

export default function ReliabilityPage() {
  return (
    <>
      <DocPage
        eyebrow="Production"
        title="Reliability & tracing"
        description="Retries, fallback chains, timeouts, concurrency limits, and full run tracing — all implemented as composable provider wrappers, not special-cased flags."
      >
        <h2 id="resilience">Retries and fallback chains</h2>
        <p>
          <code>withRetry()</code> and <code>withFallback([...])</code> wrap
          any provider — since they implement the same interface, they
          compose with guardrails, <code>generateObject()</code>, and
          streaming without special-casing.{" "}
          <code>createResilientProvider()</code> combines both:
        </p>
        <CodeBlock code={RESILIENT_CODE} lang="ts" label="resilience.ts" />
        <Callout tone="guard" title="Streaming note">
          Retries and fallback only apply <em>before</em> the first chunk
          reaches the caller. Once a stream has started yielding output, a
          later mid-stream failure surfaces as-is rather than silently
          restarting or switching providers — restarting would duplicate or
          drop output the caller already saw.
        </Callout>

        <h2 id="timeouts">Timeouts</h2>
        <p>
          <code>withTimeout()</code> enforces a real deadline using{" "}
          <code>AbortController</code> — not pattern-matching on error
          messages after the fact. <code>createResilientProvider()</code>{" "}
          applies a 30s default automatically.
        </p>
        <CodeBlock code={TIMEOUT_CODE} lang="ts" label="timeouts.ts" />
        <p>
          Tool execution gets its own independent timeout too — every{" "}
          <code>execute()</code> call is raced against a deadline (default
          30s, overridable per-tool or per-run). A hung tool comes back as
          an <code>isError</code> result instead of hanging the whole run.
        </p>

        <h2 id="concurrency">Concurrency and rate limiting</h2>
        <CodeBlock code={CONCURRENCY_CODE} lang="ts" label="concurrency.ts" />

        <h2 id="tracing">Tracing & observability</h2>
        <p>
          Every run already produces a <code>RunTrace</code> — every model
          call, tool call, retry, and handoff recorded with real timing.
          Turn that into something you can actually look at:
        </p>
        <CodeBlock code={TRACE_CODE} lang="ts" label="tracing.ts" />
        <p>
          Or skip the intermediate file and serve the same rendered page
          straight from the CLI:
        </p>
        <CodeBlock code={CLI_TRACE} lang="bash" label="terminal" />
      </DocPage>
      <DocPager current="/docs/reliability" />
    </>
  );
}
