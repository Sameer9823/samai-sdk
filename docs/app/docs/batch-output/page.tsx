import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const BATCH_CODE = `import { z } from "zod";
import { createClient, anthropic, generateObjectBatch } from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: "..." }) });
const TicketSchema = z.object({
  category: z.enum(["billing", "bug", "feature_request", "other"]),
  urgency: z.enum(["low", "medium", "high"]),
});

const batch = await generateObjectBatch(client, {
  items: ["My card was charged twice", "App crashes on launch"],
  buildOptions: (ticketText) => ({
    model: "claude-sonnet-4-6",
    schema: TicketSchema,
    messages: [{ role: "user", content: \`Classify: "\${ticketText}"\` }],
  }),
  concurrency: 5, // default 5
  onItemSettled: (item) => console.log(\`item \${item.index}: \${item.status}\`),
});

console.log(\`\${batch.succeeded}/\${batch.results.length} succeeded\`, batch.usage);
for (const r of batch.results) {
  if (r.status === "fulfilled") console.log(r.item, "->", r.result.object);
  else console.warn(r.item, "failed:", r.error.message);
}`;

const VALIBOT_CODE = `import * as v from "valibot";
import { createClient, anthropic, generateObject } from "samai-sdk";

const ReviewSchema = v.object({
  summary: v.string(),
  score: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
});

const result = await generateObject(client, {
  model: "claude-sonnet-4-6",
  schema: ReviewSchema, // a valibot schema — works exactly the same way as zod
  messages: [{ role: "user", content: "Extract structured data from this review: ..." }],
});

result.object.score; // fully typed via valibot's own inference`;

export default function BatchOutputPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Batch output & Standard Schema"
        description="generateObjectBatch() runs generateObject() across many inputs with bounded concurrency — the shape of a data-extraction pipeline. Anywhere the SDK takes a schema, you can pass zod or any Standard Schema V1 validator."
      >
        <h2 id="batch">generateObjectBatch()</h2>
        <p>
          One bad input never aborts the rest of the batch; results come
          back in the same order as <code>items</code> regardless of
          completion order.
        </p>
        <CodeBlock code={BATCH_CODE} lang="ts" label="batch.ts" />

        <Callout tone="signal" title="Failing loudly on purpose">
          Pass <code>throwOnAnyFailure: true</code> to throw a{" "}
          <code>GenerateObjectBatchError</code> (carrying the full{" "}
          <code>batchResult</code>, including successful items) once every
          item has settled if any failed. For a concurrency cap shared
          across unrelated calls too, wrap the provider in{" "}
          <a href="/docs/concurrency">withConcurrencyLimit()</a> instead —
          the two compose.
        </Callout>

        <h2 id="standard-schema">Standard Schema support</h2>
        <p>
          Anywhere the SDK takes a schema — <code>generateObject()</code>,{" "}
          <code>streamObject()</code>, <code>createSchemaGuardrail()</code>,{" "}
          <code>Agent.outputSchema</code> — you can pass a zod schema, or
          any{" "}
          <a href="https://standardschema.dev" target="_blank" rel="noopener noreferrer">
            Standard Schema V1
          </a>{" "}
          validator (valibot 0.31+/1.x, arktype, etc.) instead. zod behavior
          is unchanged; this is purely additive.
        </p>
        <CodeBlock code={VALIBOT_CODE} lang="ts" label="valibot.ts" />

        <Callout tone="guard" title="Known limitation">
          Validation needs no extra dependency. Generating the model-facing
          JSON-Schema instruction currently supports zod and valibot
          specifically — valibot needs the optional{" "}
          <code>@valibot/to-json-schema</code> peer dependency. Other
          Standard Schema vendors work for validation but need you to
          describe the output shape yourself via <code>system</code>. Tool{" "}
          <code>parameters</code> across the 8 provider adapters still
          require a zod schema specifically.
        </Callout>
      </DocPage>
      <DocPager current="/docs/batch-output" />
    </>
  );
}
