"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { DOCS_NAV } from "@/lib/docs-nav";

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-7">
      {DOCS_NAV.map((group) => (
        <div key={group.title}>
          <h3 className="label-eyebrow mb-2.5 text-[var(--text-faint)]">
            {group.title}
          </h3>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative block rounded-md py-1.5 pl-3 text-sm transition-colors ${
                      active
                        ? "text-[var(--signal-400)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--signal-500)]" />
                    )}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] lg:hidden"
      >
        <Menu size={15} />
        Browse docs
      </button>

      {/* desktop sidebar */}
      <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-56 shrink-0 overflow-y-auto pb-10 lg:block">
        <SidebarLinks />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 left-0 h-full w-72 overflow-y-auto border-r border-[var(--line)] bg-[var(--bg-deep)] p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="label-eyebrow text-[var(--text-faint)]">
                Documentation
              </span>
              <button onClick={() => setOpen(false)}>
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <SidebarLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
