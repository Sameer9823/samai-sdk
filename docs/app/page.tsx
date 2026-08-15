import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { ProviderCodeToggle } from "@/components/ProviderCodeToggle";
import { ProvidersStrip } from "@/components/ProvidersStrip";
import { CodeBlock } from "@/components/CodeBlock";

const QUICK_START_CODE = `import { createClient, anthropic, defineAgent, defineTool, runAgent } from "samai-sdk";
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

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />

        {/* one API, every provider */}
        <section className="border-b border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid min-w-0 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <span className="label-eyebrow text-[var(--signal-400)]">
                  01 — swap providers, not code
                </span>
                <h2
                  className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Change one line. Keep every tool, guardrail, and trace.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
                  Every provider — Anthropic, OpenAI, Gemini, Bedrock, Groq,
                  Mistral, Azure OpenAI, or a free local model via Ollama —
                  implements the same interface. Your agent definitions,
                  tools, and guardrails don&apos;t know or care which one is
                  running underneath.
                </p>
                <Link
                  href="/docs/providers"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--signal-400)] hover:text-[var(--signal-300)]"
                >
                  See all 8 providers
                  <ArrowRight size={14} />
                </Link>
              </div>
              <ProviderCodeToggle />
            </div>
          </div>
        </section>

        {/* feature grid */}
        <section className="border-b border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="label-eyebrow text-[var(--signal-400)]">
                02 — the runtime, not just the wrapper
              </span>
              <h2
                className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Everything a production agent needs, already wired in
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
                Most SDKs stop at the API call. samai-sdk ships the
                orchestration layer every real agent eventually needs — so
                you build the agent, not the plumbing underneath it.
              </p>
            </div>
            <div className="mt-12">
              <FeatureGrid />
            </div>
          </div>
        </section>

        {/* everything else, quick links into the fuller docs */}
        <section className="border-b border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="label-eyebrow text-[var(--signal-400)]">
                03 — the rest of the toolkit
              </span>
              <h2
                className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Full docs for every part of the runtime
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
                MCP, sandboxed code execution, voice, RAG, graph memory,
                resumable runs, OpenTelemetry export, batch structured
                output, and framework hooks for React, Vue, and Svelte —
                all documented, all in the same package.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { href: "/docs/mcp", label: "MCP client" },
                { href: "/docs/sandbox", label: "Sandboxed execution" },
                { href: "/docs/voice", label: "Voice / realtime" },
                { href: "/docs/rag", label: "RAG / vector search" },
                { href: "/docs/graph-memory", label: "Graph memory (Neo4j)" },
                { href: "/docs/batch-output", label: "Batch output" },
                { href: "/docs/concurrency", label: "Concurrency & rate limits" },
                { href: "/docs/resumable-runs", label: "Resumable runs" },
                { href: "/docs/observability", label: "OTel & trace viewer" },
                { href: "/docs/usage-tracking", label: "Usage tracking" },
                { href: "/docs/testing", label: "Testing utilities" },
                { href: "/docs/deployment", label: "Deployment" },
                { href: "/docs/prompt-caching", label: "Prompt caching" },
                { href: "/docs/react", label: "React hook" },
                { href: "/docs/vue", label: "Vue hook" },
                { href: "/docs/svelte", label: "Svelte hook" },
                { href: "/docs/api-reference", label: "Full API reference" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/60 px-4 py-3 text-[13.5px] text-[var(--text-secondary)] transition-colors hover:border-[var(--signal-500)]/40 hover:text-[var(--text-primary)]"
                >
                  {l.label}
                  <ArrowRight
                    size={13}
                    className="text-[var(--text-faint)] opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* quick look code sample */}
        <section className="border-b border-[var(--line)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid min-w-0 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div className="order-2 min-w-0 lg:order-1">
                <CodeBlock code={QUICK_START_CODE} lang="ts" label="agent.ts" />
              </div>
              <div className="order-1 lg:order-2">
                <span className="label-eyebrow text-[var(--signal-400)]">
                  04 — a tool call is 6 lines
                </span>
                <h2
                  className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Full type inference, zero manual typing
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
                  <code className="rounded bg-[var(--bg-panel-raised)] px-1.5 py-0.5 text-[13px] text-[var(--guard-400)]">
                    defineTool()
                  </code>{" "}
                  infers <code className="rounded bg-[var(--bg-panel-raised)] px-1.5 py-0.5 text-[13px] text-[var(--guard-400)]">execute()</code>&apos;s
                  argument types straight from your schema — zod, or any
                  Standard Schema V1 validator like valibot. Args are
                  validated before your code ever runs.
                </p>
                <Link
                  href="/docs/tools"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--signal-400)] hover:text-[var(--signal-300)]"
                >
                  Read about tools & schemas
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* providers strip */}
        <section className="border-b border-[var(--line)] py-14">
          <div className="mx-auto max-w-6xl px-6">
            <p className="label-eyebrow mb-8 text-center text-[var(--text-faint)]">
              works the same across all 8 providers
            </p>
            <ProvidersStrip />
          </div>
        </section>

        {/* final CTA */}
        <section className="py-24">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Wire up your first agent in under 10 minutes
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
              Install the SDK, pick a provider, and follow the quick start —
              or scaffold a working project straight from the CLI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/docs/quick-start"
                className="flex items-center gap-2 rounded-lg bg-[var(--signal-500)] px-5 py-2.5 text-sm font-medium text-[#04070d] transition-transform hover:translate-y-[-1px] hover:bg-[var(--signal-400)]"
              >
                Read the quick start
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
              <Link
                href="/docs/cli"
                className="rounded-lg border border-[var(--line-strong)] bg-[var(--bg-panel)] px-5 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--signal-500)]/40"
              >
                npx samai-sdk create
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}