import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const BUILTIN_CODE = `import {
  createClient,
  openai,
  createPiiInputGuardrail,
  createPromptInjectionGuardrail,
  createBudgetGuardrail,
} from "samai-sdk";

const budget = createBudgetGuardrail({ maxCostUsd: 5.0 });

const client = createClient({
  provider: openai({ apiKey: "..." }),
  inputGuardrails: [
    createPiiInputGuardrail({ mode: "redact" }),       // scrub PII before it's sent
    createPromptInjectionGuardrail({ mode: "block" }),  // reject jailbreak attempts
    budget.inputGuardrail,                              // reject once budget is spent
  ],
  outputGuardrails: [
    budget.outputGuardrail, // records cost after every call
  ],
});

console.log(budget.getStats()); // { totalTokens, totalCostUsd }`;

const CUSTOM_CODE = `const client = createClient({
  provider: openai({ apiKey: "..." }),
  inputGuardrails: [
    async ({ messages }) => {
      const last = messages.at(-1);
      const text = typeof last?.content === "string" ? last.content : "";
      if (text.includes("secret-password")) {
        return { allowed: false, reason: "contains sensitive term" };
      }
      return { allowed: true };
    },
  ],
});`;

const SCHEMA_CODE = `import { createSchemaGuardrail } from "samai-sdk";
import { z } from "zod";

const client = createClient({
  provider: anthropic({ apiKey: "..." }),
  outputGuardrails: [
    createSchemaGuardrail(z.object({ summary: z.string(), score: z.number() })),
  ],
});

const result = await client.generate({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Return JSON: {summary, score} for this review: ..." }],
});

console.log(result.object); // typed, validated object`;

export default function GuardrailsPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Guardrails & approval"
        description="Built-in guardrails cover the common cases — PII, prompt injection, budget caps, schema validation — and a custom one is just a function you write."
      >
        <h2 id="built-in">Built-in guardrails</h2>
        <CodeBlock code={BUILTIN_CODE} lang="ts" label="guardrails.ts" />
        <p>
          Guardrails run on every call made through the client — nothing
          extra to remember to add per request. Input guardrails can reject
          a call before it reaches the model; output guardrails run after,
          and can also just observe (like <code>budget.outputGuardrail</code>{" "}
          recording cost).
        </p>

        <h2 id="custom">Writing a custom guardrail</h2>
        <p>
          An <code>InputGuardrail</code> or <code>OutputGuardrail</code> is
          just an async function matching a small signature — no base class,
          no registration step:
        </p>
        <CodeBlock code={CUSTOM_CODE} lang="ts" label="custom-guardrail.ts" />

        <h2 id="schema">Validating structured output</h2>
        <p>
          <code>createSchemaGuardrail()</code> checks the model&apos;s
          output against a schema — zod, or any Standard Schema V1 validator
          — and attaches the parsed, typed result to <code>result.object</code>:
        </p>
        <CodeBlock code={SCHEMA_CODE} lang="ts" label="schema-guardrail.ts" />

        <Callout tone="guard" title="Fail closed by default">
          A tool marked <code>requiresApproval</code> is rejected if no{" "}
          <code>onApprovalRequest</code> handler is configured — see{" "}
          <a href="/docs/tools#approval">Tools & schemas</a> for the approval
          workflow itself.
        </Callout>
      </DocPage>
      <DocPager current="/docs/guardrails" />
    </>
  );
}
