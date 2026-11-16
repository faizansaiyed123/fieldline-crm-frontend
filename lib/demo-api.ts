type RecordValue = Record<string, any>;

type DemoState = {
  version: number;
  organizationId: string;
  currentUserId: string | null;
  users: RecordValue[];
  companies: RecordValue[];
  contacts: RecordValue[];
  stages: RecordValue[];
  opportunities: RecordValue[];
  activities: RecordValue[];
  tasks: RecordValue[];
  savedViews: RecordValue[];
  automationRules: RecordValue[];
  automationRuns: RecordValue[];
  businessRules: Record<string, number>;
  importJobs: Record<string, RecordValue>;
};

const STORAGE_KEY = "fieldline_crm_browser_demo_v1";
const ORGANIZATION_ID = "org-fieldline-demo";
const OWNER_ID = "user-fieldline-owner";
const MEMBER_ID = "user-fieldline-member";

export function isBrowserDemoMode() {
  return process.env.NEXT_PUBLIC_FIELDLINE_DEMO !== "false";
}

function makeId(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function seedState(): DemoState {
  const users = [
    {
      id: OWNER_ID,
      email: "alex@fieldline.demo",
      full_name: "Alex Morgan",
      is_active: true,
      memberships: [{ organization_id: ORGANIZATION_ID, role: "owner" }],
    },
    {
      id: MEMBER_ID,
      email: "jordan@fieldline.demo",
      full_name: "Jordan Lee",
      is_active: true,
      memberships: [{ organization_id: ORGANIZATION_ID, role: "member" }],
    },
  ];
  const companies = [
    { id: "co-1001", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, name: "Northstar Studio", website: "https://northstar.studio", phone: "+1 415 555 0101" },
    { id: "co-1002", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, name: "Meridian Health", website: "https://meridian.health", phone: "+1 415 555 0102" },
    { id: "co-1003", organization_id: ORGANIZATION_ID, owner_user_id: MEMBER_ID, name: "Juniper Financial", website: "https://juniper.financial", phone: "+1 415 555 0103" },
    { id: "co-1004", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, name: "Atlas Works", website: "https://atlasworks.example", phone: "+1 415 555 0104" },
    { id: "co-1005", organization_id: ORGANIZATION_ID, owner_user_id: MEMBER_ID, name: "Cedar & Co", website: "https://cedar.example", phone: "+1 415 555 0105" },
    { id: "co-1006", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, name: "Brightpath Logistics", website: "https://brightpath.example", phone: "+1 415 555 0106" },
    { id: "co-1007", organization_id: ORGANIZATION_ID, owner_user_id: MEMBER_ID, name: "Orbit Learning", website: "https://orbit.example", phone: "+1 415 555 0107" },
    { id: "co-1008", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, name: "Kindred Energy", website: "https://kindred.example", phone: "+1 415 555 0108" },
  ];
  const contactRows = [
    ["ct-2001", "Maya", "Chen", "maya@northstar.studio", "Director of Operations", "customer", "co-1001", OWNER_ID],
    ["ct-2002", "Oliver", "Grant", "oliver@meridian.health", "VP Partnerships", "prospect", "co-1002", OWNER_ID],
    ["ct-2003", "Priya", "Shah", "priya@juniper.financial", "Chief of Staff", "prospect", "co-1003", MEMBER_ID],
    ["ct-2004", "Ethan", "Brooks", "ethan@atlasworks.example", "Founder", "lead", "co-1004", OWNER_ID],
    ["ct-2005", "Sofia", "Rivera", "sofia@cedar.example", "Finance Lead", "customer", "co-1005", MEMBER_ID],
    ["ct-2006", "Noah", "Williams", "noah@brightpath.example", "Commercial Director", "prospect", "co-1006", OWNER_ID],
    ["ct-2007", "Ava", "Patel", "ava@orbit.example", "Learning Director", "lead", "co-1007", MEMBER_ID],
    ["ct-2008", "Lucas", "Kim", "lucas@kindred.example", "Operations Lead", "customer", "co-1008", OWNER_ID],
    ["ct-2009", "Emma", "Foster", "emma@northstar.studio", "Product Lead", "customer", "co-1001", MEMBER_ID],
    ["ct-2010", "Leo", "Turner", "leo@meridian.health", "Procurement", "lead", "co-1002", MEMBER_ID],
    ["ct-2011", "Morgan", "Reed", "morgan@atlasworks.example", "Operations Manager", "prospect", "co-1004", OWNER_ID],
    ["ct-2012", "Morgan", "Redd", "morgan@atlasworks.example", "Operations Manager", "lead", "co-1004", OWNER_ID],
  ];
  const contacts = contactRows.map((row, index) => ({
    id: row[0],
    organization_id: ORGANIZATION_ID,
    owner_user_id: row[7],
    first_name: row[1],
    last_name: row[2],
    email: row[3],
    phone: "+1 415 555 " + String(2100 + index),
    job_title: row[4],
    lifecycle: row[5],
    company_id: row[6],
  }));
  const stages = [
    { id: "st-1", organization_id: ORGANIZATION_ID, name: "Lead", order_index: 0, win_probability: 10, is_closed: false, is_won: false },
    { id: "st-2", organization_id: ORGANIZATION_ID, name: "Qualified", order_index: 1, win_probability: 25, is_closed: false, is_won: false },
    { id: "st-3", organization_id: ORGANIZATION_ID, name: "Proposal", order_index: 2, win_probability: 60, is_closed: false, is_won: false },
    { id: "st-4", organization_id: ORGANIZATION_ID, name: "Negotiation", order_index: 3, win_probability: 85, is_closed: false, is_won: false },
    { id: "st-5", organization_id: ORGANIZATION_ID, name: "Closed Won", order_index: 4, win_probability: 100, is_closed: true, is_won: true },
    { id: "st-6", organization_id: ORGANIZATION_ID, name: "Closed Lost", order_index: 5, win_probability: 0, is_closed: true, is_won: false },
  ];
  const opportunities = [
    { id: "op-3001", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, company_id: "co-1001", contact_id: "ct-2001", stage_id: "st-3", name: "Northstar customer portal", amount: "48000.00", status: "open", expected_close_date: "2026-12-15", lost_reason: null, created_at: isoDaysAgo(24) },
    { id: "op-3002", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, company_id: "co-1002", contact_id: "ct-2002", stage_id: "st-4", name: "Meridian partner rollout", amount: "72000.00", status: "open", expected_close_date: "2026-11-28", lost_reason: null, created_at: isoDaysAgo(39) },
    { id: "op-3003", organization_id: ORGANIZATION_ID, owner_user_id: MEMBER_ID, company_id: "co-1003", contact_id: "ct-2003", stage_id: "st-2", name: "Juniper onboarding", amount: "18500.00", status: "open", expected_close_date: "2026-12-05", lost_reason: null, created_at: isoDaysAgo(11) },
    { id: "op-3004", organization_id: ORGANIZATION_ID, owner_user_id: OWNER_ID, company_id: "co-1005", contact_id: "ct-2005", stage_id: "st-5", name: "Cedar finance workspace", amount: "32000.00", status: "won", expected_close_date: "2026-11-02", lost_reason: null, created_at: isoDaysAgo(48) },
    { id: "op-3005", organization_id: ORGANIZATION_ID, owner_user_id: MEMBER_ID, company_id: "co-1007", contact_id: "ct-2007", stage_id: "st-6", name: "Orbit training pilot", amount: "9500.00", status: "lost", expected_close_date: "2026-10-18", lost_reason: "Budget moved to next quarter", created_at: isoDaysAgo(56) },
  ];
  const activities = [
    { id: "act-1", organization_id: ORGANIZATION_ID, actor_user_id: OWNER_ID, company_id: "co-1001", contact_id: "ct-2001", opportunity_id: "op-3001", activity_type: "meeting", title: "Quarterly planning call", body: "Reviewed launch milestones and procurement timeline.", occurred_at: isoDaysAgo(2) },
    { id: "act-2", organization_id: ORGANIZATION_ID, actor_user_id: MEMBER_ID, company_id: "co-1003", contact_id: "ct-2003", opportunity_id: "op-3003", activity_type: "email", title: "Shared onboarding outline", body: "Sent the proposed onboarding checklist.", occurred_at: isoDaysAgo(5) },
    { id: "act-3", organization_id: ORGANIZATION_ID, actor_user_id: OWNER_ID, company_id: "co-1002", contact_id: "ct-2002", opportunity_id: "op-3002", activity_type: "call", title: "Commercial follow-up", body: "Waiting on stakeholder sign-off.", occurred_at: isoDaysAgo(17) },
  ];
  const tasks = [
    { id: "task-1", organization_id: ORGANIZATION_ID, created_by_user_id: OWNER_ID, assigned_to_user_id: OWNER_ID, company_id: "co-1002", contact_id: "ct-2002", opportunity_id: "op-3002", title: "Confirm Meridian stakeholder review", description: "Follow up on the commercial proposal.", priority: "high", due_at: isoDaysAgo(1), completed_at: null, created_at: isoDaysAgo(8), updated_at: isoDaysAgo(1) },
    { id: "task-2", organization_id: ORGANIZATION_ID, created_by_user_id: OWNER_ID, assigned_to_user_id: MEMBER_ID, company_id: "co-1001", contact_id: "ct-2001", opportunity_id: "op-3001", title: "Send Northstar implementation plan", description: "Share a scoped delivery plan after the planning call.", priority: "normal", due_at: isoDaysAgo(-2), completed_at: null, created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
    { id: "task-3", organization_id: ORGANIZATION_ID, created_by_user_id: MEMBER_ID, assigned_to_user_id: MEMBER_ID, company_id: "co-1003", contact_id: "ct-2003", opportunity_id: "op-3003", title: "Prepare Juniper onboarding checklist", description: "Draft the first-week checklist.", priority: "normal", due_at: isoDaysAgo(-1), completed_at: null, created_at: isoDaysAgo(1), updated_at: isoDaysAgo(1) },
  ];
  const savedViews = [
    { id: "view-1", organization_id: ORGANIZATION_ID, created_by_user_id: OWNER_ID, resource: "contacts", name: "Prospects to follow up", shared: true, definition_version: 1, definition: { query: null, lifecycle: ["prospect"], company_id: null, owner_user_id: null, has_email: true, sort: "updated_desc" } },
  ];
  const automationRules = [
    { id: "rule-1", organization_id: ORGANIZATION_ID, name: "Won deal handoff", trigger: "opportunity.won", action_type: "create_task", action_config: { title: "Schedule customer kickoff", priority: "high", due_days: 1 }, enabled: true, created_at: isoDaysAgo(20), updated_at: isoDaysAgo(20) },
    { id: "rule-2", organization_id: ORGANIZATION_ID, name: "Lost deal learning loop", trigger: "opportunity.lost", action_type: "create_task", action_config: { title: "Record loss feedback", priority: "normal", due_days: 3 }, enabled: true, created_at: isoDaysAgo(20), updated_at: isoDaysAgo(20) },
  ];
  return {
    version: 1,
    organizationId: ORGANIZATION_ID,
    currentUserId: null,
    users,
    companies,
    contacts,
    stages,
    opportunities,
    activities,
    tasks,
    savedViews,
    automationRules,
    automationRuns: [],
    businessRules: { stale_contact_days: 21, stuck_opportunity_days: 30, overdue_task_days: 0 },
    importJobs: {},
  };
}

function readState(): DemoState {
  if (typeof window === "undefined") return seedState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 1 && parsed.organizationId === ORGANIZATION_ID) return parsed;
    }
  } catch {
    // Corrupt or unavailable browser storage falls back to the clean seed.
  }
  return seedState();
}

