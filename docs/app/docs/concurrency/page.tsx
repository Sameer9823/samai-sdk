import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import { withConcurrencyLimit, withRateLimit, withRetry, anthropic } from "samai-sdk";

// Caps in-flight calls — a queue, not a rejection.
const capped = withConcurrencyLimit(anthropic({ apiKey: "..." }), { maxConcurrent: 5 });

// Caps requests per time window — a token-bucket limiter, refills continuously.
const throttled = withRateLimit(anthropic({ apiKey: "..." }), { maxRequests: 60, intervalMs: 60_000 });

// Compose with retries — wrapping the limit AROUND retry means retries of the same call
// count against the limit too (usually what you want).
const provider = withConcurrencyLimit(
  withRetry(anthropic({ apiKey: "..." }), { maxRetries: 2 }),
  { maxConcurrent: 5 }
);`;

export default function ConcurrencyPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Concurrency & rate limiting"
        description="Two provider wrappers, same shape as withRetry/withFallback/withTimeout — compose all of them freely. Both queue calls beyond the limit rather than rejecting."
      >
        <CodeBlock code={CODE} lang="ts" label="concurrency.ts" />

        <p>
          Use <code>withConcurrencyLimit()</code> to stay under a
          provider&apos;s hard concurrent-request cap when running many
          agents (or a{" "}
          <a href="/docs/batch-output#batch">generateObjectBatch()</a>) at
          once. Use <code>withRateLimit()</code> to stay under a published
          requests-per-minute limit before it turns into 429s that{" "}
          <code>withRetry</code> then has to spend time recovering from.
        </p>

        <Callout tone="signal" title="Order matters">
          Wrapping <code>withConcurrencyLimit()</code> around{" "}
          <code>withRetry()</code> means each retry attempt of a call also
          counts against the concurrency cap — usually what you want, since
          it prevents a burst of retries from silently exceeding your
          provider&apos;s limit.
        </Callout>
      </DocPage>
      <DocPager current="/docs/concurrency" />
    </>
  );
}
