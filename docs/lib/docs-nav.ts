export type DocLink = { href: string; label: string };
export type DocGroup = { title: string; items: DocLink[] };

export const DOCS_NAV: DocGroup[] = [
  {
    title: "Getting started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/installation", label: "Installation" },
      { href: "/docs/quick-start", label: "Quick start" },
      { href: "/docs/cli", label: "CLI" },
    ],
  },
  {
    title: "Core concepts",
    items: [
      { href: "/docs/agents", label: "Agents, handoffs & sessions" },
      { href: "/docs/tools", label: "Tools & schemas" },
      { href: "/docs/mcp", label: "MCP (Model Context Protocol)" },
      { href: "/docs/sandbox", label: "Sandboxed code execution" },
      { href: "/docs/voice", label: "Voice / realtime agents" },
      { href: "/docs/guardrails", label: "Guardrails & approval" },
      { href: "/docs/rag", label: "RAG / vector search" },
      { href: "/docs/graph-memory", label: "Graph memory (Neo4j)" },
      { href: "/docs/structured-output", label: "Structured output" },
      { href: "/docs/batch-output", label: "Batch output & Standard Schema" },
    ],
  },
  {
    title: "Ops & reliability",
    items: [
      { href: "/docs/reliability", label: "Reliability & tracing" },
      { href: "/docs/concurrency", label: "Concurrency & rate limiting" },
      { href: "/docs/resumable-runs", label: "Resumable runs" },
      { href: "/docs/observability", label: "OpenTelemetry & trace viewer" },
      { href: "/docs/usage-tracking", label: "Usage tracking" },
      { href: "/docs/testing", label: "Testing your agents" },
      { href: "/docs/deployment", label: "Deployment" },
    ],
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/providers", label: "Model providers" },
      { href: "/docs/prompt-caching", label: "Prompt caching" },
      { href: "/docs/api-reference", label: "API reference" },
      { href: "/docs/react", label: "React" },
      { href: "/docs/vue", label: "Vue" },
      { href: "/docs/svelte", label: "Svelte" },
      { href: "/docs/examples", label: "Examples" },
    ],
  },
];

export const DOCS_FLAT: DocLink[] = DOCS_NAV.flatMap((g) => g.items);
