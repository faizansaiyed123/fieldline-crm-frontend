"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { BusinessRule, SystemHealthResponse } from "@/lib/types";
import { Badge, Button, SectionTitle } from "@/components/ui";

export default function SettingsPage() {
  const { accessToken, organizationId, user } = useAuth();
  const [message, setMessage] = useState("");
  const enabled = Boolean(accessToken && organizationId);
  const isAdmin = user?.memberships[0]?.role !== "member";
  const prefix = organizationId ? `/organizations/${organizationId}` : "";
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: ["business-rules", organizationId],
    enabled: enabled && isAdmin,
    queryFn: () => apiFetch<BusinessRule[]>(`${prefix}/business-rules`, {}, accessToken),
  });

  const health = useQuery({
    queryKey: ["system-health", organizationId],
    enabled: enabled && isAdmin,
    queryFn: () => apiFetch<SystemHealthResponse>(`${prefix}/system-health`, {}, accessToken),
  });

  const update = useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) =>
      apiFetch<BusinessRule>(`${prefix}/business-rules/${key}`, { method: "PATCH", body: { value } }, accessToken),
    onSuccess: () => {
      setMessage("Rule updated. Attention and planning thresholds use this value immediately.");
      void queryClient.invalidateQueries({ queryKey: ["business-rules", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["planner", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["attention", organizationId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Could not update rule"),
  });

  if (!isAdmin) return <div className="page"><div className="form-error">Owner/admin access is required for rules and system diagnostics.</div></div>;

  return (
    <div className="page">
      <SectionTitle eyebrow="Administration" title="Rules & system health" description="Tune deterministic operating thresholds and inspect the self-hosted system health state." />
      {message ? <div className="callout">{message}</div> : null}

      <div className="content-grid two-up">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Business rules</span><h2>How the workspace decides what is stale.</h2></div></div>
          <div className="rule-list">
            {(rules.data ?? []).map((rule) => <RuleRow key={rule.key} rule={rule} busy={update.isPending} onSave={(value) => update.mutate({ key: rule.key, value })} />)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Self diagnostics</span><h2>Operational status</h2></div><Badge tone={health.data?.status === "ok" ? "success" : health.data?.status === "error" ? "danger" : "warning"}>{health.data?.status ?? "checking"}</Badge></div>
          <div className="health-checks">
            {Object.entries(health.data?.checks ?? {}).map(([key, check]) => <div key={key} className="health-check"><span className={`check-dot check-${check.status}`} /><div><strong>{key.replaceAll("_", " ")}</strong><p>{check.detail}</p></div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function RuleRow({ rule, busy, onSave }: { rule: BusinessRule; busy: boolean; onSave: (value: number) => void }) {
  const [value, setValue] = useState(String(rule.value));
  return (
    <div className="rule-row">
      <div><strong>{rule.key.replaceAll("_", " ")}</strong><p>{rule.description}. Default: {rule.default}.</p></div>
      <div className="rule-control"><input type="number" min={0} max={365} value={value} onChange={(e) => setValue(e.target.value)} /><Button variant="secondary" disabled={busy || Number(value) === rule.value} onClick={() => onSave(Number(value))}>Save</Button></div>
    </div>
  );
}

