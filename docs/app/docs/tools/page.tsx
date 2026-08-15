import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const ZOD_TOOL = `import { defineTool } from "samai-sdk";
import { z } from "zod";

const getWeather = defineTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ city: z.string() }),
  // args is inferred as { city: string } — no manual typing
  execute: async ({ city }) => \`18°C and cloudy in \${city}\`,
});`;

const VALIBOT_TOOL = `import { defineTool } from "samai-sdk";
import * as v from "valibot";

const getWeather = defineTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: v.object({
    city: v.pipe(v.string(), v.minLength(1)),
    units: v.optional(v.picklist(["metric", "imperial"]), "metric"),
  }),
  // args is inferred from valibot's own output type, same as the zod path
  execute: async ({ city, units }) =>
    \`18\${units === "imperial" ? "F" : "C"} and cloudy in \${city}\`,
});`;

const APPROVAL_CODE = `const writeFile = defineTool({
  name: "write_file",
  description: "Write content to a file outside /tmp",
  parameters: z.object({ path: z.string(), content: z.string() }),
  execute: async ({ path, content }) => { /* ... */ },
  // require sign-off, always — or pass a predicate for conditional approval
  requiresApproval: true,
});

const result = await runAgent(client, agent, input, {
  onApprovalRequest: async ({ toolName, args }) => {
    // show a confirm dialog, check an allowlist, whatever your app needs
    return userConfirmedInUI;
  },
});`;

export default function ToolsPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Tools & schemas"
        description="defineTool() gives you full type inference from a schema — zod, or any Standard Schema V1 validator like valibot — with no manual typing or casts."
      >
        <h2 id="defining-tools">Defining a tool</h2>
        <p>
          A tool is a name, a description the model reads to decide when to
          call it, a schema describing its arguments, and an{" "}
          <code>execute()</code> function. Arguments are validated against
          the schema before <code>execute()</code> ever runs — an invalid
          call comes back as an <code>isError</code> tool result, not a
          crash.
        </p>
        <CodeBlock code={ZOD_TOOL} lang="ts" label="tool-zod.ts" />

        <h2 id="valibot">Standard Schema support (valibot, and others)</h2>
        <p>
          <code>parameters</code> also accepts any{" "}
          <a href="https://standardschema.dev" target="_blank" rel="noreferrer">
            Standard Schema V1
          </a>{" "}
          validator — valibot 0.31+/1.x is fully supported, including JSON
          Schema generation for the model-facing tool definition. Behavior
          is identical to the zod path in every other respect:
        </p>
        <CodeBlock code={VALIBOT_TOOL} lang="ts" label="tool-valibot.ts" />
        <p>
          This works the same way across all 8 provider adapters — each
          one&apos;s tool-conversion step resolves valibot&apos;s JSON Schema
          via the optional <code>@valibot/to-json-schema</code> peer
          dependency (<code>npm install @valibot/to-json-schema</code>).
        </p>

        <Callout tone="ok" title="Also Standard Schema-aware">
          <code>generateObject()</code>, <code>streamObject()</code>,{" "}
          <code>createSchemaGuardrail()</code>, and{" "}
          <code>Agent.outputSchema</code> all accept the same zod-or-Standard-Schema
          input. zod behavior is completely unchanged everywhere — this is
          purely additive.
        </Callout>

        <h2 id="approval">Requiring approval before execution</h2>
        <p>
          For a tool with real side effects — writing outside{" "}
          <code>/tmp</code>, sending an email, an MCP tool that mutates
          something — gate it behind human sign-off instead of letting it
          fire automatically:
        </p>
        <CodeBlock code={APPROVAL_CODE} lang="ts" label="approval.ts" />
        <p>
          If a call requires approval and no <code>onApprovalRequest</code>{" "}
          handler is supplied, the call is rejected by default — fail
          closed, not silently executed.
        </p>

        <h2 id="mcp-web-search">MCP tools & web search</h2>
        <p>
          <code>createMCPClient()</code> connects to any MCP server and
          exposes its tools as ordinary <code>ToolDefinition</code>s — mix
          them into an agent&apos;s <code>tools</code> array alongside
          locally-defined ones. <code>createWebSearchTool()</code> gives the
          model a real <code>web_search</code> tool backed by the Tavily or
          Brave search API — an actual HTTP request, not a stub.
        </p>
      </DocPage>
      <DocPager current="/docs/tools" />
    </>
  );
}
