"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import type {
  ActivityItem,
  Company,
  CompanyList,
  Contact,
  ContactList,
  RelationshipHealth,
  TaskItem,
  TimelineResponse,
} from "@/lib/types";
import { Badge, Button, EmptyState, SectionTitle } from "@/components/ui";

export default function ContactsPage() {
  const { accessToken, organizationId } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<Contact | null>(null);
  const [health, setHealth] = useState<RelationshipHealth | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const enabled = Boolean(accessToken && organizationId);
  const queryClient = useQueryClient();
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const contacts = useQuery({
    queryKey: ["contacts", organizationId, debouncedQuery, page],
    enabled,
    queryFn: () =>
      apiFetch<ContactList>(
        `${prefix}/contacts?page=${page}&page_size=${pageSize}${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""}`,
        {},
        accessToken,
      ),
  });

  const companies = useQuery({
    queryKey: ["companies-select", organizationId],
    enabled,
    queryFn: () =>
      apiFetch<CompanyList>(
        `${prefix}/companies?page=1&page_size=100`,
        {},
        accessToken,
      ),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Record<string, unknown>;
    }) =>
      apiFetch<Contact>(
        `${prefix}/contacts/${id}`,
        { method: "PATCH", body: input },
        accessToken,
      ),
    onSuccess: (contact) => {
      void queryClient.invalidateQueries({
        queryKey: ["contacts", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contacts", "dashboard", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["quality", organizationId],
      });
      setSelected(contact);
      setError("");
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not update contact",
      ),
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(
        `${prefix}/contacts/${id}`,
        { method: "DELETE" },
        accessToken,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contacts", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contacts", "dashboard", organizationId],
      });
      setSelected(null);
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not archive contact",
      ),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<Contact>(
        `${prefix}/contacts`,
        { method: "POST", body: input },
        accessToken,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contacts", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["contacts", "dashboard", organizationId],
      });
      setShowCreate(false);
      setError("");
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not create contact",
      ),
  });

  async function refreshContactContext(contactId: string) {
    const [healthResult, timelineResult] = await Promise.allSettled([
      apiFetch<RelationshipHealth>(
        `${prefix}/contacts/${contactId}/relationship-health`,
        {},
        accessToken,
      ),
      apiFetch<TimelineResponse>(
        `${prefix}/contacts/${contactId}/timeline?limit=20`,
        {},
        accessToken,
      ),
    ]);
    if (healthResult.status === "fulfilled") setHealth(healthResult.value);
    if (timelineResult.status === "fulfilled")
      setTimeline(timelineResult.value);
  }

  async function openContact(contact: Contact) {
    setSelected(contact);
    setHealth(null);
    setTimeline(null);
    await refreshContactContext(contact.id);
  }

  const logActivity = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<ActivityItem>(
        `${prefix}/engagement/activities`,
        { method: "POST", body: input },
        accessToken,
      ),
    onSuccess: async () => {
      if (selected) await refreshContactContext(selected.id);
      void queryClient.invalidateQueries({
        queryKey: ["attention", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["planner", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["quality", organizationId],
      });
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not log activity",
      ),
  });

  const createTask = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<TaskItem>(
        `${prefix}/engagement/tasks`,
        { method: "POST", body: input },
        accessToken,
      ),
    onSuccess: async () => {
      if (selected) await refreshContactContext(selected.id);
      void queryClient.invalidateQueries({
        queryKey: ["attention", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["planner", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["quality", organizationId],
      });
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not create task",
      ),
  });

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Customers"
        title="Contacts"
        description="Find people, inspect relationship signal, and keep context connected."
        action={
          <Button
            onClick={() => {
              setShowCreate(true);
              setError("");
            }}
          >
            Add contact
          </Button>
        }
      />
      <div className="toolbar">
        <input
          aria-label="Search contacts"
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <span className="toolbar-meta">
          {contacts.data?.total ?? 0} contacts
        </span>
      </div>
      <div className="panel table-panel">
        {contacts.isError ? (
          <div className="form-error" style={{ margin: 16 }}>
            Unable to load contacts. {(contacts.error as Error)?.message}
          </div>
        ) : contacts.data?.items.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Lifecycle</th>
                <th>Email</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {contacts.data.items.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <button
                      className="row-link"
                      onClick={() => void openContact(contact)}
                      aria-label={
                        "Inspect " +
                        contact.first_name +
                        " " +
                        contact.last_name
                      }
                    >
                      <strong>
                        {contact.first_name} {contact.last_name}
                      </strong>
                      <small>{contact.job_title ?? "—"}</small>
                    </button>
                  </td>
                  <td>{contact.job_title ?? "—"}</td>
                  <td>
                    <Badge
                      tone={
                        contact.lifecycle === "customer"
                          ? "success"
                          : contact.lifecycle === "lead"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {contact.lifecycle}
                    </Badge>
                  </td>
                  <td>{contact.email ?? "—"}</td>
                  <td>
                    <button
                      className="detail-link-button"
                      onClick={() => void openContact(contact)}
                      aria-label={
                        "Inspect " +
                        contact.first_name +
                        " " +
                        contact.last_name +
                        " relationship"
                      }
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No contacts yet"
            description="Create your first contact or import a validated CSV from the Imports area."
          />
        )}
      </div>
      {contacts.data && contacts.data.total > pageSize ? (
        <div className="pagination" aria-label="Contacts pagination">
          <span>
            Page {contacts.data.page} of{" "}
            {Math.ceil(contacts.data.total / contacts.data.page_size)}
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={page <= 1 || contacts.isFetching}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={
                page >=
                  Math.ceil(contacts.data.total / contacts.data.page_size) ||
                contacts.isFetching
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <ContactDrawer
          contact={selected}
          companies={companies.data?.items ?? []}
          health={health}
          timeline={timeline}
          onClose={() => setSelected(null)}
          onSave={(input) => update.mutate({ id: selected.id, input })}
          onArchive={() => archive.mutate(selected.id)}
          onLogActivity={(input) => logActivity.mutate(input)}
          onCreateTask={(input) => createTask.mutate(input)}
          busy={
            update.isPending ||
            archive.isPending ||
            logActivity.isPending ||
            createTask.isPending
          }
          error={error}
        />
      ) : null}

      {showCreate ? (
        <CreateContact
          companies={companies.data?.items ?? []}
          onClose={() => setShowCreate(false)}
          onCreate={(input) => create.mutate(input)}
          busy={create.isPending}
          error={error}
        />
      ) : null}
    </div>
  );
}

