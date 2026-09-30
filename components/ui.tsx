"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Button({
  children,
  type = "button",
  onClick,
  disabled,
  variant = "primary",
  href,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  href?: string;
}) {
  const className = `button button-${variant}`;
  if (href) {
    return <Link href={href} className={className}>{children}</Link>;
  }
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">+</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  accent?: "neutral" | "green" | "amber" | "blue";
}) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {detail ? <span className="stat-detail">{detail}</span> : null}
    </div>
  );
}


export function ErrorState({
  title = "Could not load this view",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-mark" aria-hidden="true">!</div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
      </div>
    </div>
  );
}
