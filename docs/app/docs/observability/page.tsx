import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const OTEL_CODE = `import { runAgent, exportRunTraceToOtel } from "samai-sdk";

const result = await runAgent(client, agent, "hi");
await exportRunTraceToOtel(result.trace); // needs the optional @opentelemetry/api peer dependency

// Now visible wherever your traces already go — Honeycomb, Datadog, Grafana Tempo, or
// anything else that speaks OTLP, using whatever exporter/provider you've already set up.`;

const HTML_CODE = `import { writeFileSync } from "node:fs";
import { runAgent, renderTraceHTML } from "samai-sdk";

const result = await runAgent(client, agent, "hi");
writeFileSync("trace.html", renderTraceHTML(result.trace)); // open directly in a browser`;

const CLI_CODE = `npx samai-sdk trace ./trace.json --port 4949
# ✅ Trace viewer running at http://localhost:4949`;

export default function ObservabilityPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="OpenTelemetry & trace viewer"
        description="Every run already produces a RunTrace — these two features turn that data into something you can look at or pipe into existing infra."
      >
        <h2 id="otel">exportRunTraceToOtel()</h2>
        <p>
          Converts a <code>RunTrace</code> into real OpenTelemetry spans on
          whatever tracer your app has already configured. Model calls and
          tool calls become duration spans (paired from the trace&apos;s
          start/end events, so they carry real timing); handoffs, retries,
          fallbacks, timeouts, guardrail trips, and approvals become short
          child spans — all correctly parented under one root span per run.
        </p>
        <CodeBlock code={OTEL_CODE} lang="ts" label="otel-export.ts" />

        <h2 id="html-viewer">renderTraceHTML() + samai-sdk trace</h2>
        <p>
          Renders a <code>RunTrace</code> as a self-contained,
          offline-viewable HTML timeline — no server, no build step,
          color-coded events proportionally positioned by real elapsed
          time, filterable by type, raw JSON available inline.
        </p>
        <CodeBlock code={HTML_CODE} lang="ts" label="trace-html.ts" />
        <CodeBlock code={CLI_CODE} lang="bash" label="terminal" />

        <Callout tone="signal" title="Verified end to end">
          The OTel export is checked against the real{" "}
          <code>@opentelemetry/sdk-trace-base</code> in-memory exporter —
          actual span names, attributes, parent/child nesting, and status
          codes. The trace viewer starts the real CLI server and fetches
          from it over HTTP. Voice events (<code>voice-turn</code> /{" "}
          <code>interruption</code> / <code>clarification</code> / <code>goal-update</code>) are included as short
          child spans / timeline entries — no extra setup.
        </Callout>

        <h2 id="voice-tracing">Voice tracing</h2>
        <p>
          Every <code>VoiceAgentEvent</code> also records into <code>RunTrace</code> — the same trace the agent loop
          already uses. That means <code>exportRunTraceToOtel()</code> and <code>renderTraceHTML()</code> work for voice
          sessions unchanged; interruptions, clarifications, and goal updates show up as spans / timeline entries
          alongside model and tool calls.
        </p>
        <CodeBlock
          code={`import { exportRunTraceToOtel, renderTraceHTML } from "samai-sdk";
import { writeFileSync } from "node:fs";
const session = await pipelineVoice({ stt, llm, tts }).connect({ agent, session: memSession });
// ... drive the session via stt.simulateTranscript(...)
await exportRunTraceToOtel((session as any)._trace);
writeFileSync("voice-trace.html", renderTraceHTML((session as any)._trace));`}
          lang="ts"
          label="voice-tracing.ts"
        />
      </DocPage>
      <DocPager current="/docs/observability" />
    </>
  );
}
