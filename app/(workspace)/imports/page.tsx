"use client";

import { ChangeEvent, useState } from "react";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { hasAdminAccess } from "@/lib/permissions";
import type { ImportCommitResponse, ImportPreview } from "@/lib/types";
import { Badge, Button, SectionTitle } from "@/components/ui";

export default function ImportsPage() {
  const { accessToken, organizationId, user } = useAuth();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canImport = hasAdminAccess(user?.memberships[0]?.role);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      const data = await apiFetch<ImportPreview>(
        `${prefix}/imports/contacts/preview`,
        { method: "POST", body: form },
        accessToken,
      );
      setPreview(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function commit(dryRun: boolean) {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await apiFetch<ImportCommitResponse>(
        `${prefix}/imports/${preview.id}/commit`,
        { method: "POST", body: { dry_run: dryRun } },
        accessToken,
      );
      setMessage(
        dryRun
          ? `Dry run: ${result.would_create} contacts would be created.`
          : `Imported ${result.committed_rows} contacts successfully.`,
      );
      if (!dryRun) {
        setPreview((current) => current ? { ...current, status: result.status, committed_rows: result.committed_rows, completed_at: new Date().toISOString() } : current);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle eyebrow="Data operations" title="Import contacts safely." description="Preview, validate, dry-run, then commit a whole import atomically." />
      {!canImport ? <div className="callout">Owner/admin access is required for imports.</div> : null}
      <div className="import-hero">
        <div><span className="eyebrow">Validated pipeline</span><h2>Nothing writes until you commit.</h2><p>CSV input is normalized and checked against the organization before contact rows are created.</p></div>
        <div className="import-drop">
          {canImport ? (
            <><label htmlFor="csv-upload" className="drop-target"><strong>{busy ? "Processing…" : "Choose a CSV file"}</strong><span>UTF-8 · validated headers · bounded rows</span></label><input id="csv-upload" type="file" accept=".csv,text/csv" onChange={upload} hidden /></>
          ) : <span>Owner/admin access required.</span>}
        </div>
      </div>
      {message ? <div className="callout" role="status" aria-live="polite">{message}</div> : null}
      {preview ? (
        <div className="content-grid two-up">
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">Preview</span><h2>{preview.filename}</h2></div><Badge tone={preview.status === "completed" ? "success" : "warning"}>{preview.status}</Badge></div>
            <div className="stats-grid compact">
              <StatInline label="Rows" value={preview.total_rows} />
              <StatInline label="Valid" value={preview.valid_rows} />
              <StatInline label="Invalid" value={preview.invalid_rows} />
            </div>
            {preview.errors.length ? <div className="import-errors">{preview.errors.map((item) => <div key={item.row_number}><strong>Row {item.row_number}</strong><span>{item.errors.join(" · ")}</span></div>)}</div> : <div className="panel-empty">All rows passed validation.</div>}
          </section>
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">Commit</span><h2>Review before writing</h2></div></div>
            <p className="muted" style={{ padding: "18px 20px 0" }}>The backend revalidates duplicates at commit time and rolls the transaction back on conflict.</p>
            <div className="action-stack">
              <Button variant="secondary" disabled={busy || Boolean(preview.invalid_rows) || preview.status === "completed"} onClick={() => void commit(true)}>Dry run</Button>
              <Button disabled={busy || Boolean(preview.invalid_rows) || preview.status === "completed"} onClick={() => void commit(false)}>Commit import</Button>
            </div>
          </section>
        </div>
      ) : (
        <div className="panel panel-empty">Upload a contact CSV to see row-level validation before anything is committed.</div>
      )}
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: number }) {
  return <div className="stat-card stat-neutral"><span className="stat-label">{label}</span><strong>{value}</strong></div>;
}