function writeState(state: DemoState) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The active interaction still works if browser storage is disabled.
    }
  }
}

export function resetBrowserDemoData() {
  const state = seedState();
  if (typeof window !== "undefined") {
    try {
      const previous = window.localStorage.getItem(STORAGE_KEY);
      if (previous) state.currentUserId = (JSON.parse(previous) as DemoState).currentUserId ?? null;
    } catch {
      state.currentUserId = null;
    }
  }
  writeState(state);
}

function fail(status: number, message: string): never {
  const error = new Error(message) as Error & { status: number; detail: string };
  error.status = status;
  error.detail = message;
  throw error;
}

function authResponse(user: RecordValue) {
  return { access_token: "fieldline-demo-" + user.id, token_type: "bearer", user };
}

function currentUser(state: DemoState) {
  return state.users.find((user) => user.id === state.currentUserId) ?? null;
}

function listResult(items: RecordValue[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 25)));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, page_size: pageSize, total: items.length };
}

function active(items: RecordValue[]) {
  return items.filter((item) => !item.archived_at);
}

function requireOrganization(state: DemoState, organizationId: string) {
  if (organizationId !== state.organizationId) fail(404, "Organization not found");
  const user = currentUser(state);
  if (!user || !user.memberships.some((membership: RecordValue) => membership.organization_id === organizationId)) {
    fail(403, "Organization access denied");
  }
  return user;
}

