import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const STEP1 = `import { z } from "zod";

const getWeather = {
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) =>
    \`18C and cloudy in \${city}\`,
};`;

const STEP2 = `import { createClient, anthropic } from "samai-sdk";

const client = createClient({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});`;

const STEP3 = `const result = await client.generate({
  model: "claude-sonnet-4-6",
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "What's the weather in Chennai?" }],
  tools: [getWeather],
  maxToolRoundtrips: 2,
});

console.log(result.text);`;

const AGENT_VERSION = `import { createClient, anthropic, defineAgent, defineTool, runAgent } from "samai-sdk";
import { z } from "zod";

const client = createClient({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const getWeather = defineTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => \`18°C and cloudy in \${city}\`,
});

const agent = defineAgent({
  name: "weather_agent",
  instructions: "Answer weather questions using get_weather.",
  model: "claude-sonnet-4-6",
  tools: [getWeather],
});

const result = await runAgent(client, agent, "What's the weather in Nairobi?");
console.log(result.output);`;

export default function QuickStartPage() {
  return (
    <>
      <DocPage
        eyebrow="Getting started"
        title="Quick start"
        description="Three pieces — a tool, a client, and a generate call — are enough for a working tool-calling assistant. Everything else in the SDK builds on this same shape."
      >
        <h2 id="define-a-tool">1. Define a tool</h2>
        <p>
          <code>parameters</code> accepts a zod schema (or any{" "}
          <a href="/docs/tools#valibot">Standard Schema V1 validator</a> like
          valibot) — <code>execute()</code>&apos;s argument types are
          inferred from it automatically.
        </p>
        <CodeBlock code={STEP1} lang="ts" label="tool.ts" />

        <h2 id="create-a-client">2. Create a client</h2>
        <p>
          A client pairs a <code>Provider</code> with any guardrails you
          want applied to every call. Swap <code>anthropic()</code> for any
          of the other 7 providers later without touching anything below.
        </p>
        <CodeBlock code={STEP2} lang="ts" label="client.ts" />

        <h2 id="generate">3. Generate</h2>
        <CodeBlock code={STEP3} lang="ts" label="run.ts" />
        <p>
          <code>maxToolRoundtrips</code> caps how many times the model can
          call a tool and read the result back before the call returns —
          raise it for multi-step tool use, lower it to force a quick
          answer.
        </p>

        <h2 id="agent-version">The agent-runtime version</h2>
        <p>
          <code>client.generate()</code> is the raw building block.{" "}
          <code>defineAgent()</code> + <code>runAgent()</code> is the same
          idea wrapped in the full runtime — reusable agent config, and
          access to handoffs, tracing, and streaming events for free:
        </p>
        <CodeBlock code={AGENT_VERSION} lang="ts" label="agent.ts" />

        <Callout tone="signal" title="Next">
          Continue to <a href="/docs/agents">Agents, handoffs & sessions</a>{" "}
          to see how multiple agents delegate to each other, and how
          conversation history persists across separate runs.
        </Callout>
      </DocPage>
      <DocPager current="/docs/quick-start" />
    </>
  );
}
