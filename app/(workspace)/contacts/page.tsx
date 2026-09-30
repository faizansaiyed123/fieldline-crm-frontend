"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { Contact, ContactList, RelationshipHealth } from "@/lib/types";
import { Badge, Button, EmptyState, SectionTitle } from "@/components/ui";

export default function ContactsPage() {
  const { accessToken, organizationId } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [health, setHealth] = useState<RelationshipHealth | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const enabled = Boolean(accessToken && organizationId);
  const queryClient = useQueryClient();
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const contacts = useQuery({
    queryKey: ["contacts", organizationId, query],
    enabled,
    queryFn: () =>
      apiFetch<ContactList>(
        `${prefix}/contacts?page_size=100${query ? `&q=${encodeURIComponent(query)}` : ""}`,
        {},
        accessToken,
      ),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<Contact>(`${prefix}/contacts`, { method: "POST", body: input }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contacts", organizationId] });
      setShowCreate(false);
      setError("");
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Could not create contact"),
  });

  async function openContact(contact: Contact) {
    setSelected(contact);
    setHealth(null);
    try {
      setHealth(
        await apiFetch<RelationshipHealth>(
          `${prefix}/contacts/${contact.id}/relationship-health`,
          {},
          accessToken,
        ),
      );
    } catch {
      setHealth(null);
    }
  }

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Customers"
        title="Contacts"
        description="Find people, inspect relationship signal, and keep context connected."
        action={<Button onClick={() => { setShowCreate(true); setError(""); }}>Add contact</Button>}
      />
      <div className="toolbar">
        <input
          aria-label="Search contacts"
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="toolbar-meta">{contacts.data?.total ?? 0} contacts</span>
      </div>
      <div className="panel table-panel">
        {contacts.isError ? (
          <div className="form-error" style={{ margin: 16 }}>Unable to load contacts. {(contacts.error as Error)?.message}</div>
        ) : contacts.data?.items.length ? (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Lifecycle</th><th>Email</th><th>Signal</th></tr></thead>
            <tbody>
              {contacts.data.items.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <button className="row-link" onClick={() => void openContact(contact)} aria-label={"Inspect " + contact.first_name + " " + contact.last_name}>
                      <strong>{contact.first_name} {contact.last_name}</strong><small>{contact.job_title ?? "—"}</small>
                    </button>
                  </td>
                  <td>{contact.job_title ?? "—"}</td>
                  <td><Badge tone={contact.lifecycle === "customer" ? "success" : contact.lifecycle === "lead" ? "info" : "neutral"}>{contact.lifecycle}</Badge></td>
                  <td>{contact.email ?? "—"}</td>
                  <td><button className="detail-link-button" onClick={() => void openContact(contact)} aria-label={"Inspect " + contact.first_name + " " + contact.last_name + " relationship"}>Inspect →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No contacts yet" description="Create your first contact or import a validated CSV from the Imports area." />
        )}
      </div>

      {selected ? (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="relationship-drawer-title" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div><span className="eyebrow">Relationship</span><h2 id="relationship-drawer-title">{selected.first_name} {selected.last_name}</h2><p>{selected.email ?? "No email on file"}</p></div>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>
            <div className="health-card">
              <div className="health-score">{health?.score ?? "—"}</div>
              <div><strong>{health?.band?.replace("_", " ") ?? "Loading signal"}</strong><p>Deterministic relationship-health heuristic.</p></div>
            </div>
            {health ? (
              <>
                <div className="mini-stats">
                  <div><span>30d activity</span><strong>{health.activity_count_30d}</strong></div>
                  <div><span>Open opps</span><strong>{health.open_opportunity_count}</strong></div>
                  <div><span>Overdue tasks</span><strong>{health.overdue_task_count}</strong></div>
                </div>
                <div className="evidence-list">
                  <h3>Evidence</h3>
                  {health.evidence.map((item) => (
                    <div key={item.code}><span>{item.impact > 0 ? "+" : ""}{item.impact}</span><div><strong>{item.code}</strong><p>{item.description}</p></div></div>
                  ))}
                </div>
              </>
            ) : <div className="panel-empty">Calculating relationship signal…</div>}
          </aside>
        </div>
      ) : null}

      {showCreate ? (
        <CreateContact onClose={() => setShowCreate(false)} onCreate={(input) => create.mutate(input)} busy={create.isPending} error={error} />
      ) : null}
    </div>
  );
}

function CreateContact({
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [lifecycle, setLifecycle] = useState("lead");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ first_name: firstName, last_name: lastName, email: email || null, lifecycle });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <div className="drawer-head"><div><span className="eyebrow">New record</span><h2>Add contact</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>First name<input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label>
          <label>Last name<input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></label>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
          <label>Lifecycle<select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}><option>lead</option><option>prospect</option><option>customer</option><option>churned</option></select></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create contact"}</Button>
        </form>
      </aside>
    </div>
  );
}
