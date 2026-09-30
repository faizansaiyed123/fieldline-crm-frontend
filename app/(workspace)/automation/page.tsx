"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { AutomationRun } from "@/lib/types";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";

export default function AutomationPage() {
  const { accessToken, organizationId, user } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const isAdmin = user?.memberships[0]?.role !== "member";

  const runs = useQuery({
    queryKey: ["automation-runs", organizationId],
    enabled: enabled && isAdmin,
    queryFn: () => apiFetch<AutomationRun[]>(`${prefix}/automation/runs?limit=50`, {}, accessToken),
  });

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Automation"
        title="Execution history"
        description="Automation is visible here on purpose: what triggered, what ran, and what the system changed."
      />
      {!isAdmin ? (
        <div className="form-error">Owner/admin access is required to inspect workflow execution history.</div>
      ) : runs.data?.length ? (
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Recent runs</span><h2>Auditable automation activity</h2></div><span className="toolbar-meta">{runs.data.length} runs</span></div>
          <div className="automation-list">
            {runs.data.map((run) => (
              <article key={run.id} className="automation-row">
                <div className="automation-status"><Badge tone={run.status === "completed" ? "success" : "warning"}>{run.status}</Badge><small>{new Date(run.created_at).toLocaleString()}</small></div>
                <div className="automation-copy">
                  <strong>{run.workflow}</strong>
                  <span>Trigger: {run.trigger}</span>
                  <p>{run.action_type === "create_task" ? "Created a follow-up task" : run.action_type}</p>
                </div>
                <div className="automation-event"><small>EVENT KEY</small><code>{run.event_key}</code></div>
                <div className="automation-result"><small>RESULT</small><code>{run.result ? JSON.stringify(run.result) : "—"}</code></div>
              </article>
            ))}
          </div>
        </section>
      ) : !runs.isLoading ? (
        <EmptyState title="No automation runs yet" description="When a workflow fires, its execution record will appear here with its event key and result." />
      ) : (
        <div className="panel panel-empty">Loading workflow history…</div>
      )}
    </div>
  );
}
