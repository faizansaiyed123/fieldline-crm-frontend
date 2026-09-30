export type MembershipRole = "owner" | "admin" | "member";

export type User = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  memberships: { organization_id: string; role: MembershipRole }[];
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Contact = {
  id: string;
  organization_id: string;
  company_id: string | null;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  lifecycle: "lead" | "prospect" | "customer" | "churned";
};

export type ContactList = {
  items: Contact[];
  page: number;
  page_size: number;
  total: number;
};

export type Company = {
  id: string;
  organization_id: string;
  owner_user_id: string;
  name: string;
  website: string | null;
  phone: string | null;
};

export type CompanyList = {
  items: Company[];
  page: number;
  page_size: number;
  total: number;
};

export type Opportunity = {
  id: string;
  organization_id: string;
  owner_user_id: string;
  company_id: string | null;
  contact_id: string | null;
  stage_id: string;
  name: string;
  amount: string | null;
  status: "open" | "won" | "lost";
  expected_close_date: string | null;
  lost_reason: string | null;
};

export type OpportunityList = {
  items: Opportunity[];
  page: number;
  page_size: number;
  total: number;
};

export type AttentionItem = {
  entity_type: "task" | "opportunity" | "contact";
  entity_id: string;
  priority: number;
  title: string;
  reason: string;
  due_at: string | null;
  last_activity_at: string | null;
};

export type AttentionResponse = {
  items: AttentionItem[];
  generated_at: string;
};

export type RelationshipHealth = {
  contact_id: string;
  score: number;
  band: "healthy" | "warming" | "at_risk" | "dormant";
  last_activity_at: string | null;
  activity_count_30d: number;
  open_opportunity_count: number;
  overdue_task_count: number;
  evidence: { code: string; impact: number; description: string }[];
};

export type SavedView = {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  resource: "contacts";
  name: string;
  shared: boolean;
  definition_version: number;
  definition: {
    query: string | null;
    lifecycle: ("lead" | "prospect" | "customer" | "churned")[];
    company_id: string | null;
    owner_user_id: string | null;
    has_email: boolean | null;
    sort: "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
  };
};

export type ImportPreview = {
  id: string;
  status: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  committed_rows: number;
  created_at: string;
  completed_at: string | null;
  errors: { row_number: number; errors: string[] }[];
  errors_truncated: boolean;
};

export type ImportCommitResponse = {
  job_id: string;
  status: string;
  dry_run: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  would_create: number;
  committed_rows: number;
};

export type DuplicateCandidate = {
  entity_type: "contact" | "company";
  first_id: string;
  second_id: string;
  first_label: string;
  second_label: string;
  similarity: number;
  reasons: string[];
};

export type QualityIssue = {
  code: string;
  entity_type: "contact" | "company" | "opportunity" | "task";
  entity_id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  fixable: boolean;
};

export type DataQualityResponse = {
  generated_at: string;
  summary: {
    total_issues: number;
    high: number;
    medium: number;
    low: number;
    duplicate_contacts: number;
    duplicate_companies: number;
    incomplete_records: number;
    stale_contacts: number;
    opportunity_issues: number;
    overdue_tasks: number;
  };
  duplicate_candidates: DuplicateCandidate[];
  issues: QualityIssue[];
};

export type MergeResponse = {
  operation_id: string;
  entity_type: "contact" | "company";
  survivor_id: string;
  merged_id: string;
  completed_at: string;
};

export type BusinessRule = {
  key: string;
  value: number;
  default: number;
  description: string;
};

export type PlannerItem = {
  entity_type: "task" | "opportunity" | "contact";
  entity_id: string;
  priority: number;
  title: string;
  reason: string;
  next_action: string;
  evidence: string[];
  due_at: string | null;
  last_activity_at: string | null;
};

export type DailyPlannerResponse = {
  generated_at: string;
  items: PlannerItem[];
};

export type StuckOpportunity = {
  id: string;
  name: string;
  stage_id: string;
  stage_name: string;
  amount: string | null;
  status: string;
  stage_age_days: number;
  last_activity_at: string | null;
  expected_close_date: string | null;
  overdue_task_count: number;
  has_next_action: boolean;
  reasons: string[];
  recommended_action: string;
};

export type StuckOpportunityResponse = {
  generated_at: string;
  configured_threshold_days: number;
  items: StuckOpportunity[];
};

export type AutomationRun = {
  id: string;
  workflow: string;
  trigger: string;
  event_key: string;
  status: string;
  action_type: string;
  result: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  meta: Record<string, string | null>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type RelationshipGraphResponse = {
  contact_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type SystemHealthResponse = {
  generated_at: string;
  status: "ok" | "warning" | "error";
  checks: Record<string, { status: "ok" | "warning" | "error"; detail: string }>;
};
