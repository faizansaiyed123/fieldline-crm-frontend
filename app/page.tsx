"use client";

import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui";

const productAreas = [
  {
    index: "01",
    title: "Customer records",
    description:
      "Keep companies, contacts, relationships, activity, and follow-up in one connected place.",
  },
  {
    index: "02",
    title: "Pipeline and follow-through",
    description:
      "Track opportunities through their stages while keeping the next piece of work visible.",
  },
  {
    index: "03",
    title: "Operational clarity",
    description:
      "Use relationship context, data quality, saved views, planner work, and automation without splitting the workflow across tools.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand brand-fieldline" aria-label="Fieldline home">
          <span className="brand-logo" aria-hidden="true">
            <img src="/brand/fieldline.svg" alt="" />
          </span>
          <span className="brand-copy">
            <strong>Fieldline</strong>
            <small>customer workspace</small>
          </span>
        </Link>

        <div className="landing-actions">
          {user ? (
            <Button href="/dashboard">Open workspace</Button>
          ) : (
            <>
              <Link href="/login" className="text-link">
                Sign in
              </Link>
              <Button href="/signup">Create workspace</Button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Customer work, connected</span>
          <h1>
            The CRM for keeping customer relationships{" "}
            <em>moving forward.</em>
          </h1>
          <p>
            Fieldline connects customer records, sales opportunities,
            relationship context, follow-through, and operational work in one
            focused workspace.
          </p>

          <div className="hero-actions">
            <Button href={user ? "/dashboard" : "/signup"}>
              {loading
                ? "Loading…"
                : user
                  ? "Open workspace"
                  : "Create your workspace"}
            </Button>
            <Link href="/login" className="text-link hero-login">
              Already have an account <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="hero-note">
            <span className="note-rule" aria-hidden="true" />
            <span>One place for the record, the relationship, and the next action.</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Fieldline product overview">
          <div className="product-window">
            <div className="product-chrome">
              <div className="product-brand">
                <img src="/brand/fieldline.svg" alt="" />
                <span>Fieldline</span>
              </div>
              <span className="product-location">Customer workspace</span>
            </div>

            <div className="product-layout">
              <aside className="product-nav" aria-label="Fieldline product areas">
                <span className="product-nav-label">Workspace</span>
                <span className="product-nav-item active">Overview</span>
                <span className="product-nav-item">Companies</span>
                <span className="product-nav-item">Contacts</span>
                <span className="product-nav-item">Opportunities</span>
                <span className="product-nav-item">Planner</span>
                <span className="product-nav-item">Data quality</span>
                <span className="product-nav-item">Automation</span>
              </aside>

              <div className="product-main">
                <div className="product-heading">
                  <div>
                    <span className="product-kicker">Workspace overview</span>
                    <h2>Customer work, in context.</h2>
                  </div>
                  <span className="product-status">
                    <i aria-hidden="true" /> Connected
                  </span>
                </div>

                <div className="product-flow">
                  <div className="flow-step">
                    <span className="flow-number">01</span>
                    <div>
                      <strong>Customer records</strong>
                      <span>Companies · contacts · relationships</span>
                    </div>
                  </div>
                  <span className="flow-line" aria-hidden="true" />
                  <div className="flow-step">
                    <span className="flow-number">02</span>
                    <div>
                      <strong>Pipeline</strong>
                      <span>Opportunities · stages · close dates</span>
                    </div>
                  </div>
                  <span className="flow-line" aria-hidden="true" />
                  <div className="flow-step">
                    <span className="flow-number">03</span>
                    <div>
                      <strong>Follow-through</strong>
                      <span>Planner · attention · automation</span>
                    </div>
                  </div>
                </div>

                <div className="product-footer-line">
                  <span>Relationship context</span>
                  <span>Data quality</span>
                  <span>Saved views</span>
                  <span>Operational rules</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="understand-section">
        <div className="section-intro">
          <span className="eyebrow">How Fieldline fits together</span>
          <h2>From the customer record to the work that follows.</h2>
          <p>
            Fieldline is built around the way customer work actually moves:
            understand the record, see what is happening, then act on the next
            meaningful piece of work.
          </p>
        </div>

        <div className="product-areas">
          {productAreas.map((area) => (
            <article key={area.index} className="product-area">
              <span>{area.index}</span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="suite-section">
        <div>
          <span className="eyebrow">Built as a product</span>
          <h2>One focused workspace, not another layer of noise.</h2>
        </div>

        <div className="suite-products" aria-label="Other products">
          <a
            className="suite-product"
            href="https://nexora-frontend-hazel.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/brand/nexora.svg" alt="" />
            <span>
              <strong>Nexora</strong>
              <small>Market intelligence</small>
            </span>
            <span className="suite-arrow" aria-hidden="true">↗</span>
          </a>

          <a
            className="suite-product"
            href="https://service-agreement-manager-frontend.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/brand/service-agreement-manager.svg" alt="" />
            <span>
              <strong>Service Agreement Manager</strong>
              <small>Service operations workspace</small>
            </span>
            <span className="suite-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="footer-brand">
          <img src="/brand/fieldline.svg" alt="" />
          <span>Fieldline</span>
        </Link>
        <span>Customer relationships, pipeline, and follow-through.</span>
      </footer>
    </main>
  );
}
