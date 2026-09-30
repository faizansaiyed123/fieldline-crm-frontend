import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">404</span>
        <h1>That Fieldline page does not exist.</h1>
        <p className="auth-intro-copy">The record or route may have moved.</p>
        <Link className="button button-primary" href="/dashboard">Return to workspace</Link>
      </section>
    </main>
  );
}