function contactList(state: DemoState, url: URL) {
  let items = active(state.contacts);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q) items = items.filter((item) => [item.first_name, item.last_name, item.email, item.job_title].some((v) => String(v ?? "").toLowerCase().includes(q)));
  return listResult(items, url);
}

function companyList(state: DemoState, url: URL) {
  let items = active(state.companies);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q) items = items.filter((item) => [item.name, item.website, item.phone].some((v) => String(v ?? "").toLowerCase().includes(q)));
  return listResult(items, url);
}

function contactTimeline(state: DemoState, contactId: string) {
  const items = [
    ...state.activities.filter((item) => item.contact_id === contactId).map((item) => ({ id: item.id, kind: "activity", timestamp: item.occurred_at, title: item.title, summary: item.body, actor_user_id: item.actor_user_id })),
    ...state.tasks.filter((item) => item.contact_id === contactId).map((item) => ({ id: item.id, kind: "task", timestamp: item.updated_at, title: item.title, summary: item.completed_at ? "Task completed" : "Follow-up task", actor_user_id: item.created_by_user_id })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { items, limit: 20, next_before: null, next_before_id: null };
}

function qualityReport(state: DemoState) {
  const duplicateContact = ["ct-2011", "ct-2012"];
  const activeContacts = active(state.contacts);
  const duplicateExists = duplicateContact.every((id) => activeContacts.some((item) => item.id === id));
  const issues = activeContacts.filter((item) => !item.email).map((item) => ({
    code: "missing_email", entity_type: "contact", entity_id: item.id, severity: "medium",
    title: "Contact has no email", detail: item.first_name + " " + item.last_name + " is missing an email address.", fixable: true,
  }));
  if (duplicateExists) issues.push({
    code: "possible_duplicate_contact", entity_type: "contact", entity_id: duplicateContact[1], severity: "high",
    title: "Possible duplicate contact", detail: "Two contact records share the same email and organization.", fixable: true,
  });
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total_issues: issues.length + 1, high: issues.filter((x) => x.severity === "high").length,
      medium: issues.filter((x) => x.severity === "medium").length, low: 1,
      duplicate_contacts: duplicateExists ? 1 : 0, duplicate_companies: 0,
      incomplete_records: issues.filter((x) => x.code === "missing_email").length,
      stale_contacts: 1, opportunity_issues: 1, overdue_tasks: state.tasks.filter((x) => !x.completed_at && x.due_at && x.due_at < new Date().toISOString()).length,
    },
    duplicate_candidates: duplicateExists ? [{
      entity_type: "contact", first_id: duplicateContact[0], second_id: duplicateContact[1],
      first_label: "Morgan Reed", second_label: "Morgan Redd", similarity: 0.97,
      reasons: ["Same email address", "Same company", "Similar full name"],
    }] : [],
    issues,
  };
}

