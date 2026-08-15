import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOCS_FLAT } from "@/lib/docs-nav";

export function DocPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <span className="label-eyebrow text-[var(--signal-400)]">{eyebrow}</span>
      <h1
        className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>
      <div className="my-10 h-px w-full bg-[var(--line)]" />
      <div className="docs-prose max-w-none">{children}</div>
    </article>
  );
}

export function DocPager({ current }: { current: string }) {
  const idx = DOCS_FLAT.findIndex((d) => d.href === current);
  const prev = idx > 0 ? DOCS_FLAT[idx - 1] : null;
  const next = idx >= 0 && idx < DOCS_FLAT.length - 1 ? DOCS_FLAT[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-16 flex items-stretch justify-between gap-4 border-t border-[var(--line)] pt-8">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-1 flex-col gap-1 rounded-lg border border-[var(--line)] p-4 transition-colors hover:border-[var(--signal-500)]/40"
        >
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
            <ArrowLeft size={12} /> previous
          </span>
          <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            {prev.label}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-1 flex-col items-end gap-1 rounded-lg border border-[var(--line)] p-4 text-right transition-colors hover:border-[var(--signal-500)]/40"
        >
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
            next <ArrowRight size={12} />
          </span>
          <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            {next.label}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

export function Callout({
  tone = "signal",
  title,
  children,
}: {
  tone?: "signal" | "guard" | "ok";
  title: string;
  children: React.ReactNode;
}) {
  const colors = {
    signal: { border: "border-l-[var(--signal-500)]", text: "text-[var(--signal-400)]" },
    guard: { border: "border-l-[var(--guard-500)]", text: "text-[var(--guard-400)]" },
    ok: { border: "border-l-[var(--ok-500)]", text: "text-[var(--ok-500)]" },
  }[tone];

  return (
    <div
      className={`my-6 rounded-r-lg border-l-2 ${colors.border} bg-[var(--bg-panel)] py-3 pr-4 pl-4`}
    >
      <p className={`mb-1 text-xs font-semibold tracking-wide uppercase ${colors.text}`}>
        {title}
      </p>
      <div className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}