function ContactDrawer({
  contact,
  companies,
  health,
  timeline,
  onClose,
  onSave,
  onArchive,
  onLogActivity,
  onCreateTask,
  busy,
  error,
}: {
  contact: Contact;
  companies: Company[];
  health: RelationshipHealth | null;
  timeline: TimelineResponse | null;
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
  onArchive: () => void;
  onLogActivity: (input: Record<string, unknown>) => void;
  onCreateTask: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [firstName, setFirstName] = useState(contact.first_name);
  useDrawerBehavior(true, onClose);
  const [lastName, setLastName] = useState(contact.last_name);
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact.job_title ?? "");
  const [lifecycle, setLifecycle] = useState(contact.lifecycle);
  const [companyId, setCompanyId] = useState(contact.company_id ?? "");

  const [activityType, setActivityType] = useState<
    "note" | "call" | "email" | "meeting"
  >("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityBody, setActivityBody] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">(
    "normal",
  );
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    setFirstName(contact.first_name);
    setLastName(contact.last_name);
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
    setJobTitle(contact.job_title ?? "");
    setLifecycle(contact.lifecycle);
    setCompanyId(contact.company_id ?? "");
  }, [contact]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      job_title: jobTitle || null,
      lifecycle,
      company_id: companyId || null,
    });
  }

  function submitActivity(event: FormEvent) {
    event.preventDefault();
    if (!activityTitle.trim()) return;
    onLogActivity({
      contact_id: contact.id,
      company_id: contact.company_id,
      activity_type: activityType,
      title: activityTitle,
      body: activityBody || null,
    });
    setActivityTitle("");
    setActivityBody("");
  }

  function submitTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    onCreateTask({
      contact_id: contact.id,
      company_id: contact.company_id,
      title: taskTitle,
      priority: taskPriority,
      due_at: taskDueDate
        ? new Date(`${taskDueDate}T09:00:00Z`).toISOString()
        : null,
    });
    setTaskTitle("");
    setTaskDueDate("");
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">Customer 360</span>
            <h2 id="relationship-drawer-title">
              {contact.first_name} {contact.last_name}
            </h2>
            <p>{contact.email ?? "No email on file"}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <section className="health-card" aria-label="Relationship health">
          <div className="health-score">{health?.score ?? "—"}</div>
          <div>
            <strong>
              {health?.band?.replace("_", " ") ?? "Loading signal"}
            </strong>
            <p>Deterministic relationship-health heuristic.</p>
          </div>
        </section>

        {health ? (
          <>
            <div className="mini-stats">
              <div>
                <span>30d activity</span>
                <strong>{health.activity_count_30d}</strong>
              </div>
              <div>
                <span>Open opps</span>
                <strong>{health.open_opportunity_count}</strong>
              </div>
              <div>
                <span>Overdue tasks</span>
                <strong>{health.overdue_task_count}</strong>
              </div>
            </div>
            <div className="evidence-list">
              <h3>Evidence</h3>
              {health.evidence.map((item) => (
                <div key={item.code}>
                  <span>
                    {item.impact > 0 ? "+" : ""}
                    {item.impact}
                  </span>
                  <div>
                    <strong>{item.code}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="panel-empty">Calculating relationship signal…</div>
        )}

        <div className="timeline-panel">
          <h3>Recent context</h3>
          {timeline?.items.length ? (
            <div className="timeline-list">
              {timeline.items.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="timeline-item">
                  <span className={`timeline-dot timeline-${item.kind}`} />
                  <div>
                    <div className="timeline-meta">
                      <Badge
                        tone={
                          item.kind === "audit"
                            ? "neutral"
                            : item.kind === "task"
                              ? "warning"
                              : "info"
                        }
                      >
                        {item.kind}
                      </Badge>
                      <time dateTime={item.timestamp}>
                        {new Date(item.timestamp).toLocaleString()}
                      </time>
                    </div>
                    <strong>{item.title}</strong>
                    {item.summary ? <p>{item.summary}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : timeline ? (
            <div className="panel-empty compact-empty">
              No recent context yet.
            </div>
          ) : (
            <div className="panel-empty compact-empty">
              Loading recent context…
            </div>
          )}
        </div>

        <div className="drawer-form-divider" />
        <form className="stack-form" onSubmit={submitActivity}>
          <div>
            <span className="eyebrow">Engagement</span>
            <h3 className="drawer-section-title">Log activity</h3>
          </div>
          <label>
            Activity type
            <select
              value={activityType}
              onChange={(e) =>
                setActivityType(
                  e.target.value as "note" | "call" | "email" | "meeting",
                )
              }
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
          </label>
          <label>
            Activity summary
            <input
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              placeholder="e.g., Discovery call with stakeholder"
              minLength={2}
              required
            />
          </label>
          <label>
            Notes
            <input
              value={activityBody}
              onChange={(e) => setActivityBody(e.target.value)}
              placeholder="Optional call notes or next steps"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={busy}>
            Record activity
          </Button>
        </form>

        <div className="drawer-form-divider" />
        <form className="stack-form" onSubmit={submitTask}>
          <div>
            <span className="eyebrow">Follow-through</span>
            <h3 className="drawer-section-title">Schedule follow-up task</h3>
          </div>
          <label>
            Task title
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g., Send pricing proposal"
              minLength={2}
              required
            />
          </label>
          <label>
            Task priority
            <select
              value={taskPriority}
              onChange={(e) =>
                setTaskPriority(e.target.value as "low" | "normal" | "high")
              }
            >
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Task due date
            <input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </label>
          <Button type="submit" variant="secondary" disabled={busy}>
            Add task
          </Button>
        </form>

        <div className="drawer-form-divider" />
        <form className="stack-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Edit record</span>
            <h3 className="drawer-section-title">Contact details</h3>
          </div>
          <label>
            First name
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </label>
          <label>
            Last name
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label>
            Job title
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </label>
          <label>
            Company
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
            >
              <option value="">No linked company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lifecycle
            <select
              value={lifecycle}
              onChange={(event) =>
                setLifecycle(event.target.value as Contact["lifecycle"])
              }
            >
              <option value="lead">lead</option>
              <option value="prospect">prospect</option>
              <option value="customer">customer</option>
              <option value="churned">churned</option>
            </select>
          </label>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Archive this contact?")) onArchive();
            }}
          >
            Archive contact
          </Button>
        </form>
      </aside>
    </div>
  );
}

function CreateContact({
  companies,
  onClose,
  onCreate,
  busy,
  error,
}: {
  companies: Company[];
  onClose: () => void;
  onCreate: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [lifecycle, setLifecycle] = useState("lead");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      job_title: jobTitle || null,
      company_id: companyId || null,
      lifecycle,
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">New record</span>
            <h2>Add contact</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>
            First name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>
          <label>
            Last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Job title
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </label>
          <label>
            Company
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">No linked company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lifecycle
            <select
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
            >
              <option>lead</option>
              <option>prospect</option>
              <option>customer</option>
              <option>churned</option>
            </select>
          </label>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create contact"}
          </Button>
        </form>
      </aside>
    </div>
  );
}