function triggerAutomation(state: DemoState, opportunity: RecordValue) {
  const trigger = opportunity.status === "won" ? "opportunity.won" : opportunity.status === "lost" ? "opportunity.lost" : null;
  if (!trigger) return;
  for (const rule of state.automationRules.filter((item) => item.enabled && item.trigger === trigger)) {
    const runId = makeId("run");
    const taskId = makeId("task");
    const task = {
      id: taskId, organization_id: state.organizationId, created_by_user_id: state.currentUserId,
      assigned_to_user_id: opportunity.owner_user_id, company_id: opportunity.company_id,
      contact_id: opportunity.contact_id, opportunity_id: opportunity.id,
      title: rule.action_config.title, description: "Created by " + rule.name,
      priority: rule.action_config.priority, due_at: new Date(Date.now() + Number(rule.action_config.due_days || 1) * 86_400_000).toISOString(),
      completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    state.tasks.unshift(task);
    state.automationRuns.unshift({
      id: runId, workflow: rule.name, trigger, event_key: opportunity.id + ":" + trigger,
      status: "completed", action_type: rule.action_type, result: { task_id: taskId, title: task.title },
      created_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    });
  }
}

export async function demoApiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const state = readState();
  const method = (options.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://fieldline.demo");
  const route = url.pathname.replace(/^\/api\/v1/, "");
  const parts = route.split("/").filter(Boolean);
  const payload = options.body && typeof options.body === "object" && !(options.body instanceof FormData)
    ? (options.body as RecordValue)
    : {};

  if (parts[0] === "auth") {
    if (parts[1] === "login" && method === "POST") {
      const user = state.users.find((item) => item.email.toLowerCase() === String(payload.email ?? "").toLowerCase());
      if (!user || payload.password !== "Demo1234!") fail(401, "Invalid demo credentials");
      state.currentUserId = user.id;
      writeState(state);
      return authResponse(user) as T;
    }
    if (parts[1] === "signup" && method === "POST") {
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (!email || state.users.some((item) => item.email.toLowerCase() === email)) fail(409, "An account with that email already exists");
      const user = {
        id: makeId("user"), email, full_name: String(payload.full_name ?? "New user"),
        is_active: true, memberships: [{ organization_id: state.organizationId, role: "owner" }],
      };
      state.users.push(user);
      state.currentUserId = user.id;
      writeState(state);
      return authResponse(user) as T;
    }
    if (parts[1] === "refresh" && method === "POST") {
      const user = currentUser(state);
      if (!user) fail(401, "Not authenticated");
      return authResponse(user) as T;
    }
    if (parts[1] === "logout" && method === "POST") {
      state.currentUserId = null;
      writeState(state);
      return undefined as T;
    }
    if (parts[1] === "me" && method === "GET") {
      const user = currentUser(state);
      if (!user) fail(401, "Not authenticated");
      return user as T;
    }
  }

  if (parts[0] !== "organizations" || !parts[1]) fail(404, "Demo endpoint not found");
  const user = requireOrganization(state, parts[1]);
  const resource = parts[2];
  const id = parts[3];
  const sub = parts[4];
  const isAdmin = ["owner", "admin"].includes(user.memberships[0]?.role);

  if (resource === "companies") {
    const rows = active(state.companies);
    if (!id && method === "GET") return companyList(state, url) as T;
    if (!id && method === "POST") {
      const name = String(payload.name ?? "").trim();
      if (!name) fail(422, "Company name is required");
      const item = { id: makeId("company"), organization_id: state.organizationId, owner_user_id: state.currentUserId, name, website: payload.website ?? null, phone: payload.phone ?? null };
      state.companies.unshift(item); writeState(state); return item as T;
    }
    const item = rows.find((x) => x.id === id);
    if (!item) fail(404, "Company not found");
    if (method === "GET") return item as T;
    if (method === "PATCH") { Object.assign(item, payload); writeState(state); return item as T; }
    if (method === "DELETE") { item.archived_at = new Date().toISOString(); writeState(state); return undefined as T; }
  }

  if (resource === "contacts") {
    if (id && sub === "relationship-health" && method === "GET") {
      const contact = active(state.contacts).find((x) => x.id === id);
      if (!contact) fail(404, "Contact not found");
      const count = state.activities.filter((x) => x.contact_id === id).length;
      const lastActivity = state.activities.filter((x) => x.contact_id === id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
      return {
        contact_id: id, score: count ? 82 : 54, band: count ? "healthy" : "warming",
        last_activity_at: lastActivity?.occurred_at ?? null, activity_count_30d: count,
        open_opportunity_count: state.opportunities.filter((x) => x.contact_id === id && x.status === "open").length,
        overdue_task_count: state.tasks.filter((x) => x.contact_id === id && !x.completed_at && x.due_at < new Date().toISOString()).length,
        evidence: [{ code: "recent_activity", impact: 12, description: count ? "Recent customer activity is recorded." : "No recent activity is recorded." }],
      } as T;
    }
    if (id && sub === "timeline" && method === "GET") return contactTimeline(state, id) as T;
    if (id && sub === "relationship-graph" && method === "GET") {
      const contact = active(state.contacts).find((x) => x.id === id);
      if (!contact) fail(404, "Contact not found");
      const company = state.companies.find((x) => x.id === contact.company_id);
      const opps = state.opportunities.filter((x) => x.contact_id === id);
      const tasks = state.tasks.filter((x) => x.contact_id === id).slice(0, 3);
      const acts = state.activities.filter((x) => x.contact_id === id).slice(0, 3);
      const nodes: RecordValue[] = [{ id: contact.id, type: "contact", label: contact.first_name + " " + contact.last_name, meta: { lifecycle: contact.lifecycle, email: contact.email } }];
      const edges: RecordValue[] = [];
      const add = (item: RecordValue, type: string, label: string, relation: string) => {
        nodes.push({ id: item.id, type, label, meta: {} }); edges.push({ id: makeId("edge"), source: contact.id, target: item.id, label: relation });
      };
      if (company) add(company, "company", company.name, "works at");
      for (const opp of opps) add(opp, "opportunity", opp.name, "engaged in");
      for (const task of tasks) add(task, "task", task.title, "follow-up");
      for (const activity of acts) add(activity, "activity", activity.title, "activity");
      return { contact_id: id, nodes, edges } as T;
    }
    const rows = active(state.contacts);
    if (!id && method === "GET") return contactList(state, url) as T;
    if (!id && method === "POST") {
      const first = String(payload.first_name ?? "").trim();
      const last = String(payload.last_name ?? "").trim();
      if (!first || !last) fail(422, "First and last name are required");
      const item = { id: makeId("contact"), organization_id: state.organizationId, owner_user_id: state.currentUserId, first_name: first, last_name: last, email: payload.email ?? null, phone: payload.phone ?? null, job_title: payload.job_title ?? null, lifecycle: payload.lifecycle ?? "lead", company_id: payload.company_id ?? null };
      state.contacts.unshift(item); writeState(state); return item as T;
    }
    const item = rows.find((x) => x.id === id);
    if (!item) fail(404, "Contact not found");
    if (method === "GET") return item as T;
    if (method === "PATCH") { Object.assign(item, payload); writeState(state); return item as T; }
    if (method === "DELETE") { item.archived_at = new Date().toISOString(); writeState(state); return undefined as T; }
  }

  if (resource === "opportunities") {
    if (!id && method === "GET") {
      let items = active(state.opportunities);
      const status = url.searchParams.get("status");
      if (status) items = items.filter((x) => x.status === status);
      return listResult(items, url) as T;
    }
    if (!id && method === "POST") {
      const item = {
        id: makeId("opportunity"), organization_id: state.organizationId, owner_user_id: state.currentUserId,
        company_id: payload.company_id ?? null, contact_id: payload.contact_id ?? null,
        stage_id: payload.stage_id ?? state.stages[0].id, name: String(payload.name ?? "New opportunity"),
        amount: payload.amount == null ? null : String(payload.amount), status: payload.status ?? "open",
        expected_close_date: payload.expected_close_date ?? null, lost_reason: payload.lost_reason ?? null,
      };
      state.opportunities.unshift(item); writeState(state); return item as T;
    }
    const item = active(state.opportunities).find((x) => x.id === id);
    if (!item) fail(404, "Opportunity not found");
    if (method === "PATCH") {
      const previousStatus = item.status;
      Object.assign(item, payload);
      if (item.stage_id === "st-5" || state.stages.find((x) => x.id === item.stage_id)?.is_won) item.status = "won";
      if (item.stage_id === "st-6") item.status = "lost";
      if (item.status !== previousStatus) triggerAutomation(state, item);
      writeState(state); return item as T;
    }
    if (method === "DELETE") { item.archived_at = new Date().toISOString(); writeState(state); return undefined as T; }
  }

  if (resource === "pipeline" && id === "stages" && method === "GET") return state.stages as T;
  if (resource === "pipeline" && id === "stuck" && method === "GET") {
    const items = state.opportunities.filter((x) => x.status === "open").filter((x) => Date.now() - Date.parse(x.created_at ?? isoDaysAgo(5)) > Number(state.businessRules.stuck_opportunity_days) * 86_400_000).map((x) => ({
      id: x.id, name: x.name, stage_id: x.stage_id, stage_name: state.stages.find((s) => s.id === x.stage_id)?.name ?? "Unknown",
      amount: x.amount, status: x.status, stage_age_days: Math.floor((Date.now() - Date.parse(x.created_at ?? isoDaysAgo(5))) / 86_400_000),
      last_activity_at: null, expected_close_date: x.expected_close_date, overdue_task_count: 0, has_next_action: false,
      reasons: ["No recent pipeline activity"], recommended_action: "Confirm the next customer decision and update the close plan.",
    }));
    return { generated_at: new Date().toISOString(), configured_threshold_days: state.businessRules.stuck_opportunity_days, items } as T;
  }
  if (resource === "pipeline" && id === "stages" && method === "POST") {
    if (!isAdmin) fail(403, "Owner/admin access is required");
    const name = String(payload.name ?? "").trim();
    if (!name) fail(422, "Stage name is required");
    if (state.stages.some((x) => x.name.toLowerCase() === name.toLowerCase())) fail(409, "Stage already exists");
    const item = { id: makeId("stage"), organization_id: state.organizationId, name, order_index: state.stages.length, win_probability: Number(payload.win_probability ?? 50), is_closed: false, is_won: false };
    state.stages.push(item); writeState(state); return item as T;
  }

  if (resource === "attention" && method === "GET") {
    const items = state.tasks.filter((x) => !x.completed_at && x.due_at && x.due_at < new Date().toISOString()).map((x) => ({
      entity_type: "task", entity_id: x.id, priority: x.priority === "high" ? 96 : 82, title: x.title,
      reason: "Task is overdue and still open.", due_at: x.due_at, last_activity_at: null,
    })).slice(0, Number(url.searchParams.get("limit") ?? 6));
    return { items, generated_at: new Date().toISOString() } as T;
  }

  if (resource === "work-planner" && method === "GET") {
    const items = state.tasks.filter((x) => !x.completed_at).map((x) => ({
      entity_type: "task", entity_id: x.id, priority: x.priority === "high" ? 96 : x.due_at < new Date().toISOString() ? 82 : 55,
      title: x.title, reason: x.due_at < new Date().toISOString() ? "This follow-up is overdue." : "A planned customer action is still open.",
      next_action: "Complete the follow-up and record the customer outcome.",
      evidence: [x.due_at < new Date().toISOString() ? "Past due date" : "Open task", x.priority + " priority"],
      due_at: x.due_at, last_activity_at: null,
    })).sort((a, b) => b.priority - a.priority);
    return { generated_at: new Date().toISOString(), items } as T;
  }

  if (resource === "engagement" && id === "activities" && method === "POST") {
    const item = { id: makeId("activity"), organization_id: state.organizationId, actor_user_id: state.currentUserId, company_id: payload.company_id ?? null, contact_id: payload.contact_id ?? null, opportunity_id: payload.opportunity_id ?? null, activity_type: payload.activity_type ?? "note", title: String(payload.title ?? "Customer activity"), body: payload.body ?? null, occurred_at: new Date().toISOString() };
    state.activities.unshift(item); writeState(state); return item as T;
  }
  if (resource === "engagement" && id === "activities" && method === "GET") return state.activities as T;
  if (resource === "engagement" && id === "tasks" && method === "POST") {
    const item = { id: makeId("task"), organization_id: state.organizationId, created_by_user_id: state.currentUserId, assigned_to_user_id: payload.assigned_to_user_id ?? state.currentUserId, company_id: payload.company_id ?? null, contact_id: payload.contact_id ?? null, opportunity_id: payload.opportunity_id ?? null, title: String(payload.title ?? "Follow-up task"), description: payload.description ?? null, priority: payload.priority ?? "normal", due_at: payload.due_at ?? null, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    state.tasks.unshift(item); writeState(state); return item as T;
  }
  if (resource === "engagement" && id === "tasks" && sub && method === "PATCH") {
    const item = state.tasks.find((x) => x.id === sub);
    if (!item) fail(404, "Task not found");
    if (payload.completed === true) item.completed_at = new Date().toISOString();
    Object.assign(item, { ...payload, updated_at: new Date().toISOString() }); writeState(state); return item as T;
  }

  if (resource === "data-quality" && method === "GET") return qualityReport(state) as T;
  if (resource === "data-quality" && id && sub && parts[5] === "merge" && method === "POST") {
    if (!isAdmin) fail(403, "Owner/admin access is required");
    const survivorId = String(payload.survivor_id ?? "");
    const duplicate = state.contacts.find((x) => x.id === sub) ?? state.companies.find((x) => x.id === sub);
    const survivor = state.contacts.find((x) => x.id === survivorId) ?? state.companies.find((x) => x.id === survivorId);
    if (!duplicate || !survivor) fail(404, "Merge record not found");
    const entityType = id === "contact" ? "contact" : "company";
    if (entityType === "contact") {
      for (const row of [...state.activities, ...state.tasks, ...state.opportunities]) if (row.contact_id === sub) row.contact_id = survivorId;
    } else {
      for (const row of [...state.contacts, ...state.opportunities, ...state.activities, ...state.tasks]) if (row.company_id === sub) row.company_id = survivorId;
    }
    duplicate.archived_at = new Date().toISOString(); writeState(state);
    return { operation_id: makeId("merge"), entity_type: entityType, survivor_id: survivorId, merged_id: sub, completed_at: new Date().toISOString() } as T;
  }

  if (resource === "saved-views") {
    if (!id && method === "GET") return state.savedViews as T;
    if (!id && method === "POST") {
      const item = { id: makeId("view"), organization_id: state.organizationId, created_by_user_id: state.currentUserId, resource: "contacts", name: String(payload.name ?? "New view"), shared: Boolean(payload.shared), definition_version: 1, definition: payload.definition ?? { query: null, lifecycle: [], company_id: null, owner_user_id: null, has_email: null, sort: "updated_desc" } };
      state.savedViews.unshift(item); writeState(state); return item as T;
    }
    const item = state.savedViews.find((x) => x.id === id);
    if (!item) fail(404, "Saved view not found");
    if (sub === "execute" && method === "GET") {
      let contacts = active(state.contacts);
      const d = item.definition ?? {};
      if (Array.isArray(d.lifecycle) && d.lifecycle.length) contacts = contacts.filter((x) => d.lifecycle.includes(x.lifecycle));
      if (d.query) contacts = contacts.filter((x) => (x.first_name + " " + x.last_name + " " + (x.email ?? "")).toLowerCase().includes(String(d.query).toLowerCase()));
      if (d.has_email === true) contacts = contacts.filter((x) => Boolean(x.email));
      return listResult(contacts, url) as T;
    }
    if (method === "PATCH") { Object.assign(item, payload); if (payload.definition) item.definition = payload.definition; item.definition_version += 1; writeState(state); return item as T; }
    if (method === "DELETE") { state.savedViews = state.savedViews.filter((x) => x.id !== id); writeState(state); return undefined as T; }
    if (method === "GET") return item as T;
  }

  if (resource === "automation") {
    if (id === "rules" && method === "GET") return state.automationRules as T;
    if (id === "rules" && method === "POST") {
      if (!isAdmin) fail(403, "Owner/admin access is required");
      const item = { id: makeId("rule"), organization_id: state.organizationId, name: String(payload.name ?? "New rule"), trigger: payload.trigger ?? "opportunity.won", action_type: payload.action_type ?? "create_task", action_config: payload.action_config ?? { title: "Follow up", priority: "normal", due_days: 1 }, enabled: payload.enabled !== false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      state.automationRules.unshift(item); writeState(state); return item as T;
    }
    if (id === "rules" && sub && method === "PATCH") {
      const item = state.automationRules.find((x) => x.id === sub);
      if (!item) fail(404, "Automation rule not found");
      Object.assign(item, payload, { updated_at: new Date().toISOString() }); writeState(state); return item as T;
    }
    if (id === "runs" && method === "GET") return state.automationRuns.slice(0, 50) as T;
    if (id === "runs" && sub && method === "GET") {
      const item = state.automationRuns.find((x) => x.id === sub);
      if (!item) fail(404, "Automation run not found");
      return item as T;
    }
  }

  if (resource === "business-rules" && method === "GET" && !id) {
    const descriptions: Record<string, string> = {
      stale_contact_days: "Days without a customer interaction before a contact is considered stale",
      stuck_opportunity_days: "Days an open opportunity can remain without progress",
      overdue_task_days: "Grace period for overdue follow-up tasks",
    };
    return Object.entries(state.businessRules).map(([key, value]) => ({ key, value, default: key === "stale_contact_days" ? 21 : key === "stuck_opportunity_days" ? 30 : 0, description: descriptions[key] })) as T;
  }
  if (resource === "business-rules" && id && method === "PATCH") {
    if (!isAdmin) fail(403, "Owner/admin access is required");
    const value = Number(payload.value);
    if (!Number.isInteger(value) || value < 0 || value > 365) fail(422, "Value must be an integer from 0 to 365");
    if (!(id in state.businessRules)) fail(404, "Business rule not found");
    state.businessRules[id] = value; writeState(state);
    return { key: id, value, default: id === "stale_contact_days" ? 21 : id === "stuck_opportunity_days" ? 30 : 0, description: "Updated demo operating threshold" } as T;
  }

  if (resource === "system-health" && method === "GET") {
    return {
      generated_at: new Date().toISOString(), status: "warning",
      checks: {
        browser_demo: { status: "warning", detail: "Synthetic data is stored in this browser only; no production API is connected." },
        database: { status: "warning", detail: "No database is connected in browser-demo mode." },
        automation: { status: "ok", detail: "Deterministic rules execute against the local demo state." },
      },
    } as T;
  }

  if (resource === "imports" && id === "contacts" && sub === "preview" && method === "POST") {
    const form = options.body instanceof FormData ? options.body : null;
    const file = form?.get("file");
    if (!(file instanceof File)) fail(422, "Choose a CSV file");
    const csv = await file.text();
    const lines = csv.trim().split(/\r?\n/);
    const headers = (lines.shift() ?? "").split(",").map((x) => x.trim().toLowerCase());
    const jobsRows = lines.filter(Boolean).map((line, index) => {
      const values = line.split(",");
      const row: RecordValue = {};
      headers.forEach((header, i) => row[header] = (values[i] ?? "").trim());
      const errors: string[] = [];
      if (!row.first_name) errors.push("First name is required");
      if (!row.last_name) errors.push("Last name is required");
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("A valid email is required");
      if (state.contacts.some((x) => x.email?.toLowerCase() === String(row.email ?? "").toLowerCase())) errors.push("Email already exists in this workspace");
      return { row_number: index + 2, row, errors };
    });
    const idValue = makeId("import");
    const job = {
      id: idValue, status: "preview_ready", filename: file.name, total_rows: jobsRows.length,
      valid_rows: jobsRows.filter((x) => !x.errors.length).length,
      invalid_rows: jobsRows.filter((x) => x.errors.length).length, committed_rows: 0,
      created_at: new Date().toISOString(), completed_at: null,
      errors: jobsRows.filter((x) => x.errors.length).map((x) => ({ row_number: x.row_number, errors: x.errors })),
      errors_truncated: false, rows: jobsRows,
    };
    state.importJobs[idValue] = job; writeState(state);
    const { rows: _rows, ...preview } = job;
    return preview as T;
  }

  if (resource === "imports" && id && sub === "commit" && method === "POST") {
    const job = state.importJobs[id];
    if (!job) fail(404, "Import job not found");
    if (job.invalid_rows) fail(409, "Resolve invalid rows before committing");
    const dryRun = Boolean(payload.dry_run);
    const wouldCreate = job.valid_rows;
    if (!dryRun && job.status !== "completed") {
      for (const entry of job.rows) {
        const row = entry.row;
        state.contacts.unshift({ id: makeId("contact"), organization_id: state.organizationId, owner_user_id: state.currentUserId, first_name: row.first_name, last_name: row.last_name, email: row.email, phone: row.phone ?? null, job_title: row.job_title ?? null, lifecycle: "lead", company_id: null });
      }
      job.status = "completed"; job.committed_rows = wouldCreate; job.completed_at = new Date().toISOString();
    }
    writeState(state);
    return { job_id: id, status: dryRun ? "dry_run" : job.status, dry_run: dryRun, total_rows: job.total_rows, valid_rows: job.valid_rows, invalid_rows: job.invalid_rows, would_create: wouldCreate, committed_rows: dryRun ? 0 : job.committed_rows } as T;
  }

  fail(404, "Demo endpoint not found: " + method + " " + route);
}
