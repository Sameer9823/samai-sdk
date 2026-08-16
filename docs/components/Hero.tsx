"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { SignalDiagram } from "./SignalDiagram";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCmd = "npm install samai-sdk";

  function copy() {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="grid-bg relative overflow-hidden border-b border-[var(--line)] pt-20 pb-16 sm:pt-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="label-eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-400)]" />
            v0.3.3 · 8 providers · MIT licensed
          </span>

          <h1
            className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            One API in.
            <br />
            <span className="text-[var(--signal-400)] text-glow-signal">
              A real agent runtime
            </span>{" "}
            out.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-[var(--text-secondary)] sm:text-[17px]">
            samai-sdk unifies OpenAI, Anthropic, Gemini, and 5 more providers
            behind one interface — then adds the parts every team rebuilds
            anyway: tool calling, MCP, guardrails, handoffs, sessions, RAG,
            voice, and full tracing.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/docs/quick-start"
              className="group flex items-center gap-2 rounded-lg bg-[var(--signal-500)] px-5 py-2.5 text-sm font-medium text-[#04070d] transition-transform hover:translate-y-[-1px] hover:bg-[var(--signal-400)]"
            >
              Get started
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <button
              onClick={copy}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-panel)] px-4 py-2.5 text-left transition-colors hover:border-[var(--signal-500)]/40"
            >
              <span
                className="text-sm text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-code)" }}
              >
                {installCmd}
              </span>
              {copied ? (
                <Check size={14} className="text-[var(--ok-500)]" />
              ) : (
                <Copy size={14} className="text-[var(--text-muted)]" />
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16 rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)]/50 p-6 sm:mt-20 sm:p-10"
        >
          <SignalDiagram />
        </motion.div>
      </div>
    </section>
  );
}
