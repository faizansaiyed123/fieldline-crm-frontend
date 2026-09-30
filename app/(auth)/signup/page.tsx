"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signUp({ organizationName, fullName, email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create workspace");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-wide">
        <Link href="/" className="brand">
          <span className="brand-mark">F</span>
          <span><strong>Fieldline</strong><small>customer workspace</small></span>
        </Link>
        <div className="auth-intro">
          <span className="eyebrow">Create workspace</span>
          <h1>Start with clean customer context.</h1>
          <p>Your organization gets its own tenant, pipeline, audit trail, and workspace.</p>
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>Organization<input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required /></label>
          <label>Your name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" /></label>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>
            Password
            <input type="password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <small className="field-hint">Use at least 12 characters.</small>
          </label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="button button-primary" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
        </form>
        <p className="auth-footer">Already have access? <Link href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
