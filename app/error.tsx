"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the fallback intentionally quiet; sensitive error details stay out of the UI.
    void error;
  }, [error]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Something went wrong</span>
        <h1>Fieldline could not finish that view.</h1>
        <p className="auth-intro-copy">The workspace is still safe. You can retry the page or return to the overview.</p>
        <div className="hero-actions">
          <button className="button button-primary" onClick={() => reset()}>Try again</button>
          <Link className="button button-secondary" href="/dashboard">Back to workspace</Link>
        </div>
      </section>
    </main>
  );
}
