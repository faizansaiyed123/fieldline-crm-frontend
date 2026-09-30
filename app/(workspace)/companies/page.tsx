"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useDrawerBehavior } from "@/lib/use-drawer-behavior";
import type { Company, CompanyList } from "@/lib/types";
import { Button, EmptyState, SectionTitle } from "@/components/ui";

export default function CompaniesPage() {
  const { accessToken, organizationId } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);

  const companies = useQuery({
    queryKey: ["companies", organizationId, debouncedQuery, page],
    enabled,
    queryFn: () =>
      apiFetch<CompanyList>(
        `${prefix}/companies?page=${page}&page_size=${pageSize}${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""}`,
        {},
        accessToken,
      ),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiFetch<Company>(`${prefix}/companies/${id}`, { method: "PATCH", body: input }, accessToken),
    onSuccess: (company) => {
      void queryClient.invalidateQueries({ queryKey: ["companies", organizationId] });
      setSelected(company);
      setError("");
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Could not update company"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`${prefix}/companies/${id}`, { method: "DELETE" }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", organizationId] });
      setSelected(null);
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Could not archive company"),
  });

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiFetch<Company>(`${prefix}/companies`, { method: "POST", body: input }, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", organizationId] });
      setCreating(false);
      setError("");
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : "Could not create company"),
  });

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Accounts"
        title="Companies"
        description="Keep organization-level context connected to the people and opportunities your team manages."
        action={<Button onClick={() => { setCreating(true); setError(""); }}>Add company</Button>}
      />
      <div className="toolbar">
        <input
          aria-label="Search companies"
          placeholder="Search company name, website, phone…"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
        />
        <span className="toolbar-meta">{companies.data?.total ?? 0} companies</span>
      </div>
      <section className="panel table-panel">
        {companies.isError ? (
          <div className="form-error" style={{ margin: 16 }} role="alert">Unable to load companies. {(companies.error as Error).message}</div>
        ) : companies.data?.items.length ? (
          <table className="data-table">
            <thead><tr><th>Company</th><th>Website</th><th>Phone</th><th>Owner</th></tr></thead>
            <tbody>
              {companies.data.items.map((company) => (
                <tr key={company.id} className="click-row" onClick={() => { setSelected(company); setError(""); }}>
                  <td><strong>{company.name}</strong></td>
                  <td>{company.website ?? "—"}</td>
                  <td>{company.phone ?? "—"}</td>
                  <td><span className="toolbar-meta">{company.owner_user_id.slice(0, 8)}…</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !companies.isLoading ? (
          <EmptyState title="No companies yet" description="Create an account to give contacts and opportunities a shared organization context." />
        ) : (
          <div className="panel-empty">Loading companies…</div>
        )}
      </section>
      {companies.data && companies.data.total > pageSize ? (
        <div className="pagination" aria-label="Companies pagination">
          <span>Page {companies.data.page} of {Math.ceil(companies.data.total / companies.data.page_size)}</span>
          <div>
            <Button variant="secondary" disabled={page <= 1 || companies.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button variant="secondary" disabled={page >= Math.ceil(companies.data.total / companies.data.page_size) || companies.isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
      {selected ? (
        <CompanyDrawer
          company={selected}
          onClose={() => setSelected(null)}
          onSave={(input) => update.mutate({ id: selected.id, input })}
          onArchive={() => archive.mutate(selected.id)}
          busy={update.isPending || archive.isPending}
          error={error}
        />
      ) : null}
      {creating ? <CreateCompany onClose={() => setCreating(false)} onCreate={(input) => create.mutate(input)} busy={create.isPending} error={error} /> : null}
    </div>
  );
}

function CreateCompany({
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
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ name, website: website || null, phone: phone || null });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="company-dialog-title">
        <div className="drawer-head">
          <div><span className="eyebrow">New account</span><h2 id="company-dialog-title">Add company</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>Company name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Website<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" /></label>
          <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create company"}</Button>
        </form>
      </aside>
    </div>
  );
}


function CompanyDrawer({
  company,
  onClose,
  onSave,
  onArchive,
  busy,
  error,
}: {
  company: Company;
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
  onArchive: () => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState(company.name);
  useDrawerBehavior(true, onClose);
  const [website, setWebsite] = useState(company.website ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ name, website: website || null, phone: phone || null });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="company-edit-title">
        <div className="drawer-head">
          <div><span className="eyebrow">Account detail</span><h2 id="company-edit-title">{company.name}</h2><p>Changes are audited by the backend.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>Company name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Website<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button variant="danger" disabled={busy} onClick={() => { if (window.confirm("Archive this company?")) onArchive(); }}>Archive company</Button>
        </form>
      </aside>
    </div>
  );
}
