import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const SNIPPET = `import { createClient, anthropic, defineTool } from "samai-sdk";
import { z } from "zod";

const getWeather = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 28, condition: "sunny" }),
});

const client = createClient({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const result = await client.generate({
  model: "claude-sonnet-4-6",
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "What's the weather in Chennai?" }],
  tools: [getWeather],
  maxToolRoundtrips: 2,
});

console.log(result.text);`;

export default function IntroductionPage() {
  return (
    <>
    <DocPage
      eyebrow="Getting started"
      title="Introduction"
      description="samai-sdk is a TypeScript agent SDK that unifies 8 model providers behind one interface, then layers the agent runtime — tool calling, handoffs, guardrails, sessions, tracing — on top."
    >
      <p>
        Most SDKs for working with language models stop at the API call: send
        messages, get a completion, maybe call a tool. Everything past that —
        validating tool arguments, deciding when to hand a conversation off
        to a specialist, blocking a jailbreak attempt, remembering what a
        user said last week, figuring out why a run failed at 2am — gets
        rebuilt by hand, differently, in every project that needs it.
      </p>
      <p>
        samai-sdk starts from the assumption that you&apos;ll eventually need
        that layer, so it ships with the runtime already wired in, on top of
        a single <code>Provider</code> interface implemented identically by
        Anthropic, OpenAI, Google Gemini, AWS Bedrock, Groq, Mistral, Azure
        OpenAI, and Ollama.
      </p>

      <h2 id="one-call">A single call, fully wired</h2>
      <p>
        A tool, a provider, and a generate call — this is the whole surface
        area for a basic agent. Swapping <code>anthropic()</code> for{" "}
        <code>openai()</code> later changes nothing else.
      </p>
      <CodeBlock code={SNIPPET} lang="ts" label="quick-look.ts" />

      <h2 id="what-you-get">What&apos;s actually in the box</h2>
      <ul>
        <li>
          <strong>One interface, 8 providers</strong> — Anthropic, OpenAI,
          Google, AWS Bedrock, Groq, Mistral, Azure OpenAI, and Ollama, all
          implementing the same <code>Provider</code> contract.
        </li>
        <li>
          <strong>A real agent runtime</strong> —{" "}
          <code>defineAgent()</code>, multi-agent handoffs with loop
          prevention, and a run loop that owns tool execution itself so
          behavior doesn&apos;t vary by provider.
        </li>
        <li>
          <strong>Guardrails and approval</strong> — PII redaction,
          prompt-injection blocking, budget caps, schema validation on
          output, and a fail-closed approval gate for risky tools.
        </li>
        <li>
          <strong>Typed tools</strong> — <code>defineTool()</code> infers
          argument types from a zod or valibot schema, and validates
          incoming args before your code runs.
        </li>
        <li>
          <strong>Sessions, RAG, MCP, and graph memory</strong> — in-memory,
          file, Redis, or SQLite session persistence; a retrieval pipeline
          for grounding agents in your documents; a client for any MCP
          server; and a Neo4j-backed per-user knowledge graph for long-term
          memory that survives across sessions.
        </li>
        <li>
          <strong>Production concerns, not afterthoughts</strong> — retries,
          fallback chains, timeouts, concurrency/rate limiting, checkpoint
          resume, and full run tracing with an OpenTelemetry export and a
          local HTML trace viewer.
        </li>
      </ul>

      <Callout tone="signal" title="Where to go next">
        If you just want the code running,{" "}
        <a href="/docs/quick-start">Quick start</a> gets you there fastest.
        For a tour of what a production agent actually needs, start with{" "}
        <a href="/docs/agents">Agents, handoffs & sessions</a>.
      </Callout>
    </DocPage>
    <DocPager current="/docs" />
    </>
  );
}
