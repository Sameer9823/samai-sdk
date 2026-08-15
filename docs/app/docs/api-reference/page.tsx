import { DocPage, DocPager } from "@/components/DocPage";

const ROWS: [string, string][] = [
  ["createClient(opts)", "Wraps a provider with input/output guardrail middleware"],
  ["defineTool(tool)", "Type-checked tool definition helper"],
  ["defineAgent(config)", "Bundles instructions/model/tools/handoffs/guardrails/schema"],
  ["runAgent(client, agent, input, opts?)", "Runs an agent to completion, returns RunResult"],
  ["runAgentStream(client, agent, input, opts?)", "Same, but yields AgentEvents as it goes"],
  ["resumeAgent / resumeAgentStream", "Resume a run from a RunCheckpoint after a crash"],
  ["InMemoryCheckpointStore / FileCheckpointStore", "Built-in RunCheckpointStore implementations"],
  ["generateObject(client, opts)", "Typed, schema-validated output with auto-repair"],
  ["streamObject(client, opts)", "Streamed typed output, no auto-repair"],
  ["generateObjectBatch(client, opts)", "Bounded-concurrency generateObject() across many inputs"],
  ["createSession(id, store)", "Persistent cross-run conversation memory"],
  ["InMemorySessionStore / FileSessionStore", "Built-in SessionStore implementations (no extra infra)"],
  ["RedisSessionStore / SqliteSessionStore", "Session stores backed by Redis / SQLite (optional peer deps)"],
  ["createWebSearchTool(opts?)", "Real Tavily/Brave-backed web_search tool"],
  ["createMCPClient(opts)", "Connects to an MCP server, returns tools via .tools()"],
  ["createSandbox(opts?)", "Isolated temp directory + real code execution/file I/O"],
  ["createCodeExecutionTool(opts?) / createSandboxTools(sandbox?)", "Wrap a Sandbox as agent tools"],
  ["generateSpeech(opts) / transcribeAudio(opts)", "OpenAI TTS/Whisper REST wrappers"],
  ["createRealtimeSession(opts?)", "WebSocket session against OpenAI's Realtime API"],
  ["InMemoryVectorStore / PineconeVectorStore", "Built-in VectorStore implementations"],
  ["openaiEmbeddings()", "Default EmbeddingProvider"],
  ["createRetrievalTool(opts) / embedChunks()", "Wires embeddings + a vector store into a RAG tool"],
  ["createDangerousToolGuardrail(opts?)", "Built-in tool guardrail for common destructive patterns"],
  ["createPiiInputGuardrail / createPiiOutputGuardrail", "Detect/redact PII"],
  ["createPromptInjectionGuardrail(opts?)", "Heuristic jailbreak detection"],
  ["createBlocklistInputGuardrail / createBlocklistOutputGuardrail", "Keyword/regex filtering"],
  ["createSchemaGuardrail(schema)", "Validates output as JSON against a zod OR Standard Schema"],
  ["createBudgetGuardrail(opts)", "Caps cumulative token/cost spend for one client"],
  ["createUsageLedger(opts?)", "Per-key (session/user) cumulative cost & token tracking"],
  ["withRetry / withFallback / withTimeout / createResilientProvider", "Provider-level resilience wrappers"],
  ["withConcurrencyLimit / withRateLimit", "Queue-based in-flight / requests-per-window caps"],
  ["createMockProvider(opts)", "Scripted Provider for testing agents without a real model API"],
  ["exportRunTraceToOtel(trace, opts?)", "Converts a RunTrace into real OpenTelemetry spans"],
  ["renderTraceHTML(trace, opts?)", "Renders a RunTrace as a self-contained offline HTML timeline"],
  [
    "anthropic() / openai() / google() / groq() / mistral() / ollama() / azureOpenAI() / bedrock()",
    "Provider adapters — see Model providers",
  ],
  [
    "useAgent(client, agent)",
    'Framework hook wrapping runAgentStream() — import from "samai-sdk/react", "/vue", or "/svelte"',
  ],
  [
    "AnySchema / StandardSchemaV1 (types)",
    "The types accepted anywhere a schema is — zod or Standard Schema V1",
  ],
];

export default function ApiReferencePage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="API reference"
        description="Every top-level export, at a glance. Full type signatures ship with the package (dist/index.d.ts) — your editor's autocomplete and hover docs cover anything not shown here."
      >
        <table>
          <thead>
            <tr>
              <th>Export</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([name, purpose]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocPage>
      <DocPager current="/docs/api-reference" />
    </>
  );
}
