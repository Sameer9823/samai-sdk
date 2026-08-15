import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-panel)]/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--signal-400)]" />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              samai-sdk
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            One TypeScript API for 8 model providers, with the agent runtime
            wired in from the start.
          </p>
        </div>

        <FooterCol
          title="Docs"
          links={[
            { href: "/docs", label: "Introduction" },
            { href: "/docs/installation", label: "Installation" },
            { href: "/docs/quick-start", label: "Quick start" },
            { href: "/docs/cli", label: "CLI" },
          ]}
        />
        <FooterCol
          title="Core concepts"
          links={[
            { href: "/docs/agents", label: "Agents & handoffs" },
            { href: "/docs/tools", label: "Tools & schemas" },
            { href: "/docs/guardrails", label: "Guardrails" },
            { href: "/docs/reliability", label: "Reliability & tracing" },
          ]}
        />
        <FooterCol
          title="Project"
          external
          links={[
            { href: "https://github.com/Sameer9823/samai-sdk", label: "GitHub" },
            { href: "https://www.npmjs.com/package/samai-sdk", label: "npm" },
            {
              href: "https://github.com/Sameer9823/samai-sdk/blob/master/README.md",
              label: "README",
            },
          ]}
        />
      </div>
      <div className="border-t border-[var(--line)] px-6 py-5">
        <p className="mx-auto max-w-6xl text-xs text-[var(--text-faint)]">
          MIT licensed. Built by{" "}
          <a
            href="https://github.com/Sameer9823"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            Sameer
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  external,
}: {
  title: string;
  links: { href: string; label: string }[];
  external?: boolean;
}) {
  return (
    <div>
      <h3 className="label-eyebrow text-[var(--text-faint)]">{title}</h3>
      <ul className="mt-3.5 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            {external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
