"use client";

import Link from "next/link";
import { Package, Menu, X } from "lucide-react";
import { useState } from "react";

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.55-3.88-1.55-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.71.08-.71 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.6.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.44-2.69 5.42-5.25 5.7.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/providers", label: "Providers" },
  { href: "/docs/quick-start", label: "Quick start" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg-deep)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--signal-500)]/40 bg-[var(--signal-500)]/10">
            <span className="h-2 w-2 rounded-full bg-[var(--signal-400)] shadow-[0_0_8px_var(--signal-glow)]" />
          </span>
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            samai-sdk
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://www.npmjs.com/package/samai-sdk"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:flex"
          >
            <Package size={15} strokeWidth={1.75} />
            npm
          </a>
          <a
            href="https://github.com/Sameer9823/samai-sdk"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--signal-500)]/50 hover:bg-[var(--bg-panel-hover)] sm:flex"
          >
            <GithubMark size={15} />
            GitHub
          </a>

          {/* mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line-strong)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* mobile menu panel */}
      {open && (
        <div className="border-t border-[var(--line)] bg-[var(--bg-deep)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-3 border-t border-[var(--line)] pt-4">
            <a
              href="https://www.npmjs.com/package/samai-sdk"
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Package size={15} strokeWidth={1.75} />
              npm
            </a>
            <a
              href="https://github.com/Sameer9823/samai-sdk"
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--signal-500)]/50 hover:bg-[var(--bg-panel-hover)]"
            >
              <GithubMark size={15} />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
