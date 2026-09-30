"use client";

import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">F</span>
          <span><strong>Fieldline</strong><small>customer workspace</small></span>
        </Link>
        <div className="landing-actions">
          {user ? (
            <Button href="/dashboard">Open workspace</Button>
          ) : (
            <>
              <Link href="/login" className="text-link">Sign in</Link>
              <Button href="/signup">Create workspace</Button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">CRM, without the noise</span>
          <h1>See the work that matters. <em>Act on it.</em></h1>
          <p>
            Fieldline brings customer context, pipeline, relationship health, and next
            actions into one focused workspace.
          </p>
          <div className="hero-actions">
            <Button href={user ? "/dashboard" : "/signup"}>
              {loading ? "Loading…" : user ? "Open workspace" : "Start building your workspace"}
            </Button>
            <Link href="/login" className="text-link">Already have an account →</Link>
          </div>
        </div>
        <div className="hero-visual" aria-label="Fieldline workspace preview">
          <div className="preview-window">
            <div className="preview-top"><span/><span/><span/><strong>Fieldline / Overview</strong></div>
            <div className="preview-body">
              <div className="preview-rail"><span/><span/><span/><span/></div>
              <div className="preview-content">
                <div className="preview-grid"><div/><div/><div/></div>
                <div className="preview-panel">
                  <div className="preview-line wide"/>
                  <div className="preview-line"/>
                  <div className="preview-line short"/>
                  <div className="preview-row"><b>Follow-up</b><span>today</span></div>
                  <div className="preview-row"><b>Renewal</b><span>2 days</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <article><span>01</span><h2>Attention, explained</h2><p>Every surfaced item carries an evidence-based reason instead of a black-box score.</p></article>
        <article><span>02</span><h2>Pipeline with context</h2><p>Opportunities, stages, expected close dates, and customer relationships stay connected.</p></article>
        <article><span>03</span><h2>Data you can trust</h2><p>Imports validate before commit, tenant boundaries are enforced, and changes are audited.</p></article>
      </section>
    </main>
  );
}
