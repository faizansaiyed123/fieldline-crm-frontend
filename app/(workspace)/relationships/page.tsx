"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { apiFetch } from "@/lib/api";
import type { ContactList, RelationshipGraphResponse, GraphNode } from "@/lib/types";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";

const positions: Record<string, { x: number; y: number }> = {
  contact: { x: 430, y: 220 },
  company: { x: 210, y: 90 },
  opportunity: { x: 690, y: 90 },
  task: { x: 210, y: 350 },
  activity: { x: 690, y: 350 },
};

export default function RelationshipsPage() {
  const { accessToken, organizationId } = useAuth();
  const [selectedId, setSelectedId] = useState<string>("");
  const enabled = Boolean(accessToken && organizationId);
  const prefix = organizationId ? "/organizations/" + organizationId : "";

  const contacts = useQuery({
    queryKey: ["graph-contacts", organizationId],
    enabled,
    queryFn: () => apiFetch<ContactList>(prefix + "/contacts?page_size=100", {}, accessToken),
  });

  const graph = useQuery({
    queryKey: ["relationship-graph", organizationId, selectedId],
    enabled: Boolean(accessToken && organizationId && selectedId),
    queryFn: () => apiFetch<RelationshipGraphResponse>(prefix + "/contacts/" + selectedId + "/relationship-graph", {}, accessToken),
  });

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Customer context"
        title="Relationship map"
        description="See how a contact connects to companies, opportunities, tasks, and activity in the current tenant."
      />
      <section className="panel graph-panel">
        <div className="graph-toolbar">
          <label>
            Contact
            <select aria-label="Select contact" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Choose a contact…</option>
              {(contacts.data?.items ?? []).map((contact) => <option key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</option>)}
            </select>
          </label>
          {graph.data ? <Badge tone="info">{graph.data.nodes.length} nodes · {graph.data.edges.length} links</Badge> : null}
        </div>

        {!selectedId ? (
          <div className="panel-empty">Select a contact to inspect its real relationship graph.</div>
        ) : graph.isLoading ? (
          <div className="panel-empty">Building relationship map…</div>
        ) : graph.isError ? (
          <div className="form-error" style={{ margin: 18 }}>{(graph.error as Error).message}</div>
        ) : graph.data ? (
          <RelationshipSvg graph={graph.data} />
        ) : (
          <EmptyState title="No graph data" description="This contact has no connected entities yet." />
        )}
      </section>
    </div>
  );
}

function RelationshipSvg({ graph }: { graph: RelationshipGraphResponse }) {
  const contactNode = graph.nodes.find((node) => node.type === "contact");
  const otherNodes = graph.nodes.filter((node) => node.type !== "contact");
  const grouped: Record<string, GraphNode[]> = {};
  for (const node of otherNodes) {
    grouped[node.type] ??= [];
    grouped[node.type].push(node);
  }

  const coords = new Map<string, { x: number; y: number }>();
  const visibleByType = new Map<string, GraphNode[]>();
  const overflowByType = new Map<string, number>();

  if (contactNode) coords.set(contactNode.id, positions.contact);
  for (const [type, nodes] of Object.entries(grouped)) {
    const visible = nodes.slice(0, 4);
    visibleByType.set(type, visible);
    if (nodes.length > visible.length) overflowByType.set(type, nodes.length - visible.length);

    const base = positions[type] ?? { x: 430, y: 100 };
    visible.forEach((node, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      coords.set(node.id, {
        x: base.x + (column === 0 ? -48 : 48),
        y: base.y + row * 82,
      });
    });
  }

  const visibleNodeIds = new Set<string>([
    ...(contactNode ? [contactNode.id] : []),
    ...Array.from(visibleByType.values()).flat().map((node) => node.id),
  ]);

  return (
    <div className="graph-canvas">
      <svg viewBox="0 0 900 520" role="img" aria-label="Customer relationship graph">
        <defs>
          <filter id="graph-shadow"><feDropShadow dx="0" dy="10" stdDeviation="9" floodOpacity=".28" /></filter>
        </defs>
        {graph.edges.map((edge) => {
          const source = coords.get(edge.source);
          const target = coords.get(edge.target);
          if (!source || !target) return null;
          return <g key={edge.id}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="graph-edge" /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8} className="graph-edge-label">{edge.label}</text></g>;
        })}
        {graph.nodes.filter((node) => visibleNodeIds.has(node.id)).map((node) => {
          const point = coords.get(node.id);
          if (!point) return null;
          const radius = node.type === "contact" ? 46 : 36;
          return <g key={node.id} transform={`translate(${point.x} ${point.y})`} className="graph-node">
            <circle r={radius} className={`graph-node-circle graph-${node.type}`} filter="url(#graph-shadow)" />
            <text y="-4" className="graph-node-type">{node.type}</text>
            <text y="14" className="graph-node-label">{node.label.slice(0, 22)}</text>
          </g>;
        })}
      </svg>
      {overflowByType.size ? (
        <div className="graph-overflow" aria-live="polite">
          {Array.from(overflowByType.entries()).map(([type, count]) => (
            <span key={type}>+{count} more {type}{count === 1 ? "" : "s"} not drawn</span>
          ))}
        </div>
      ) : null}
      <details className="graph-text">
        <summary>Text view of relationships</summary>
        <ul>
          {graph.nodes.map((node) => <li key={node.id}><strong>{node.type}</strong> — {node.label}</li>)}
        </ul>
      </details>
    </div>
  );
}
