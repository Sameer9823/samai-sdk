import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import { createClient, anthropic, createUsageLedger } from "samai-sdk";

const ledger = createUsageLedger();
const provider = ledger.wrapProvider(
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  (options) => options.metadata?.sessionId as string | undefined
);
const client = createClient({ provider });

await client.generate({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "hi" }],
  metadata: { sessionId: "session-123" },
});

console.log(ledger.getStats("session-123"));
// { totalTokens, totalCostUsd, callCount, byModel: { "claude-sonnet-4-6": { ... } } }
console.log(ledger.getAllStats()); // every key seen so far
console.log(ledger.toJSON());      // JSON snapshot — feed this to a dashboard or log periodically`;

export default function UsageTrackingPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Usage tracking"
        description="createBudgetGuardrail() answers 'has this client exceeded its budget' with one running total. createUsageLedger() answers 'how much has each session/user cost so far' — cumulative tokens and estimated cost, broken down per key and per model."
      >
        <CodeBlock code={CODE} lang="ts" label="usage-ledger.ts" />

        <Callout tone="signal" title="Nothing is dropped silently">
          Calls where <code>keyFn</code> returns <code>undefined</code> are
          recorded under <code>&quot;_unattributed&quot;</code> rather than
          silently dropped. Pass <code>{"{"} onRecord {"}"}</code> to fire on
          every recorded call, and <code>{"{"} pricing {"}"}</code> to
          override the built-in per-model pricing table — provider pricing
          changes over time, so treat the defaults as illustrative. The
          ledger tracks numbers; rendering a dashboard from{" "}
          <code>toJSON()</code> is on you.
        </Callout>
      </DocPage>
      <DocPager current="/docs/usage-tracking" />
    </>
  );
}
