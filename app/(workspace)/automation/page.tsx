"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { hasAdminAccess } from "@/lib/permissions";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import type { AutomationRule, AutomationRun } from "@/lib/types";
import { Badge, Button, EmptyState, ErrorState, SectionTitle } from "@/components/ui";

export default function AutomationPage() {
  const { accessToken, organizationId, user } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const isAdmin = hasAdminAccess(user?.memberships[0]?.role);
  const [creating, setCreating] = useState(false);
  useDrawerBehavior(creating, () => setCreating(false));
  const queryClient = useQueryClient();

  const runs = useQuery({
    queryKey: ["automation-runs", organizationId],
    enabled: enabled && isAdmin,
    queryFn: () => apiFetch<AutomationRun[]>(`${prefix}/automation/runs?limit=50`, {}, accessToken),
  });

  const rules = useQuery({
    queryKey: ["automation-rules", organizationId],
    enabled: enabled && isAdmin,
    queryFn: () => apiFetch<AutomationRule[]>(`${prefix}/automation/rules`, {}, accessToken),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<AutomationRule>(`${prefix}/automation/rules`, { method: "POST", body: input }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automation-rules", organizationId] });
      setCreating(false);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch<AutomationRule>(`${prefix}/automation/rules/${id}`, { method: "PATCH", body: { enabled } }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automation-rules", organizationId] });
    },
  });

  if (!isAdmin) {
    return <div className="page"><div className="form-error">Owner/admin access is required to inspect and manage automation.</div></div>;
  }

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Automation"
        title="Rules & execution"
        description="Keep deterministic workflow automation visible, editable, and auditable."
        action={<Button onClick={() => setCreating(true)}>Create rule</Button>}
      />

      {rules.isError ? <ErrorState description={(rules.error as Error).message} onRetry={() => void rules.refetch()} /> : null}
      {runs.isError ? <ErrorState description={(runs.error as Error).message} onRetry={() => void runs.refetch()} /> : null}

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">Rules</span><h2>Active workflow definitions</h2></div>
          <span className="toolbar-meta">{rules.data?.length ?? 0} rules</span>
        </div>
        {rules.data?.length ? (
          <div className="rule-list">
            {rules.data.map((rule) => (
              <div key={rule.id} className="rule-row automation-rule-row">
                <div>
                  <strong>{rule.name}</strong>
                  <p>{rule.trigger} → {rule.action_type}: {rule.action_config.title} · due in {rule.action_config.due_days} day(s)</p>
                </div>
                <Button
                  variant={rule.enabled ? "secondary" : "ghost"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: rule.id, enabled: !rule.enabled })}
                >
                  {rule.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            ))}
          </div>
        ) : !rules.isLoading ? (
          <EmptyState title="No automation rules" description="Create a deterministic win/loss follow-up rule to turn business events into auditable tasks." />
        ) : (
          <div className="panel-empty">Loading automation rules…</div>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><div><span className="eyebrow">Execution history</span><h2>Auditable automation activity</h2></div><span className="toolbar-meta">{runs.data?.length ?? 0} recent runs</span></div>
        {runs.data?.length ? (
          <div className="automation-list">
            {runs.data.map((run) => (
              <article key={run.id} className="automation-row">
                <div className="automation-status"><Badge tone={run.status === "completed" ? "success" : "warning"}>{run.status}</Badge><small>{new Date(run.created_at).toLocaleString()}</small></div>
                <div className="automation-copy"><strong>{run.workflow}</strong><span>Trigger: {run.trigger}</span><p>{run.action_type === "create_task" ? "Created a follow-up task" : run.action_type}</p></div>
                <div className="automation-event"><small>EVENT KEY</small><code>{run.event_key}</code></div>
                <div className="automation-result"><small>RESULT</small><code>{run.result ? JSON.stringify(run.result) : "—"}</code></div>
              </article>
            ))}
          </div>
        ) : !runs.isLoading ? (
          <EmptyState title="No automation runs yet" description="When a workflow fires, its execution record will appear here with its event key and result." />
        ) : (
          <div className="panel-empty">Loading workflow history…</div>
        )}
      </section>

      {creating ? (
        <CreateAutomationRule
          onClose={() => setCreating(false)}
          onCreate={(input) => create.mutate(input)}
          busy={create.isPending}
          error={create.error instanceof Error ? create.error.message : ""}
        />
      ) : null}
    </div>
  );
}

function CreateAutomationRule({
  onClose,
  onCreate,
  busy,
  error,
}: {
  onClose: () => void;
  onCreate: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationRule["trigger"]>("opportunity.won");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<AutomationRule["action_config"]["priority"]>("normal");
  const [dueDays, setDueDays] = useState("1");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      name,
      trigger,
      action_type: "create_task",
      action_config: { title, priority, due_days: Number(dueDays) },
      enabled: true,
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="automation-rule-title">
        <div className="drawer-head"><div><span className="eyebrow">New rule</span><h2 id="automation-rule-title">Create automation</h2><p>Rules are deterministic and produce auditable task records.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></label>
          <label>Trigger<select value={trigger} onChange={(event) => setTrigger(event.target.value as AutomationRule["trigger"])}><option value="opportunity.won">Opportunity won</option><option value="opportunity.lost">Opportunity lost</option></select></label>
          <label>Task title<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} /></label>
          <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as AutomationRule["action_config"]["priority"])}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
          <label>Due in days<input type="number" min="0" max="30" value={dueDays} onChange={(event) => setDueDays(event.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create rule"}</Button>
        </form>
      </aside>
    </div>
  );
}
