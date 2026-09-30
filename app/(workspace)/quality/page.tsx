"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import { apiFetch } from "@/lib/api";
import { hasAdminAccess } from "@/lib/permissions";
import type { DataQualityResponse, DuplicateCandidate, MergeResponse } from "@/lib/types";
import { Badge, Button, SectionTitle, StatCard, ErrorState } from "@/components/ui";

export default function QualityPage() {
  const { accessToken, organizationId, user } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const [selected, setSelected] = useState<DuplicateCandidate | null>(null);
  useDrawerBehavior(Boolean(selected), () => setSelected(null));
  const [survivor, setSurvivor] = useState<"first" | "second">("first");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const report = useQuery({
    queryKey: ["quality", organizationId],
    enabled,
    queryFn: () => apiFetch<DataQualityResponse>(`${prefix}/data-quality`, {}, accessToken),
  });

  const merge = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a duplicate candidate");
      const survivorId = survivor === "first" ? selected.first_id : selected.second_id;
      const mergedId = survivor === "first" ? selected.second_id : selected.first_id;
      return apiFetch<MergeResponse>(
        `${prefix}/data-quality/${selected.entity_type}/${mergedId}/merge`,
        { method: "POST", body: { survivor_id: survivorId } },
        accessToken,
      );
    },
    onSuccess: () => {
      setMessage("Merge completed. Relationships and audit history were preserved.");
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["quality", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["contacts", organizationId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Merge failed"),
  });

  const summary = report.data?.summary;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Data integrity"
        title="Data Quality Center"
        description="Find duplicate, incomplete, stale, and operationally risky CRM records before they become downstream problems."
        action={<div className="live-chip"><span/>Deterministic</div>}
      />

      {message ? <div className="callout" role="status">{message}</div> : null}
      {report.isError ? <ErrorState description={(report.error as Error).message} onRetry={() => void report.refetch()} /> : null}

      <div className="stats-grid">
        <StatCard label="Issues" value={summary?.total_issues ?? "—"} detail="actionable data-quality findings" accent="amber" />
        <StatCard label="Duplicates" value={(summary?.duplicate_contacts ?? 0) + (summary?.duplicate_companies ?? 0)} detail="contact + company candidates" accent="blue" />
        <StatCard label="High severity" value={summary?.high ?? "—"} detail="needs review first" />
        <StatCard label="Stale contacts" value={summary?.stale_contacts ?? "—"} detail="lead/prospect inactivity" accent="green" />
      </div>

      {!report.isError ? <div className="content-grid two-up">
        <section className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">Duplicate candidates</span><h2>Review before merging.</h2></div>
            <Badge tone="warning">{report.data?.duplicate_candidates.length ?? 0} candidates</Badge>
          </div>
          <div className="candidate-list">
            {report.data?.duplicate_candidates.length ? report.data.duplicate_candidates.map((candidate) => (
              <button key={`${candidate.entity_type}-${candidate.first_id}-${candidate.second_id}`} className={selected === candidate ? "candidate active" : "candidate"} onClick={() => { setSelected(candidate); setSurvivor("first"); }}>
                <div className="candidate-score">{Math.round(candidate.similarity * 100)}%</div>
                <div className="candidate-copy">
                  <strong>{candidate.first_label}</strong>
                  <span>vs {candidate.second_label}</span>
                  <small>{candidate.reasons.join(" · ")}</small>
                </div>
                <Badge tone={candidate.entity_type === "contact" ? "info" : "neutral"}>{candidate.entity_type}</Badge>
              </button>
            )) : <div className="panel-empty">No duplicate candidates detected.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Issue ledger</span><h2>What needs review?</h2></div></div>
          <div className="quality-ledger">
            {report.data?.issues.map((issue) => (
              <div key={`${issue.code}-${issue.entity_id}`} className="quality-issue">
                <Badge tone={issue.severity === "high" ? "danger" : issue.severity === "medium" ? "warning" : "neutral"}>{issue.severity}</Badge>
                <div><strong>{issue.title}</strong><p>{issue.detail}</p></div>
                <small>{issue.fixable ? "Guided fix" : "Review"}</small>
              </div>
            ))}
            {!report.data?.issues.length && !report.isLoading ? <div className="panel-empty">The workspace is clean.</div> : null}
          </div>
        </section>
      </div> : null}

      {selected ? (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="merge-dialog-title" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div><span className="eyebrow">Controlled merge</span><h2 id="merge-dialog-title">Choose the survivor</h2><p>Only the selected record remains active. Linked history is reassigned transactionally.</p></div>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>
            <div className="compare-grid">
              <button className={survivor === "first" ? "compare-card active" : "compare-card"} onClick={() => setSurvivor("first")}><span>RECORD A</span><strong>{selected.first_label}</strong><small>{selected.reasons.join(" · ")}</small></button>
              <button className={survivor === "second" ? "compare-card active" : "compare-card"} onClick={() => setSurvivor("second")}><span>RECORD B</span><strong>{selected.second_label}</strong><small>{selected.reasons.join(" · ")}</small></button>
            </div>
            <div className="merge-warning"><strong>This is irreversible at the record level.</strong><p>The merged record is soft-deleted, related activities/tasks/opportunities move to the survivor, and two audit events are written.</p></div>
            {hasAdminAccess(user?.memberships[0]?.role) ? <Button disabled={merge.isPending} onClick={() => merge.mutate()}>{merge.isPending ? "Merging…" : `Merge into ${survivor === "first" ? "Record A" : "Record B"}`}</Button> : <div className="form-error">Owner/admin access required.</div>}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
