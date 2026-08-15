import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const GENERATE_OBJECT = `import { z } from "zod";
import { createClient, anthropic, generateObject } from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: "..." }) });

const ReviewSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "negative", "mixed"]),
  score: z.number().min(1).max(5),
});

const result = await generateObject(client, {
  model: "claude-sonnet-4-6",
  schema: ReviewSchema,
  messages: [{ role: "user", content: "Extract structured data from this review: ..." }],
});

result.object.sentiment; // fully typed: "positive" | "negative" | "mixed"
result.attempts;         // how many tries it took (1 = first try succeeded)
result.usage;             // total tokens summed across all attempts, including failed ones`;

const BATCH_CODE = `const tickets = ["My card was charged twice", "App crashes on launch", "Please add dark mode"];

const batch = await generateObjectBatch(client, {
  items: tickets,
  buildOptions: (ticketText) => ({
    model: "claude-sonnet-4-6",
    schema: TicketSchema,
    messages: [{ role: "user", content: \`Classify this support ticket: "\${ticketText}"\` }],
  }),
  concurrency: 5, // max calls in flight at once, default 5
  onItemSettled: (item) => console.log(\`Ticket \${item.index}: \${item.status}\`),
});

console.log(\`\${batch.succeeded}/\${batch.results.length} succeeded\`);

for (const r of batch.results) {
  if (r.status === "fulfilled") console.log(r.item, "->", r.result.object);
  else console.warn(r.item, "failed:", r.error.message);
}`;

const VALIBOT_OBJECT = `import * as v from "valibot";
import { createClient, anthropic, generateObject } from "samai-sdk";

const ReviewSchema = v.object({
  summary: v.string(),
  score: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
});

const result = await generateObject(client, {
  model: "claude-sonnet-4-6",
  schema: ReviewSchema, // a valibot schema, not zod — works exactly the same way
  messages: [{ role: "user", content: "Extract structured data from this review: ..." }],
});

result.object.score; // fully typed via valibot's own type inference`;

export default function StructuredOutputPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Structured output"
        description="generateObject() and streamObject() guarantee a typed, schema-validated object — with an automatic repair prompt when the model's output doesn't match, not just hopeful JSON.parse()."
      >
        <h2 id="generate-object">generateObject()</h2>
        <p>
          If the model&apos;s output fails validation, it&apos;s
          automatically retried with a repair prompt describing exactly what
          was wrong, up to <code>maxRepairAttempts</code> times (default 2).
          If it never succeeds, it throws a <code>GenerateObjectError</code>{" "}
          with <code>.attempts</code> and <code>.lastError</code> so you can
          log or fall back gracefully.
        </p>
        <CodeBlock code={GENERATE_OBJECT} lang="ts" label="generate-object.ts" />
        <p>
          Works identically across every provider — validation happens on
          your side via the schema, not provider-specific JSON modes, so
          there&apos;s nothing extra to configure per provider.
        </p>

        <h2 id="batch">Batch extraction with generateObjectBatch()</h2>
        <p>
          Runs <code>generateObject()</code> across many inputs with bounded
          concurrency — the shape of a data-extraction pipeline like
          &quot;classify these 500 support tickets&quot;. One bad input
          never aborts the rest of the batch, and results come back in the
          same order as <code>items</code> regardless of completion order.
        </p>
        <CodeBlock code={BATCH_CODE} lang="ts" label="batch.ts" />
        <p>
          Pass <code>throwOnAnyFailure: true</code> to instead throw a{" "}
          <code>GenerateObjectBatchError</code> once every item has settled
          if any failed — it carries the full <code>batchResult</code> on{" "}
          <code>.batchResult</code>, so you don&apos;t lose completed work
          just because one item failed.
        </p>

        <h2 id="valibot">Using valibot instead of zod</h2>
        <p>
          <code>schema</code> accepts any Standard Schema V1 validator —
          zod behavior is completely unchanged, this is purely additive:
        </p>
        <CodeBlock code={VALIBOT_OBJECT} lang="ts" label="valibot.ts" />

        <Callout tone="signal" title="Streaming version">
          <code>streamObject()</code> gives you the same guarantee with
          incremental partial-object updates as the model streams — useful
          for driving a UI that fills in fields as they arrive.
        </Callout>
      </DocPage>
      <DocPager current="/docs/structured-output" />
    </>
  );
}
