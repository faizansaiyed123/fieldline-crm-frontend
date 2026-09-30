"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { hasAdminAccess } from "@/lib/permissions";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import type { ContactList, SavedView } from "@/lib/types";
import { Badge, Button, EmptyState, ErrorState, SectionTitle } from "@/components/ui";

export default function ViewsPage() {
  const { accessToken, organizationId, user } = useAuth();
  const [selected, setSelected] = useState<SavedView | null>(null);
  const [editing, setEditing] = useState<SavedView | null>(null);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  useDrawerBehavior(Boolean(creating || editing), () => { setCreating(false); setEditing(null); });
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const queryClient = useQueryClient();

  const views = useQuery({
    queryKey: ["views", organizationId],
    enabled,
    queryFn: () => apiFetch<SavedView[]>(`${prefix}/saved-views`, {}, accessToken),
  });

  const results = useQuery({
    queryKey: ["view-execute", selected?.id, selected?.definition_version],
    enabled: Boolean(selected && accessToken),
    queryFn: () => apiFetch<ContactList>(`${prefix}/saved-views/${selected!.id}/execute?page_size=50`, {}, accessToken),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiFetch<SavedView>(`${prefix}/saved-views/${id}`, { method: "PATCH", body: input }, accessToken),
    onSuccess: (view) => {
      void queryClient.invalidateQueries({ queryKey: ["views", organizationId] });
      setSelected(view);
      setEditing(null);
      setMessage("Saved view updated. Its definition version was advanced on the server.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Could not update saved view"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${prefix}/saved-views/${id}`, { method: "DELETE" }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["views", organizationId] });
      setSelected(null);
      setMessage("Saved view deleted.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Could not delete saved view"),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<SavedView>(`${prefix}/saved-views`, { method: "POST", body: input }, accessToken),
    onSuccess: (view) => {
      void queryClient.invalidateQueries({ queryKey: ["views", organizationId] });
      setSelected(view);
      setCreating(false);
    },
  });

  const canShare = hasAdminAccess(user?.memberships[0]?.role);

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Reusable context"
        title="Saved views"
        description="Save the exact contact slice you return to most, then execute it against the live API."
        action={<Button onClick={() => { setCreating(true); setMessage(""); }}>Create view</Button>}
      />
      {message ? <div className="callout" role="status">{message}</div> : null}
      <div className="content-grid two-up">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Views</span><h2>Your saved definitions</h2></div></div>
          {views.isError ? <ErrorState description={(views.error as Error).message} onRetry={() => void views.refetch()} /> : views.data?.length ? (
            <div className="view-list">
              {views.data.map((view) => (
                <button key={view.id} className={selected?.id === view.id ? "view-item active" : "view-item"} onClick={() => setSelected(view)}>
                  <div><strong>{view.name}</strong><span>{view.shared ? "Shared" : "Private"} · v{view.definition_version}</span></div>
                  <Badge tone={view.shared ? "success" : "neutral"}>{view.shared ? "Team" : "Mine"}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No saved views" description="Create one to pin a reusable customer slice." />
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">Execution</span><h2>{selected?.name ?? "Select a view"}</h2></div>
            {selected ? <div className="panel-actions"><Button variant="secondary" onClick={() => setEditing(selected)}>Edit</Button><Button variant="danger" disabled={remove.isPending} onClick={() => { if (window.confirm("Delete this saved view?")) remove.mutate(selected.id); }}>Delete</Button></div> : null}
          </div>
          {selected ? (
            results.isLoading ? (
              <div className="panel-empty">Running view…</div>
            ) : results.isError ? (
              <ErrorState description={(results.error as Error).message} onRetry={() => void results.refetch()} />
            ) : (
              <div className="view-results">
                <div className="view-summary">{results.data?.total ?? 0} matching contacts</div>
                {results.data?.items.map((contact) => (
                  <div key={contact.id} className="result-row"><strong>{contact.first_name} {contact.last_name}</strong><span>{contact.email ?? "No email"}</span></div>
                ))}
              </div>
            )
          ) : (
            <div className="panel-empty">Select a saved view to execute its real backend definition.</div>
          )}
        </section>
      </div>
      {editing ? (
        <EditView
          view={editing}
          canShare={hasAdminAccess(user?.memberships[0]?.role)}
          onClose={() => setEditing(null)}
          onSave={(input) => update.mutate({ id: editing.id, input })}
          busy={update.isPending}
          error={update.error instanceof Error ? update.error.message : ""}
        />
      ) : null}
      {creating ? (
        <CreateView
          canShare={canShare}
          onClose={() => setCreating(false)}
          onCreate={(input) => create.mutate(input)}
          busy={create.isPending}
          error={create.error instanceof Error ? create.error.message : ""}
        />
      ) : null}
    </div>
  );
}

function CreateView({ canShare, onClose, onCreate, busy, error }: {
  canShare: boolean;
  onClose: () => void;
  onCreate: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [lifecycle, setLifecycle] = useState("prospect");
  const [hasEmail, setHasEmail] = useState(true);
  const [shared, setShared] = useState(false);
  const [sort, setSort] = useState<SavedView["definition"]["sort"]>("name_asc");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      name,
      shared: canShare ? shared : false,
      definition: {
        query: query || null,
        lifecycle: lifecycle ? [lifecycle] : [],
        company_id: null,
        owner_user_id: null,
        has_email: hasEmail,
        sort,
      },
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <div className="drawer-head"><div><span className="eyebrow">New view</span><h2>Create saved view</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Contains<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Optional name/email search" /></label>
          <label>Lifecycle<select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}><option value="">Any lifecycle</option><option value="lead">lead</option><option value="prospect">prospect</option><option value="customer">customer</option><option value="churned">churned</option></select></label>
          <label className="check-row"><input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} />Only contacts with email</label>
          <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as SavedView["definition"]["sort"])}><option value="updated_desc">Recently updated</option><option value="updated_asc">Least recently updated</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option></select></label>
          {canShare ? <label className="check-row"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />Share with the workspace</label> : null}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save view"}</Button>
        </form>
      </aside>
    </div>
  );
}


function EditView({
  view,
  canShare,
  onClose,
  onSave,
  busy,
  error,
}: {
  view: SavedView;
  canShare: boolean;
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState(view.name);
  const [query, setQuery] = useState(view.definition.query ?? "");
  const [lifecycle, setLifecycle] = useState<SavedView["definition"]["lifecycle"][number] | "">(view.definition.lifecycle[0] ?? "");
  const [hasEmail, setHasEmail] = useState(view.definition.has_email ?? true);
  const [shared, setShared] = useState(view.shared);
  const [sort, setSort] = useState(view.definition.sort);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      name,
      shared: canShare ? shared : false,
      definition: {
        ...view.definition,
        query: query || null,
        lifecycle: lifecycle ? [lifecycle] : [],
        has_email: hasEmail,
        sort: "name_asc",
      },
    });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="edit-view-title">
        <div className="drawer-head"><div><span className="eyebrow">Versioned definition</span><h2 id="edit-view-title">Edit saved view</h2><p>Changing the definition advances its version on the backend.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Contains<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label>Lifecycle<select value={lifecycle} onChange={(event) => setLifecycle(event.target.value as SavedView["definition"]["lifecycle"][number] | "")}><option value="">Any lifecycle</option><option value="lead">lead</option><option value="prospect">prospect</option><option value="customer">customer</option><option value="churned">churned</option></select></label>
          <label className="check-row"><input type="checkbox" checked={hasEmail} onChange={(event) => setHasEmail(event.target.checked)} />Only contacts with email</label>
          <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as SavedView["definition"]["sort"])}><option value="updated_desc">Recently updated</option><option value="updated_asc">Least recently updated</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option></select></label>
          {canShare ? <label className="check-row"><input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} />Share with the workspace</label> : null}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </aside>
    </div>
  );
}
