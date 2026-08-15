import { codeToHtml } from "shiki";
import { CopyButton } from "./CopyButton";

export async function CodeBlock({
  code,
  lang = "ts",
  label,
  className = "",
}: {
  code: string;
  lang?: string;
  label?: string;
  className?: string;
}) {
  const trimmed = code.trim();
  const html = await codeToHtml(trimmed, {
    lang,
    theme: "vitesse-dark",
  });

  return (
    <div
      className={`w-full max-w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-panel-raised)] px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
          </div>
          {label && (
            <span className="label-eyebrow min-w-0 truncate text-[var(--text-muted)]">
              {label}
            </span>
          )}
        </div>
        <CopyButton code={trimmed} />
      </div>
      <div
        className="max-w-full overflow-x-auto p-3 text-[12.5px] leading-[1.7] [&_pre]:!bg-transparent sm:p-4 sm:text-[13px] font-(family-name:--font-code)"
        style={{ fontFamily: "var(--font-code)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
