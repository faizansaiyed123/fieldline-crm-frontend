"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { ContactList, SavedView } from "@/lib/types";
import { Badge, Button, EmptyState, SectionTitle } from "@/components/ui";

export default function ViewsPage() {
  const { accessToken, organizationId, user } = useAuth();
  const [selected, setSelected] = useState<SavedView | null>(null);
  const [creating, setCreating] = useState(false);
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const queryClient = useQueryClient();

  const views = useQuery({
    queryKey: ["views", organizationId],
    enabled,
    queryFn: () => apiFetch<SavedView[]>(`${prefix}/saved-views`, {}, accessToken),
  });

  const results = useQuery({
    queryKey: ["view-execute", selected?.id],
    enabled: Boolean(selected && accessToken),
    queryFn: () => apiFetch<ContactList>(`${prefix}/saved-views/${selected!.id}/execute?page_size=50`, {}, accessToken),
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

  const canShare = user?.memberships[0]?.role !== "member";

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Reusable context"
        title="Saved views"
        description="Save the exact contact slice you return to most, then execute it against the live API."
        action={<Button onClick={() => setCreating(true)}>Create view</Button>}
      />
      <div className="content-grid two-up">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Views</span><h2>Your saved definitions</h2></div></div>
          {views.data?.length ? (
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
          <div className="panel-head"><div><span className="eyebrow">Execution</span><h2>{selected?.name ?? "Select a view"}</h2></div></div>
          {selected ? (
            results.isLoading ? (
              <div className="panel-empty">Running view…</div>
            ) : results.isError ? (
              <div className="form-error" style={{ margin: 16 }}>{(results.error as Error).message}</div>
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
        sort: "name_asc",
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
          {canShare ? <label className="check-row"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />Share with the workspace</label> : null}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save view"}</Button>
        </form>
      </aside>
    </div>
  );
}
