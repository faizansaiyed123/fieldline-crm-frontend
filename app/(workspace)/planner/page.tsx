"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import type { DailyPlannerResponse, PlannerItem, TaskItem } from "@/lib/types";
import { Badge, Button, SectionTitle, StatCard } from "@/components/ui";

export default function PlannerPage() {
  const { accessToken, organizationId } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const queryClient = useQueryClient();
  const [creatingTask, setCreatingTask] = useState(false);
  useDrawerBehavior(creatingTask, () => setCreatingTask(false));

  const planner = useQuery({
    queryKey: ["planner", organizationId],
    enabled,
    queryFn: () => apiFetch<DailyPlannerResponse>(`${prefix}/work-planner?limit=20`, {}, accessToken),
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) =>
      apiFetch<TaskItem>(`${prefix}/tasks/${taskId}`, { method: "PATCH", body: { completed: true } }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planner", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["attention", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["quality", organizationId] });
    },
  });

  const createTask = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<TaskItem>(`${prefix}/tasks`, { method: "POST", body: input }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planner", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["attention", organizationId] });
      setCreatingTask(false);
    },
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
        action={
          <div className="panel-actions">
            <div className="live-chip"><span/>Rules based</div>
            <Button onClick={() => setCreatingTask(true)}>New task</Button>
          </div>
        }
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
            {items.map((item) => (
              <PlannerRow
                key={`${item.entity_type}-${item.entity_id}`}
                item={item}
                busy={completeTask.isPending}
                onCompleteTask={item.entity_type === "task" ? () => completeTask.mutate(item.entity_id) : undefined}
              />
            ))}
          </div>
        ) : !planner.isLoading ? (
          <div className="panel-empty">No urgent work surfaced. Your operating queue is clear.</div>
        ) : (
          <div className="panel-empty">Assembling today’s work…</div>
        )}
      </section>

      {creatingTask ? (
        <CreateTaskDrawer
          onClose={() => setCreatingTask(false)}
          onCreate={(input) => createTask.mutate(input)}
          busy={createTask.isPending}
          error={createTask.error instanceof Error ? createTask.error.message : ""}
        />
      ) : null}
    </div>
  );
}

function PlannerRow({
  item,
  busy,
  onCompleteTask,
}: {
  item: PlannerItem;
  busy?: boolean;
  onCompleteTask?: () => void;
}) {
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
        {onCompleteTask ? (
          <Button variant="secondary" disabled={busy} onClick={onCompleteTask}>
            Complete task
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function CreateTaskDrawer({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [dueDate, setDueDate] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      title,
      description: description || null,
      priority,
      due_at: dueDate ? new Date(`${dueDate}T09:00:00Z`).toISOString() : null,
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="new-task-title">
        <div className="drawer-head">
          <div><span className="eyebrow">Follow-through</span><h2 id="new-task-title">New task</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>Task title<input value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} required /></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" /></label>
          <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
          <label>Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create task"}</Button>
        </form>
      </aside>
    </div>
  );
}
