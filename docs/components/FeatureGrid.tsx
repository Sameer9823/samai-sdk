"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  GitBranch,
  Database,
  Activity,
  RefreshCcw,
  Braces,
  Terminal,
  KeyRound,
  Plug,
  Code2,
  Mic,
  History,
  Share2,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Guardrails & approval",
    body: "Block PII and prompt-injection on input, validate output against a schema, cap spend per session, and gate risky tools behind human approval — fail-closed by default.",
    tone: "guard",
  },
  {
    icon: GitBranch,
    title: "Multi-agent handoffs",
    body: "Define specialist agents and let the model route between them mid-conversation, instead of one sprawling system prompt.",
    tone: "signal",
  },
  {
    icon: RefreshCcw,
    title: "Tool loop, built in",
    body: "defineTool() with full type inference from a zod or valibot schema. Args are validated before execute() ever runs.",
    tone: "signal",
  },
  {
    icon: Plug,
    title: "MCP client",
    body: "createMCPClient() turns any local (stdio) or remote (HTTP/SSE) MCP server's tools into ordinary tools your agent can call.",
    tone: "signal",
  },
  {
    icon: Code2,
    title: "Sandboxed code execution",
    body: "An isolated temp dir for an agent to write and run real JS/Python/bash — minimal env, real timeouts, no leaked API keys.",
    tone: "guard",
  },
  {
    icon: Mic,
    title: "Voice & realtime",
    body: "createRealtimeSession() streams audio/text over WebSocket with barge-in support, plus REST wrappers for TTS and transcription.",
    tone: "signal",
  },
  {
    icon: Database,
    title: "Sessions & RAG",
    body: "Redis, SQLite, or in-memory session persistence, plus a retrieval pipeline for grounding agents in your own documents.",
    tone: "signal",
  },
  {
    icon: Activity,
    title: "Tracing you can read",
    body: "Every model call, tool call, retry, and handoff recorded to a RunTrace — render it as HTML or export via OpenTelemetry.",
    tone: "ok",
  },
  {
    icon: Braces,
    title: "Structured output",
    body: "generateObject() and streamObject() return validated, typed data — with an automatic repair prompt on schema mismatch.",
    tone: "signal",
  },
  {
    icon: KeyRound,
    title: "Resilience",
    body: "withRetry() and withFallback([...]) wrap any provider, plus withConcurrencyLimit() and withRateLimit() to stay under caps.",
    tone: "guard",
  },
  {
    icon: History,
    title: "Resumable runs",
    body: "Checkpoint after every turn and resume after a crash or process restart — no tool call is ever re-executed.",
    tone: "ok",
  },
  {
    icon: Terminal,
    title: "A real CLI",
    body: "Scaffold a project, inspect a trace file, or replay a usage ledger — samai-sdk create / trace / usage.",
    tone: "signal",
  },
  {
    icon: Share2,
    title: "Graph memory",
    body: "Per-user Neo4j knowledge graph with a background sweep, timestamped/contradiction-aware facts, self-correction, and hybrid feed ranking.",
    tone: "ok",
  },
];

const toneStyles: Record<string, { border: string; glow: string; icon: string }> = {
  signal: {
    border: "hover:border-[var(--signal-500)]/40",
    glow: "group-hover:shadow-[0_0_0_1px_var(--signal-500)_inset,0_8px_30px_-12px_var(--signal-glow)]",
    icon: "text-[var(--signal-400)]",
  },
  guard: {
    border: "hover:border-[var(--guard-500)]/40",
    glow: "group-hover:shadow-[0_0_0_1px_var(--guard-500)_inset,0_8px_30px_-12px_var(--guard-glow)]",
    icon: "text-[var(--guard-400)]",
  },
  ok: {
    border: "hover:border-[var(--ok-500)]/40",
    glow: "group-hover:shadow-[0_0_0_1px_var(--ok-500)_inset,0_8px_24px_-12px_rgba(79,209,165,0.3)]",
    icon: "text-[var(--ok-500)]",
  },
};

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        const tone = toneStyles[f.tone];
        return (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
            className={`group relative rounded-xl border border-[var(--line)] bg-[var(--bg-panel)]/60 p-5 transition-all duration-300 ${tone.border} ${tone.glow}`}
          >
            <Icon size={19} strokeWidth={1.6} className={tone.icon} />
            <h3
              className="mt-3.5 text-[15px] font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {f.title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
              {f.body}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
