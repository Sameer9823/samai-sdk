"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightCircle,
  ShieldCheck,
  Cpu,
  RefreshCw,
  GitBranch,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";

const NODES = [
  { key: "input", label: "your app", icon: ArrowRightCircle, tone: "neutral" as const },
  { key: "guard-in", label: "guardrail", icon: ShieldCheck, tone: "guard" as const },
  { key: "provider", label: "provider", icon: Cpu, tone: "signal" as const, dynamic: true },
  { key: "tools", label: "tool loop", icon: RefreshCw, tone: "signal" as const },
  { key: "handoff", label: "handoff", icon: GitBranch, tone: "signal" as const },
  { key: "guard-out", label: "guardrail", icon: ShieldCheck, tone: "guard" as const },
  { key: "output", label: "traced output", icon: CheckCircle2, tone: "ok" as const },
];

const PROVIDERS = ["anthropic()", "openai()", "google()", "groq()", "bedrock()"];

const TRACE_LINES = [
  { t: "model-call", d: "claude-sonnet-4-6 · 340ms" },
  { t: "tool-call", d: "get_weather({ city: \"Tokyo\" })" },
  { t: "guardrail", d: "pii-input · allowed" },
  { t: "handoff", d: "router → specialist" },
  { t: "run-completed", d: "3 calls · 812 tokens" },
];

const toneVar: Record<string, string> = {
  neutral: "var(--text-muted)",
  guard: "var(--guard-500)",
  signal: "var(--signal-500)",
  ok: "var(--ok-500)",
};

export function SignalDiagram() {
  const prefersReduced = useReducedMotion();
  const [providerIdx, setProviderIdx] = useState(0);
  const [activeNode, setActiveNode] = useState(0);

  const segmentMs = 900;
  const cycleNodes = NODES.length;

  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => {
      setActiveNode((n) => (n + 1) % cycleNodes);
    }, segmentMs);
    return () => clearInterval(id);
  }, [prefersReduced, cycleNodes]);

  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => {
      setProviderIdx((i) => (i + 1) % PROVIDERS.length);
    }, segmentMs * cycleNodes);
    return () => clearInterval(id);
  }, [prefersReduced, cycleNodes]);

  const width = 1040;
  const height = 150;
  const y = 78;
  const marginX = 70;
  const step = (width - marginX * 2) / (NODES.length - 1);
  const positions = NODES.map((_, i) => marginX + step * i);

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[720px]"
          role="img"
          aria-label="Diagram: a request flows through a guardrail, a swappable provider, the tool loop, an agent handoff, an output guardrail, and finally a traced output."
        >
          {/* base connecting line */}
          <line
            x1={positions[0]}
            y1={y}
            x2={positions[positions.length - 1]}
            y2={y}
            stroke="var(--line-strong)"
            strokeWidth={1.5}
          />

          {/* traveled portion glow */}
          {!prefersReduced && (
            <motion.line
              x1={positions[0]}
              y1={y}
              x2={positions[0]}
              y2={y}
              stroke="var(--signal-500)"
              strokeWidth={2}
              strokeLinecap="round"
              animate={{ x2: positions[activeNode] }}
              transition={{ duration: segmentMs / 1000, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 6px var(--signal-glow))" }}
            />
          )}

          {/* traveling pulse */}
          {!prefersReduced && (
            <motion.circle
              r={4.5}
              fill="var(--signal-400)"
              cy={y}
              animate={{ cx: positions[activeNode] }}
              transition={{ duration: segmentMs / 1000, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 8px var(--signal-glow))" }}
            />
          )}

          {NODES.map((node, i) => {
            const Icon = node.icon;
            const isActive = !prefersReduced && i === activeNode;
            const cx = positions[i];
            return (
              <g key={node.key} transform={`translate(${cx}, ${y})`}>
                <motion.circle
                  r={22}
                  fill="var(--bg-panel)"
                  stroke={isActive ? toneVar[node.tone] : "var(--line-strong)"}
                  strokeWidth={isActive ? 2 : 1.25}
                  animate={
                    isActive
                      ? { scale: [1, 1.08, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.5 }}
                  style={
                    isActive
                      ? { filter: `drop-shadow(0 0 10px ${toneVar[node.tone]})` }
                      : undefined
                  }
                />
                <foreignObject x={-11} y={-11} width={22} height={22}>
                  <Icon
                    size={22}
                    color={isActive ? toneVar[node.tone] : "var(--text-muted)"}
                    strokeWidth={1.75}
                  />
                </foreignObject>
                <text
                  y={44}
                  textAnchor="middle"
                  fill={isActive ? "var(--text-primary)" : "var(--text-muted)"}
                  fontFamily="var(--font-label)"
                  fontSize="11"
                  letterSpacing="0.02em"
                >
                  {node.dynamic ? PROVIDERS[providerIdx] : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* trace ticker */}
      <div className="mx-auto mt-8 max-w-xl rounded-lg border border-[var(--line)] bg-[var(--bg-panel)]/70 px-4 py-3 font-(family-name:--font-code) text-[12px]">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ok-500)]" />
          <span className="label-eyebrow text-[var(--text-faint)]">run trace — live</span>
        </div>
        <div className="space-y-1">
          {TRACE_LINES.map((line, i) => (
            <div key={line.t} className="flex gap-3 text-[var(--text-muted)]">
              <span className="w-24 shrink-0 text-[var(--signal-400)]">{line.t}</span>
              <span className="truncate">{line.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
