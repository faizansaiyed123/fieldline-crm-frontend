"use client";

import { FormEvent, useState } from "react";
import * as React from "react";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { Opportunity, OpportunityList, StuckOpportunityResponse } from "@/lib/types";
import { Badge, Button, ErrorState, SectionTitle, StatCard } from "@/components/ui";

type Stage = { id: string; name: string; order_index: number; win_probability: string | number; is_closed: boolean; is_won: boolean };

export default function OpportunitiesPage() {
  const { accessToken, organizationId } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const enabled = Boolean(accessToken && organizationId);
  const queryClient = useQueryClient();
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const opportunities = useQuery({
    queryKey: ["opportunities", organizationId, page],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?page=${page}&page_size=${pageSize}`, {}, accessToken),
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

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiFetch<Opportunity>(`${prefix}/opportunities/${id}`, { method: "PATCH", body: input }, accessToken),
    onSuccess: (opportunity) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", organizationId] });
      setSelected(opportunity);
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${prefix}/opportunities/${id}`, { method: "DELETE" }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities", organizationId] });
      setSelected(null);
    },
  });

  const openCount = useQuery({
    queryKey: ["opportunity-count", organizationId, "open"],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?status=open&page=1&page_size=1`, {}, accessToken),
  });
  const wonCount = useQuery({
    queryKey: ["opportunity-count", organizationId, "won"],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?status=won&page=1&page_size=1`, {}, accessToken),
  });
  const lostCount = useQuery({
    queryKey: ["opportunity-count", organizationId, "lost"],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?status=lost&page=1&page_size=1`, {}, accessToken),
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
  const open = openCount.data?.total ?? 0;
  const won = wonCount.data?.total ?? 0;
  const lost = lostCount.data?.total ?? 0;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Sales"
        title="Pipeline"
        description="A clean operational view of open, won, and lost opportunities."
        action={<Button onClick={() => setShowCreate(true)}>New opportunity</Button>}
      />
      {opportunities.isError ? (
        <ErrorState description={(opportunities.error as Error).message} onRetry={() => void opportunities.refetch()} />
      ) : null}
      {openCount.isError || wonCount.isError || lostCount.isError ? (
        <div className="callout" role="status">Pipeline summary is temporarily unavailable; the record list remains usable.</div>
      ) : null}
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
        {stuck.isError ? <ErrorState description={(stuck.error as Error).message} onRetry={() => void stuck.refetch()} /> : stuck.data?.items.length ? (
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
              <tr key={item.id} className="click-row" onClick={() => setSelected(item)}>
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
      {opportunities.data && opportunities.data.total > pageSize ? (
        <div className="pagination" aria-label="Opportunities pagination">
          <span>Page {opportunities.data.page} of {Math.ceil(opportunities.data.total / opportunities.data.page_size)}</span>
          <div>
            <Button variant="secondary" disabled={page <= 1 || opportunities.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button variant="secondary" disabled={page >= Math.ceil(opportunities.data.total / opportunities.data.page_size) || opportunities.isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
      {selected ? (
        <OpportunityDrawer
          opportunity={selected}
          stages={stages.data ?? []}
          onClose={() => setSelected(null)}
          onSave={(input) => update.mutate({ id: selected.id, input })}
          onArchive={() => archive.mutate(selected.id)}
          busy={update.isPending || archive.isPending}
          error={update.error instanceof Error ? update.error.message : archive.error instanceof Error ? archive.error.message : ""}
        />
      ) : null}
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


function OpportunityDrawer({
  opportunity,
  stages,
  onClose,
  onSave,
  onArchive,
  busy,
  error,
}: {
  opportunity: Opportunity;
  stages: Stage[];
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
  onArchive: () => void;
  busy: boolean;
  error: string;
}) {
  const currentStage = stages.find((stage) => stage.id === opportunity.stage_id);
  const [name, setName] = useState(opportunity.name);
  useDrawerBehavior(true, onClose);
  const [amount, setAmount] = useState(opportunity.amount ?? "");
  const [stageId, setStageId] = useState(opportunity.stage_id);
  const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity.expected_close_date ?? "");
  const [lostReason, setLostReason] = useState(opportunity.lost_reason ?? "");

  React.useEffect(() => {
    setName(opportunity.name);
    setAmount(opportunity.amount ?? "");
    setStageId(opportunity.stage_id);
    setExpectedCloseDate(opportunity.expected_close_date ?? "");
    setLostReason(opportunity.lost_reason ?? "");
  }, [opportunity]);

  const selectedStage = stages.find((stage) => stage.id === stageId) ?? currentStage;
  const willBeLost = Boolean(selectedStage?.is_closed && !selectedStage.is_won);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      name,
      amount: amount ? Number(amount) : null,
      stage_id: stageId,
      expected_close_date: expectedCloseDate || null,
      lost_reason: willBeLost ? lostReason : null,
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="opportunity-dialog-title">
        <div className="drawer-head">
          <div><span className="eyebrow">Opportunity detail</span><h2 id="opportunity-dialog-title">{opportunity.name}</h2><p>Status is derived from its pipeline stage.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Stage<select value={stageId} onChange={(event) => setStageId(event.target.value)} required>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
          {willBeLost ? <label>Lost reason<input value={lostReason} onChange={(event) => setLostReason(event.target.value)} required maxLength={300} /></label> : null}
          <label>Expected close<input type="date" value={expectedCloseDate} onChange={(event) => setExpectedCloseDate(event.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy || !stageId}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button variant="danger" disabled={busy} onClick={() => { if (window.confirm("Archive this opportunity?")) onArchive(); }}>Archive opportunity</Button>
        </form>
      </aside>
    </div>
  );
}
