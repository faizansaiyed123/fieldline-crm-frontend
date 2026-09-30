"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui";

const nav = [
  { href: "/dashboard", label: "Overview", glyph: "O" },
  { href: "/contacts", label: "Contacts", glyph: "C" },
  { href: "/companies", label: "Companies", glyph: "A" },
  { href: "/relationships", label: "Relationships", glyph: "G" },
  { href: "/opportunities", label: "Pipeline", glyph: "P" },
  { href: "/views", label: "Saved views", glyph: "V" },
  { href: "/imports", label: "Imports", glyph: "I" },
  { href: "/planner", label: "My work", glyph: "W" },
  { href: "/quality", label: "Data quality", glyph: "Q" },
  { href: "/automation", label: "Automation", glyph: "A" },
  { href: "/settings", label: "Rules & health", glyph: "S" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">F</div>
        <p>Loading workspace…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">F</div>
        <p>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">F</span>
          <span><strong>Fieldline</strong><small>customer workspace</small></span>
        </Link>
        <div className="workspace-card">
          <span className="workspace-kicker">WORKSPACE</span>
          <strong>{user.full_name}</strong>
          <span>{user.memberships[0]?.role ?? "member"}</span>
        </div>
        <nav className="nav" aria-label="Primary navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <span className="nav-glyph" aria-hidden="true">{item.glyph}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Button variant="ghost" onClick={() => void signOut().then(() => router.replace("/login"))}>
            Sign out
          </Button>
        </div>
      </aside>
      <main id="main-content" className="main">{children}</main>
    </div>
  );
}
