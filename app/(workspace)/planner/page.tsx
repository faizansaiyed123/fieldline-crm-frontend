"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { DailyPlannerResponse, PlannerItem } from "@/lib/types";
import { Badge, SectionTitle, StatCard } from "@/components/ui";

export default function PlannerPage() {
  const { accessToken, organizationId } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const planner = useQuery({
    queryKey: ["planner", organizationId],
    enabled,
    queryFn: () => apiFetch<DailyPlannerResponse>(`${prefix}/work-planner?limit=20`, {}, accessToken),
  });

  const items = planner.data?.items ?? [];
  const urgent = items.filter((item) => item.priority >= 90).length;
  const opportunities = items.filter((item) => item.entity_type === "opportunity").length;
  const contacts = items.filter((item) => item.entity_type === "contact").length;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Personal productivity"
        title="My work today"
        description="A deterministic work plan assembled from overdue work, inactivity, stuck pipeline, and explicit customer evidence."
        action={<div className="live-chip"><span/>Rules based</div>}
      />

      <div className="stats-grid compact">
        <StatCard label="Today" value={items.length} detail="recommended actions" accent="blue" />
        <StatCard label="Urgent" value={urgent} detail="priority 90+" accent="amber" />
        <StatCard label="Opportunities" value={opportunities} detail="pipeline actions" accent="green" />
        <StatCard label="Contacts" value={contacts} detail="relationship actions" />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">Execution queue</span><h2>Start at the top. Every item explains why.</h2></div>
          <span className="toolbar-meta">{planner.data?.generated_at ? new Date(planner.data.generated_at).toLocaleTimeString() : "Loading"}</span>
        </div>
        {planner.isError ? (
          <div className="form-error" style={{ margin: 16 }}>{(planner.error as Error).message}</div>
        ) : items.length ? (
          <div className="planner-list">
            {items.map((item) => <PlannerRow key={`${item.entity_type}-${item.entity_id}`} item={item} />)}
          </div>
        ) : !planner.isLoading ? (
          <div className="panel-empty">No urgent work surfaced. Your operating queue is clear.</div>
        ) : (
          <div className="panel-empty">Assembling today’s work…</div>
        )}
      </section>
    </div>
  );
}

function PlannerRow({ item }: { item: PlannerItem }) {
  const tone = item.priority >= 90 ? "danger" : item.priority >= 70 ? "warning" : "info";
  return (
    <article className="planner-row">
      <div className="planner-priority"><strong>{item.priority}</strong><span>priority</span></div>
      <div className="planner-main">
        <div className="planner-title"><strong>{item.title}</strong><Badge tone={tone}>{item.entity_type}</Badge></div>
        <p>{item.reason}</p>
        <div className="planner-next"><span>NEXT</span>{item.next_action}</div>
        <div className="planner-evidence">{item.evidence.map((entry) => <span key={entry}>{entry}</span>)}</div>
      </div>
      <div className="planner-meta">
        {item.due_at ? <small>Due {new Date(item.due_at).toLocaleDateString()}</small> : null}
        {item.last_activity_at ? <small>Last activity {new Date(item.last_activity_at).toLocaleDateString()}</small> : null}
      </div>
    </article>
  );
}
