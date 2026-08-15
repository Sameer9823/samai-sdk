"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard unavailable — fail silently, button just won't flip to "copied"
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] transition-colors sm:px-2.5 ${
        copied
          ? "border-[var(--signal-500)]/40 text-[var(--signal-400)]"
          : "border-[var(--line-strong)] text-[var(--text-faint)] hover:border-[var(--signal-500)]/40 hover:text-[var(--text-primary)]"
      }`}
    >
      {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
