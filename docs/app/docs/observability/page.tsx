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
          from it over HTTP.
        </Callout>
      </DocPage>
      <DocPager current="/docs/observability" />
    </>
  );
}
