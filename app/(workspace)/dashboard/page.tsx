"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { AttentionResponse, CompanyList, ContactList, OpportunityList } from "@/lib/types";
import { Badge, SectionTitle, StatCard } from "@/components/ui";

export default function DashboardPage() {
  const { accessToken, organizationId } = useAuth();
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? `/organizations/${organizationId}` : "";

  const contacts = useQuery({
    queryKey: ["contacts", "dashboard", organizationId],
    enabled,
    queryFn: () => apiFetch<ContactList>(`${prefix}/contacts?page_size=1`, {}, accessToken),
  });
  const companies = useQuery({
    queryKey: ["companies", "dashboard", organizationId],
    enabled,
    queryFn: () => apiFetch<CompanyList>(`${prefix}/companies?page_size=1`, {}, accessToken),
  });
  const opportunities = useQuery({
    queryKey: ["opportunities", "dashboard", organizationId],
    enabled,
    queryFn: () => apiFetch<OpportunityList>(`${prefix}/opportunities?page_size=1`, {}, accessToken),
  });
  const attention = useQuery({
    queryKey: ["attention", organizationId],
    enabled,
    queryFn: () => apiFetch<AttentionResponse>(`${prefix}/attention?limit=6`, {}, accessToken),
  });

  const loading = contacts.isLoading || companies.isLoading || opportunities.isLoading || attention.isLoading;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Overview"
        title="Good morning. Here is the signal."
        description="A focused view of the customer work that deserves your attention today."
        action={<div className="live-chip"><span />Live API</div>}
      />

      <div className="stats-grid">
        <StatCard label="Contacts" value={loading ? "—" : contacts.data?.total ?? 0} detail="people in the workspace" accent="blue" />
        <StatCard label="Companies" value={loading ? "—" : companies.data?.total ?? 0} detail="active organizations" />
        <StatCard label="Pipeline" value={loading ? "—" : opportunities.data?.total ?? 0} detail="tracked opportunities" accent="green" />
        <StatCard label="Attention" value={loading ? "—" : attention.data?.items.length ?? 0} detail="evidence-backed items" accent="amber" />
      </div>

      <div className="content-grid two-up">
        <section className="panel">
          <div className="panel-head">
            <div><span className="eyebrow">Attention queue</span><h2>Act before context goes cold.</h2></div>
            <Badge tone="warning">Evidence based</Badge>
          </div>
          {attention.data?.items.length ? (
            <div className="attention-list">
              {attention.data.items.map((item) => (
                <div key={`${item.entity_type}-${item.entity_id}`} className="attention-item">
                  <div className="attention-score">{item.priority}</div>
                  <div className="attention-copy"><strong>{item.title}</strong><p>{item.reason}</p></div>
                  <span className="attention-kind">{item.entity_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty">Nothing needs immediate attention.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Workspace</span><h2>Designed around trustworthy state.</h2></div></div>
          <div className="principle-list">
            <div><span>01</span><div><strong>Tenant scoped</strong><p>Every workspace query is bound to organization membership.</p></div></div>
            <div><span>02</span><div><strong>Auditable</strong><p>Meaningful CRM changes and imports produce audit events.</p></div></div>
            <div><span>03</span><div><strong>Explainable</strong><p>Attention and relationship health expose evidence, not opaque guesses.</p></div></div>
          </div>
        </section>
      </div>
    </div>
  );
}
