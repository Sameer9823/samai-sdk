"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  {
    id: "anthropic",
    label: "anthropic()",
    line: `provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),`,
  },
  {
    id: "openai",
    label: "openai()",
    line: `provider: openai({ apiKey: process.env.OPENAI_API_KEY }),`,
  },
  {
    id: "google",
    label: "google()",
    line: `provider: google({ apiKey: process.env.GOOGLE_API_KEY }),`,
  },
  {
    id: "ollama",
    label: "ollama()",
    line: `provider: ollama({ baseURL: "http://localhost:11434" }), // free, local, no key`,
  },
];

export function ProviderCodeToggle() {
  const [active, setActive] = useState(0);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-panel)]">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--bg-panel-raised)] p-1.5">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-md px-3 py-1.5 font-(family-name:--font-code) text-[12.5px] transition-colors ${
              active === i
                ? "bg-[var(--signal-500)]/15 text-[var(--signal-400)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto p-5 font-(family-name:--font-code) text-[13px] leading-[1.85]">
        <div className="text-[var(--text-faint)]">
          <span className="text-[#c586c0]">const</span>{" "}
          <span className="text-[#9cdcfe]">client</span> ={" "}
          <span className="text-[#dcdcaa]">createClient</span>({"{"}
        </div>
        <div className="pl-4 relative min-h-[1.85em]">
          <AnimatePresence mode="wait">
            <motion.span
              key={TABS[active].id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="block"
            >
              <span className="text-[#9cdcfe]">provider</span>
              <span className="text-[var(--text-faint)]">: </span>
              <span className="text-[#dcdcaa]">{TABS[active].label.split("(")[0]}</span>
              <span className="text-[var(--text-faint)]">(...)</span>
              <span className="text-[var(--text-faint)]">,</span>
              {TABS[active].id === "ollama" && (
                <span className="ml-2 text-[var(--text-faint)]"> // free, local, no key</span>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="text-[var(--text-faint)]">{"});"}</div>
        <div className="mt-3 text-[var(--text-faint)]">
          <span className="text-[#c586c0]">const</span>{" "}
          <span className="text-[#9cdcfe]">result</span> ={" "}
          <span className="text-[#c586c0]">await</span>{" "}
          <span className="text-[#dcdcaa]">generate</span>(client, {"{"} model, messages {"}"});
        </div>
        <div className="mt-1 text-[var(--text-muted)]">
          <span className="text-[var(--ok-500)]">// </span>
          <span className="text-[var(--text-muted)]">
            everything below this line — tools, guardrails, handoffs, tracing — stays identical
          </span>
        </div>
      </div>
    </div>
  );
}