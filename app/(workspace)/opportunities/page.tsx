"use client";

import { FormEvent, useState } from "react";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { Opportunity, OpportunityList, StuckOpportunityResponse } from "@/lib/types";
import { Badge, Button, SectionTitle, StatCard } from "@/components/ui";

type Stage = { id: string; name: string; order_index: number; win_probability: string | number; is_closed: boolean; is_won: boolean };

export default function OpportunitiesPage() {
  const { accessToken, organizationId } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const enabled = Boolean(accessToken && organizationId);
  const queryClient = useQueryClient();
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const opportunities = useQuery({
    queryKey: ["opportunities", organizationId],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?page_size=100`, {}, accessToken),
  });
  const stages = useQuery({
    queryKey: ["pipeline-stages", organizationId],
    enabled,
    queryFn: () => apiFetch<Stage[]>(prefix + "/pipeline/stages", {}, accessToken),
  });
  const stuck = useQuery({
    queryKey: ["pipeline-stuck", organizationId],
    enabled,
    queryFn: () => apiFetch<StuckOpportunityResponse>(prefix + "/pipeline/stuck?limit=10", {}, accessToken),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<Opportunity>(`${prefix}/opportunities`, { method: "POST", body: input }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", organizationId] });
      setShowCreate(false);
    },
  });

  const items = opportunities.data?.items ?? [];
  const open = items.filter((item) => item.status === "open").length;
  const won = items.filter((item) => item.status === "won").length;
  const lost = items.filter((item) => item.status === "lost").length;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Sales"
        title="Pipeline"
        description="A clean operational view of open, won, and lost opportunities."
        action={<Button onClick={() => setShowCreate(true)}>New opportunity</Button>}
      />
      <div className="stats-grid compact">
        <StatCard label="Open" value={open} detail="active opportunities" accent="blue" />
        <StatCard label="Won" value={won} detail="closed won" accent="green" />
        <StatCard label="Lost" value={lost} detail="closed lost" accent="amber" />
      </div>
      <section className="panel stuck-panel">
        <div className="panel-head">
          <div><span className="eyebrow">Pipeline intelligence</span><h2>Opportunities that look stuck</h2><p>Threshold: {stuck.data?.configured_threshold_days ?? "—"} days in stage.</p></div>
          <Badge tone="warning">{stuck.data?.items.length ?? 0} flagged</Badge>
        </div>
        {stuck.data?.items.length ? (
          <div className="stuck-list">
            {stuck.data.items.map((item) => (
              <article key={item.id} className="stuck-item">
                <div className="stuck-age"><strong>{item.stage_age_days}</strong><span>days in {item.stage_name}</span></div>
                <div className="stuck-copy"><strong>{item.name}</strong><p>{item.reasons.join(" · ")}</p><small>Recommended: {item.recommended_action}</small></div>
                <Badge tone={item.has_next_action ? "info" : "danger"}>{item.has_next_action ? "Next action set" : "No next action"}</Badge>
              </article>
            ))}
          </div>
        ) : !stuck.isLoading ? <div className="panel-empty">No stuck opportunities detected under the current rules.</div> : <div className="panel-empty">Checking stage age and next actions…</div>}
      </section>
      <div className="panel table-panel">
        <table className="data-table">
          <thead><tr><th>Opportunity</th><th>Amount</th><th>Status</th><th>Close date</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.name}</strong><small>{item.lost_reason ?? "Stage-driven workflow"}</small></td>
                <td>{item.amount ? `₹${Number(item.amount).toLocaleString("en-IN")}` : "—"}</td>
                <td><Badge tone={item.status === "won" ? "success" : item.status === "lost" ? "danger" : "info"}>{item.status}</Badge></td>
                <td>{item.expected_close_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !opportunities.isLoading ? <div className="panel-empty">No opportunities yet.</div> : null}
      </div>
      {showCreate ? (
        <CreateOpportunity
          stages={stages.data ?? []}
          onClose={() => setShowCreate(false)}
          onCreate={(input) => create.mutate(input)}
          busy={create.isPending}
          error={create.error instanceof Error ? create.error.message : ""}
        />
      ) : null}
    </div>
  );
}

function CreateOpportunity({
  stages,
  onClose,
  onCreate,
  busy,
  error,
}: {
  stages: Stage[];
  onClose: () => void;
  onCreate: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [stageId, setStageId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");

  React.useEffect(() => {
    if (!stageId && stages[0]?.id) setStageId(stages[0].id);
  }, [stageId, stages]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      name,
      amount: amount ? Number(amount) : null,
      stage_id: stageId,
      expected_close_date: expectedCloseDate || null,
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <div className="drawer-head"><div><span className="eyebrow">New record</span><h2>New opportunity</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label>Stage<select value={stageId} onChange={(e) => setStageId(e.target.value)} required>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
          <label>Expected close<input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy || !stageId}>{busy ? "Creating…" : "Create opportunity"}</Button>
        </form>
      </aside>
    </div>
  );
}
