import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const STDIO_CODE = `import { createClient, anthropic, defineAgent, runAgent, createMCPClient } from "samai-sdk";

// Local server, spawned as a child process over stdio:
const filesystem = createMCPClient({
  transport: { transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] },
  toolPrefix: "fs", // avoids name collisions if you wire up more than one MCP server
});

const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });

const agent = defineAgent({
  name: "file_assistant",
  instructions: "Help the user inspect and organize files in /tmp using the fs__ tools.",
  model: "claude-sonnet-4-6",
  tools: await filesystem.tools(),
});

const result = await runAgent(client, agent, "What files are in /tmp?");
await filesystem.close(); // kills the spawned process`;

const HTTP_CODE = `const acme = createMCPClient({
  transport: { transport: "http", url: "https://mcp.acme.com/mcp", headers: { Authorization: \`Bearer \${token}\` } },
  toolPrefix: "acme",
});`;

const APPROVAL_CODE = `const acme = createMCPClient({
  transport: { transport: "http", url: "https://mcp.acme.com/mcp" },
  toolPrefix: "acme",
  requiresApproval: (toolName, args) => toolName === "acme__delete_record",
});`;

export default function McpPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="MCP (Model Context Protocol)"
        description="createMCPClient() connects to any MCP server and exposes its tools as ordinary ToolDefinitions — mix them into an agent's tools array alongside locally-defined tools, createWebSearchTool(), whatever."
      >
        <p>
          Needs the optional <code>@modelcontextprotocol/sdk</code> peer
          dependency (<code>npm install @modelcontextprotocol/sdk</code>).
        </p>

        <h2 id="stdio">Local servers over stdio</h2>
        <p>
          A local MCP server spawned as a child process — its tools become
          part of the agent&apos;s normal tool list:
        </p>
        <CodeBlock code={STDIO_CODE} lang="ts" label="mcp-stdio.ts" />

        <h2 id="remote">Remote servers over HTTP / SSE</h2>
        <p>
          Remote servers work the same way, over the current Streamable HTTP
          transport (or legacy SSE, for older servers):
        </p>
        <CodeBlock code={HTTP_CODE} lang="ts" label="mcp-http.ts" />

        <h2 id="approval">Gating MCP tools behind approval</h2>
        <p>
          Pass <code>requiresApproval</code> (boolean, or{" "}
          <code>(toolName, args) =&gt; boolean | Promise&lt;boolean&gt;</code>
          ) to gate every tool from a server behind the same approval flow as
          any other tool — see{" "}
          <a href="/docs/guardrails#approval">Guardrails &amp; approval</a>.
        </p>
        <CodeBlock code={APPROVAL_CODE} lang="ts" label="mcp-approval.ts" />

        <Callout tone="signal" title="Schemas pass through untouched">
          Each MCP tool&apos;s JSON Schema reaches the model exactly as the
          server declares it (via <code>ToolDefinition.rawJsonSchema</code>,
          an escape hatch every built-in provider adapter checks first) —
          nothing is lost round-tripping through zod. Argument validation
          before a call reaches the server is a permissive &ldquo;is this an
          object&rdquo; check, since the server itself is the source of truth
          for its own schema. Call results come back as{" "}
          <code>structuredContent</code> when the server provides it,
          otherwise as flattened text.
        </Callout>
      </DocPage>
      <DocPager current="/docs/mcp" />
    </>
  );
}
