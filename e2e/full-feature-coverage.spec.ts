import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type ApiResult = { status: number; body: any };
type Workspace = { token: string; organizationId: string; email: string; password: string; stamp: string };

async function createWorkspace(page: Page, organizationLabel: string): Promise<Workspace> {
  const stamp = Date.now().toString() + Math.floor(Math.random() * 100000).toString();
  const email = organizationLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + stamp + "@example.com";
  const password = "Correct Horse Battery Staple";
  await page.goto("/signup");
  const signupResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/v1/auth/signup") && response.request().method() === "POST",
  );
  await page.getByLabel("Organization").fill(organizationLabel + " " + stamp);
  await page.getByLabel("Your name").fill("Jordan Ellis");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create workspace" }).click();
  const signupResponse = await signupResponsePromise;
  expect(signupResponse.status()).toBe(201);
  const payload = await signupResponse.json();
  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();
  return {
    token: payload.access_token as string,
    organizationId: payload.user.memberships[0].organization_id as string,
    email,
    password,
    stamp,
  };
}

async function apiCall(
  page: Page,
  path: string,
  token: string | null,
  method = "GET",
  body: unknown = null,
): Promise<ApiResult> {
  return page.evaluate(async (input: {
    path: string;
    token: string | null;
    method: string;
    body: unknown;
  }) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (input.token) headers.Authorization = "Bearer " + input.token;
    if (input.body !== null) headers["Content-Type"] = "application/json";
    const response = await fetch("/api/v1" + input.path, {
      method: input.method,
      headers,
      credentials: "same-origin",
      body: input.body === null ? undefined : JSON.stringify(input.body),
    });
    const raw = await response.text();
    let result: unknown = null;
    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        result = raw;
      }
    }
    return { status: response.status, body: result };
  }, { path, token, method, body });
}

async function createAutomationRule(
  page: Page,
  name: string,
  trigger: "opportunity.won" | "opportunity.lost",
  taskTitle: string,
) {
  await page.getByRole("button", { name: "Create rule" }).click();
  const dialog = page.getByRole("dialog", { name: "Create automation" });
  await dialog.getByRole("textbox", { name: "Name" }).fill(name);
  await dialog.getByLabel("Trigger").selectOption(trigger);
  await dialog.getByRole("textbox", { name: "Task title" }).fill(taskTitle);
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Due in days").fill("2");
  await dialog.getByRole("button", { name: "Create rule" }).click();
  await expect(page.locator(".automation-rule-row").filter({ hasText: name })).toBeVisible();
}

async function createCompany(page: Page, name: string, website: string) {
  await page.getByRole("button", { name: "Add company" }).click();
  await page.getByLabel("Company name").fill(name);
  await page.getByLabel("Website").fill(website);
  await page.getByLabel("Phone").fill("+1 415 555 0138");
  await page.getByRole("button", { name: "Create company" }).click();
}

async function createContact(
  page: Page,
  firstName: string,
  lastName: string,
  email: string,
  companyName?: string,
) {
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Lifecycle").selectOption("prospect");
  if (companyName) await page.getByLabel("Company").selectOption({ label: companyName });
  await page.getByRole("button", { name: "Create contact" }).click();
}

test("authentication, record CRUD, archival, API detail routes, and pagination use persisted data", async ({ page }) => {
  test.setTimeout(90_000);
  const workspace = await createWorkspace(page, "Harborstone Customer Services");
  const org = workspace.organizationId;

  const health = await apiCall(page, "/health", null);
  const ready = await apiCall(page, "/ready", null);
  const me = await apiCall(page, "/auth/me", workspace.token);
  const membership = await apiCall(page, "/organizations/" + org + "/membership", workspace.token);
  const adminAccess = await apiCall(page, "/organizations/" + org + "/admin-access", workspace.token);
  const anonymousContacts = await apiCall(page, "/organizations/" + org + "/contacts?page=1&page_size=1", null);

  expect(health.status).toBe(200);
  expect(ready.status).toBe(200);
  expect(ready.body.database).toBe("ok");
  expect(me.status).toBe(200);
  expect(me.body.email).toBe(workspace.email);
  expect(membership.status).toBe(200);
  expect(membership.body.role).toBe("owner");
  expect(adminAccess.status).toBe(200);
  expect(anonymousContacts.status).toBe(401);

  await page.getByRole("link", { name: "Companies" }).click();
  await createCompany(page, "Harborstone Group", "https://harborstone.example");
  await expect(page.getByRole("row", { name: /Harborstone Group/ })).toBeVisible();
  await page.getByLabel("Search companies").fill("Harborstone");
  await expect(page.getByRole("row", { name: /Harborstone Group/ })).toBeVisible();
  await page.getByRole("row", { name: /Harborstone Group/ }).click();
  await page.getByLabel("Company name").fill("Harborstone Advisory");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: /Harborstone Advisory/ })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByLabel("Search companies").fill("");
  await page.reload();
  await expect(page.getByRole("row", { name: /Harborstone Advisory/ })).toBeVisible();

  const companyList = await apiCall(page, "/organizations/" + org + "/companies?page=1&page_size=100", workspace.token);
  const company = companyList.body.items.find((item: any) => item.name === "Harborstone Advisory");
  expect(company).toBeTruthy();
  const companyDetail = await apiCall(page, "/organizations/" + org + "/companies/" + company.id, workspace.token);
  expect(companyDetail.status).toBe(200);
  expect(companyDetail.body.website).toBe("https://harborstone.example/");

  await page.getByRole("link", { name: "Contacts" }).click();
  await createContact(page, "Lena", "Park", "lena-" + workspace.stamp + "@example.com", "Harborstone Advisory");
  await expect(page.getByRole("row", { name: /Lena Park/ })).toBeVisible();
  await page.getByLabel("Search contacts").fill("Lena Park");
  await expect(page.getByRole("row", { name: /Lena Park/ })).toBeVisible();
  await page.getByRole("button", { name: "Inspect Lena Park", exact: true }).click();
  await page.getByLabel("First name").fill("Leona");
  await page.getByLabel("Job title").fill("Operations Director");
  await page.getByLabel("Lifecycle").selectOption("customer");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog", { name: "Leona Park" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByLabel("Search contacts").fill("");
  await expect(page.getByRole("button", { name: "Inspect Leona Park relationship" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Leona Park/ })).toBeVisible();

  const contactList = await apiCall(page, "/organizations/" + org + "/contacts?page=1&page_size=100&q=Leona", workspace.token);
  const contact = contactList.body.items.find((item: any) => item.first_name === "Leona");
  expect(contact).toBeTruthy();
  expect(contact.lifecycle).toBe("customer");
  expect(contact.job_title).toBe("Operations Director");
  const contactDetail = await apiCall(page, "/organizations/" + org + "/contacts/" + contact.id, workspace.token);
  expect(contactDetail.status).toBe(200);
  expect(contactDetail.body.company_id).toBe(company.id);
  const healthDetail = await apiCall(page, "/organizations/" + org + "/contacts/" + contact.id + "/relationship-health", workspace.token);
  const timelineDetail = await apiCall(page, "/organizations/" + org + "/contacts/" + contact.id + "/timeline?limit=20", workspace.token);
  expect(healthDetail.status).toBe(200);
  expect(typeof healthDetail.body.score).toBe("number");
  expect(timelineDetail.status).toBe(200);
  expect(Array.isArray(timelineDetail.body.items)).toBe(true);
  await page.screenshot({ path: "test-results/walkthrough/14-record-management.png", fullPage: true });

  await page.getByRole("button", { name: "Inspect Leona Park relationship" }).click();
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive contact" }).click();
  await expect(page.getByRole("button", { name: "Inspect Leona Park relationship" })).toHaveCount(0);
  const archivedContact = await apiCall(page, "/organizations/" + org + "/contacts/" + contact.id, workspace.token);
  expect(archivedContact.status).toBe(404);

  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("row", { name: /Harborstone Advisory/ })).toBeVisible();
  await page.getByRole("row", { name: /Harborstone Advisory/ }).click();
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive company" }).click();
  await expect(page.getByRole("row", { name: /Harborstone Advisory/ })).toHaveCount(0);
  const archivedCompany = await apiCall(page, "/organizations/" + org + "/companies/" + company.id, workspace.token);
  expect(archivedCompany.status).toBe(404);

  for (let index = 0; index < 26; index += 1) {
    const response = await apiCall(page, "/organizations/" + org + "/companies", workspace.token, "POST", {
      name: "Directory Account " + workspace.stamp + "-" + index,
      website: "https://directory-" + workspace.stamp + "-" + index + ".example",
      phone: null,
    });
    expect(response.status).toBe(201);
  }
  await page.goto("/companies");
  await page.reload();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/15-company-pagination.png", fullPage: true });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  const sampleContacts = [
    ["Amina", "Rahman"], ["Ethan", "Blake"], ["Sofia", "Bennett"], ["Noah", "Williams"],
    ["Priya", "Nair"], ["Daniel", "Foster"], ["Maya", "Kapoor"], ["Oliver", "Reed"],
    ["Zara", "Hussain"], ["Leo", "Martin"], ["Isha", "Desai"], ["Lucas", "Morgan"],
    ["Amara", "Johnson"], ["Theo", "Clarke"], ["Nadia", "Hassan"], ["Arjun", "Mehta"],
    ["Isabel", "Carter"], ["Mateo", "Silva"], ["Hana", "Kim"], ["Owen", "Murphy"],
    ["Sara", "Ahmed"], ["Julian", "Brooks"], ["Anika", "Shah"], ["Caleb", "Turner"],
    ["Yasmin", "Ali"], ["Felix", "Ward"],
  ];
  for (let index = 0; index < sampleContacts.length; index += 1) {
    const item = sampleContacts[index];
    const response = await apiCall(page, "/organizations/" + org + "/contacts", workspace.token, "POST", {
      first_name: item[0],
      last_name: item[1],
      email: "directory-" + workspace.stamp + "-" + index + "@example.com",
      lifecycle: "prospect",
    });
    expect(response.status).toBe(201);
  }

  await page.getByRole("link", { name: "Contacts" }).click();
  await page.reload();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/16-contact-pagination.png", fullPage: true });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your workspace." })).toBeVisible();
  await page.getByLabel("Email").fill(workspace.email);
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password").fill(workspace.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/17-auth-session.png", fullPage: true });
});

test("pipeline transitions trigger persisted won/lost automations and planner tasks can be completed", async ({ page }) => {
  const workspace = await createWorkspace(page, "Cedarfield Consulting");
  const org = workspace.organizationId;

  await page.goto("/automation");
  await createAutomationRule(page, "Won deal handoff", "opportunity.won", "Prepare customer kickoff");
  const wonRuleRow = page.locator(".automation-rule-row").filter({ hasText: "Won deal handoff" });
  await wonRuleRow.getByRole("button", { name: "Enabled" }).click();
  await expect(wonRuleRow.getByRole("button", { name: "Disabled" })).toBeVisible();
  await wonRuleRow.getByRole("button", { name: "Disabled" }).click();
  await expect(wonRuleRow.getByRole("button", { name: "Enabled" })).toBeVisible();
  await createAutomationRule(page, "Lost deal follow-up", "opportunity.lost", "Record loss lessons");

  const stageResponse = await apiCall(page, "/organizations/" + org + "/pipeline/stages", workspace.token);
  expect(stageResponse.status).toBe(200);
  expect(stageResponse.body.some((item: any) => item.name === "Closed Won" && item.is_won)).toBe(true);
  const openStage = stageResponse.body.find((item: any) => !item.is_closed);
  expect(openStage).toBeTruthy();
  const createdStage = await apiCall(page, "/organizations/" + org + "/pipeline/stages", workspace.token, "POST", {
    name: "Partner qualification",
    win_probability: 0.6,
    is_closed: false,
    is_won: false,
  });
  expect(createdStage.status).toBe(201);
  const duplicateStage = await apiCall(page, "/organizations/" + org + "/pipeline/stages", workspace.token, "POST", {
    name: "Partner qualification",
    win_probability: 0.6,
    is_closed: false,
    is_won: false,
  });
  expect(duplicateStage.status).toBe(409);

  await page.goto("/opportunities");
  await page.getByRole("button", { name: "New opportunity" }).click();
  await page.getByLabel("Name").fill("Won transition deal");
  await page.getByLabel("Amount").fill("185000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("table").getByText("Won transition deal", { exact: true })).toBeVisible();
  await page.getByRole("table").getByText("Won transition deal", { exact: true }).click();
  await page.getByLabel("Stage").selectOption({ label: "Closed Won" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: /Won transition deal/ })).toContainText("won");
  const wonRow = await apiCall(page, "/organizations/" + org + "/opportunities?page=1&page_size=100&q=Won%20transition%20deal", workspace.token);
  const wonOpportunity = wonRow.body.items.find((item: any) => item.name === "Won transition deal");
  expect(wonOpportunity.status).toBe("won");
  const wonDetail = await apiCall(page, "/organizations/" + org + "/opportunities/" + wonOpportunity.id, workspace.token);
  expect(wonDetail.status).toBe(200);
  expect(wonDetail.body.status).toBe("won");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "New opportunity" }).click();
  await page.getByLabel("Name").fill("Lost transition deal");
  await page.getByLabel("Amount").fill("42000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("table").getByText("Lost transition deal", { exact: true })).toBeVisible();
  await page.getByRole("table").getByText("Lost transition deal", { exact: true }).click();
  await page.getByLabel("Stage").selectOption({ label: "Closed Lost" });
  await expect(page.getByLabel("Lost reason")).toHaveAttribute("required", "");
  await page.getByLabel("Lost reason").fill("Budget moved to next quarter");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: /Lost transition deal/ })).toContainText("lost");
  const lostRows = await apiCall(page, "/organizations/" + org + "/opportunities?page=1&page_size=100&q=Lost%20transition%20deal", workspace.token);
  const lostOpportunity = lostRows.body.items.find((item: any) => item.name === "Lost transition deal");
  expect(lostOpportunity.status).toBe("lost");
  expect(lostOpportunity.lost_reason).toBe("Budget moved to next quarter");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "New opportunity" }).click();
  await page.getByLabel("Name").fill("Archived pipeline record");
  await page.getByLabel("Amount").fill("5000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("table").getByText("Archived pipeline record", { exact: true })).toBeVisible();
  await page.getByRole("table").getByText("Archived pipeline record", { exact: true }).click();
  const currentList = await apiCall(page, "/organizations/" + org + "/opportunities?page=1&page_size=100", workspace.token);
  const archiveTarget = currentList.body.items.find((item: any) => item.name === "Archived pipeline record");
  expect(archiveTarget).toBeTruthy();
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive opportunity" }).click();
  await expect(page.getByRole("table").getByText("Archived pipeline record", { exact: true })).toHaveCount(0);
  const archivedDetail = await apiCall(page, "/organizations/" + org + "/opportunities/" + archiveTarget.id, workspace.token);
  expect(archivedDetail.status).toBe(404);
  await expect(page.locator(".stat-card").filter({ hasText: "Won" }).locator("strong")).toHaveText("1");
  await expect(page.locator(".stat-card").filter({ hasText: "Lost" }).locator("strong")).toHaveText("1");
  await page.screenshot({ path: "test-results/walkthrough/18-pipeline-outcomes.png", fullPage: true });

  await page.goto("/automation");
  await page.reload();
  const runsResponse = await apiCall(page, "/organizations/" + org + "/automation/runs?limit=50", workspace.token);
  expect(runsResponse.status).toBe(200);
  const wonRun = runsResponse.body.find((item: any) => item.workflow === "Won deal handoff");
  const lostRun = runsResponse.body.find((item: any) => item.workflow === "Lost deal follow-up");
  expect(wonRun).toBeTruthy();
  expect(lostRun).toBeTruthy();
  expect(wonRun.status).toBe("completed");
  expect(lostRun.status).toBe("completed");
  const runDetail = await apiCall(page, "/organizations/" + org + "/automation/runs/" + wonRun.id, workspace.token);
  expect(runDetail.status).toBe(200);
  expect(runDetail.body.result.task_id).toBeTruthy();
  await expect(page.locator(".automation-row").filter({ hasText: "Won deal handoff" })).toBeVisible();
  await expect(page.locator(".automation-row").filter({ hasText: "Lost deal follow-up" })).toBeVisible();
  const automatedTasks = await apiCall(page, "/organizations/" + org + "/engagement/tasks?limit=100", workspace.token);
  expect(automatedTasks.body.some((item: any) => item.title === "Prepare customer kickoff" && item.completed === false)).toBe(true);
  expect(automatedTasks.body.some((item: any) => item.title === "Record loss lessons" && item.completed === false)).toBe(true);
  const stuck = await apiCall(page, "/organizations/" + org + "/pipeline/stuck?limit=20", workspace.token);
  expect(stuck.status).toBe(200);
  expect(typeof stuck.body.configured_threshold_days).toBe("number");
  await page.screenshot({ path: "test-results/walkthrough/20-automation-execution.png", fullPage: true });

  const openStageForPagination = openStage.id;
  for (let index = 0; index < 26; index += 1) {
    const response = await apiCall(page, "/organizations/" + org + "/opportunities", workspace.token, "POST", {
      name: "Directory opportunity " + workspace.stamp + "-" + index,
      stage_id: openStageForPagination,
      amount: 1000 + index,
    });
    expect(response.status).toBe(201);
  }
  await page.goto("/opportunities");
  await page.reload();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/19-opportunity-pagination.png", fullPage: true });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();

  await page.goto("/planner");
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Task title").fill("Confirm renewal documents");
  await page.getByLabel("Description").fill("Review and confirm the final customer documentation.");
  await page.getByLabel("Priority").selectOption("high");
  const overdueDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.getByLabel("Due date").fill(overdueDate);
  await page.getByRole("button", { name: "Create task" }).click();
  const overdueRow = page.locator(".planner-row").filter({ hasText: "Confirm renewal documents" });
  await expect(overdueRow).toBeVisible();
  await expect(overdueRow).toContainText("Task is overdue and still incomplete");
  await page.screenshot({ path: "test-results/walkthrough/21-planner-task.png", fullPage: true });
  await overdueRow.getByRole("button", { name: "Complete task" }).click();
  await expect(overdueRow).toHaveCount(0);
  const taskList = await apiCall(page, "/organizations/" + org + "/engagement/tasks?limit=100", workspace.token);
  const completedTask = taskList.body.find((item: any) => item.title === "Confirm renewal documents");
  expect(completedTask).toBeTruthy();
  expect(completedTask.completed).toBe(true);

  await page.goto("/settings");
  const inactivityRow = page.locator(".rule-row").filter({ hasText: "contact inactivity days" });
  await expect(inactivityRow).toBeVisible();
  await inactivityRow.locator('input[type="number"]').fill("13");
  await inactivityRow.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rule updated." })).toBeVisible();
  const rules = await apiCall(page, "/organizations/" + org + "/business-rules", workspace.token);
  expect(rules.status).toBe(200);
  expect(rules.body.find((item: any) => item.key === "contact_inactivity_days").value).toBe(13);
  const invalidRule = await apiCall(page, "/organizations/" + org + "/business-rules/contact_inactivity_days", workspace.token, "PATCH", { value: 400 });
  expect(invalidRule.status).toBe(422);
  const systemHealth = await apiCall(page, "/organizations/" + org + "/system-health", workspace.token);
  expect(systemHealth.status).toBe(200);
  expect(systemHealth.body.status).toBe("ok");
  expect(systemHealth.body.checks.database.status).toBe("ok");
  expect(systemHealth.body.checks.migrations.status).toBe("ok");
  expect(systemHealth.body.checks.pg_trgm.status).toBe("ok");
  await page.reload();
  await expect(inactivityRow.locator('input[type="number"]')).toHaveValue("13");
  await page.screenshot({ path: "test-results/walkthrough/22-rules-system-health.png", fullPage: true });
});

test("quality merges preserve contact and company relationships in PostgreSQL", async ({ page }) => {
  const workspace = await createWorkspace(page, "Northstar Field Services");
  const org = workspace.organizationId;

  await page.goto("/companies");
  await createCompany(page, "Sapphire Logistics", "https://sapphire-one.example");
  await createCompany(page, "Sapphire Logistic", "https://sapphire-two.example");
  await expect(page.getByRole("row", { name: /Sapphire Logisti/ })).toHaveCount(2);

  await page.goto("/contacts");
  await createContact(page, "Riley", "Morgan", "riley-one-" + workspace.stamp + "@example.com");
  await createContact(page, "Riley", "Morgan", "riley-two-" + workspace.stamp + "@example.com");
  await expect(page.getByRole("row", { name: /Riley Morgan/ })).toHaveCount(2);

  const qualityResponse = await apiCall(page, "/organizations/" + org + "/data-quality", workspace.token);
  expect(qualityResponse.status).toBe(200);
  const contactCandidate = qualityResponse.body.duplicate_candidates.find((item: any) =>
    item.entity_type === "contact" && item.first_label === "Riley Morgan" && item.second_label === "Riley Morgan",
  );
  const companyCandidate = qualityResponse.body.duplicate_candidates.find((item: any) =>
    item.entity_type === "company" && [item.first_label, item.second_label].includes("Sapphire Logistics") && [item.first_label, item.second_label].includes("Sapphire Logistic"),
  );
  expect(contactCandidate).toBeTruthy();
  expect(companyCandidate).toBeTruthy();

  const stages = await apiCall(page, "/organizations/" + org + "/pipeline/stages", workspace.token);
  const openStage = stages.body.find((item: any) => !item.is_closed);
  const activity = await apiCall(page, "/organizations/" + org + "/engagement/activities", workspace.token, "POST", {
    contact_id: contactCandidate.second_id,
    activity_type: "note",
    title: "Merge-preserved activity",
    body: "Customer context must remain attached after a duplicate merge.",
  });
  const task = await apiCall(page, "/organizations/" + org + "/engagement/tasks", workspace.token, "POST", {
    contact_id: contactCandidate.second_id,
    title: "Merge-preserved task",
    priority: "high",
    due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const opportunity = await apiCall(page, "/organizations/" + org + "/opportunities", workspace.token, "POST", {
    contact_id: contactCandidate.second_id,
    stage_id: openStage.id,
    name: "Merge-preserved opportunity",
    amount: 7250,
  });
  const linkedContact = await apiCall(page, "/organizations/" + org + "/contacts", workspace.token, "POST", {
    first_name: "Taylor",
    last_name: "Quinn",
    email: "taylor-" + workspace.stamp + "@example.com",
    lifecycle: "customer",
    company_id: companyCandidate.second_id,
  });
  expect(activity.status).toBe(201);
  expect(task.status).toBe(201);
  expect(opportunity.status).toBe(201);
  expect(linkedContact.status).toBe(201);

  await page.goto("/quality");
  await expect(page.getByRole("heading", { name: "Data Quality Center" })).toBeVisible();
  await page.locator(".candidate").filter({ hasText: "Riley Morgan" }).first().click();
  await expect(page.getByRole("dialog", { name: "Choose the survivor" })).toBeVisible();
  await page.getByRole("button", { name: "Merge into Record A" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Merge completed" })).toBeVisible();

  const activeContacts = await apiCall(page, "/organizations/" + org + "/contacts?page=1&page_size=100", workspace.token);
  expect(activeContacts.body.items.some((item: any) => item.id === contactCandidate.first_id)).toBe(true);
  expect(activeContacts.body.items.some((item: any) => item.id === contactCandidate.second_id)).toBe(false);
  const activities = await apiCall(page, "/organizations/" + org + "/engagement/activities?limit=100", workspace.token);
  const tasks = await apiCall(page, "/organizations/" + org + "/engagement/tasks?limit=100", workspace.token);
  const opportunities = await apiCall(page, "/organizations/" + org + "/opportunities?page=1&page_size=100", workspace.token);
  expect(activities.body.find((item: any) => item.id === activity.body.id).contact_id).toBe(contactCandidate.first_id);
  expect(tasks.body.find((item: any) => item.id === task.body.id).contact_id).toBe(contactCandidate.first_id);
  expect(opportunities.body.items.find((item: any) => item.id === opportunity.body.id).contact_id).toBe(contactCandidate.first_id);
  const graph = await apiCall(page, "/organizations/" + org + "/contacts/" + contactCandidate.first_id + "/relationship-graph", workspace.token);
  expect(graph.body.nodes.some((node: any) => node.type === "activity" && node.label === "Merge-preserved activity")).toBe(true);
  expect(graph.body.nodes.some((node: any) => node.type === "task" && node.label === "Merge-preserved task")).toBe(true);
  expect(graph.body.nodes.some((node: any) => node.type === "opportunity" && node.label === "Merge-preserved opportunity")).toBe(true);

  await expect(page.locator(".candidate").filter({ hasText: "Sapphire Logistic" }).first()).toBeVisible();
  await page.locator(".candidate").filter({ hasText: "Sapphire Logistic" }).first().click();
  await expect(page.getByRole("dialog", { name: "Choose the survivor" })).toBeVisible();
  const recordA = page.locator(".compare-card").nth(0);
  const recordALines = (await recordA.innerText()).split("\n");
  const recordAName = recordALines[1]?.trim();
  const survivorButton = recordAName === companyCandidate.first_label ? "Merge into Record A" : "Merge into Record B";
  const companyMergeResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/data-quality/company/") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: survivorButton }).click();
  const companyMergeResponse = await companyMergeResponsePromise;
  expect(companyMergeResponse.status()).toBe(200);
  const companyMergeOperation = await companyMergeResponse.json();
  expect(companyMergeOperation.survivor_id).toBe(companyCandidate.first_id);
  expect(companyMergeOperation.merged_id).toBe(companyCandidate.second_id);
  await expect(page.getByRole("status").filter({ hasText: "Merge completed" })).toBeVisible();
  const movedContact = await apiCall(page, "/organizations/" + org + "/contacts/" + linkedContact.body.id, workspace.token);
  expect(movedContact.status).toBe(200);
  expect(movedContact.body.company_id).toBe(companyMergeOperation.survivor_id);
  const oldCompany = await apiCall(page, "/organizations/" + org + "/companies/" + companyMergeOperation.merged_id, workspace.token);
  expect(oldCompany.status).toBe(404);
  const movedGraph = await apiCall(page, "/organizations/" + org + "/contacts/" + linkedContact.body.id + "/relationship-graph", workspace.token);
  expect(movedGraph.body.nodes.some((node: any) => node.id === "company:" + companyMergeOperation.survivor_id)).toBe(true);
  expect(movedGraph.body.nodes.some((node: any) => node.id === "company:" + companyMergeOperation.merged_id)).toBe(false);
  await expect(page.getByText("No duplicate candidates detected.")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/23-quality-merge.png", fullPage: true });
});

test("saved-view versioning and import validation protect persisted customer data", async ({ page }) => {
  const workspace = await createWorkspace(page, "Cedar Grove Advisory");
  const org = workspace.organizationId;
  const email = "uma-" + workspace.stamp + "@example.com";

  await page.goto("/contacts");
  await createContact(page, "Uma", "Shah", email);
  await expect(page.getByRole("row", { name: /Uma Shah/ })).toBeVisible();

  await page.goto("/views");
  await page.getByRole("button", { name: "Create view" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Prospect directory");
  await page.getByLabel("Contains").fill("Uma");
  await page.getByLabel("Only contacts with email").check();
  await page.getByLabel("Share with the workspace").check();
  await page.getByRole("button", { name: "Save view" }).click();
  await expect(page.getByRole("heading", { name: "Prospect directory" })).toBeVisible();
  await expect(page.getByText(/1 matching contacts/)).toBeVisible();

  const viewList = await apiCall(page, "/organizations/" + org + "/saved-views", workspace.token);
  const view = viewList.body.find((item: any) => item.name === "Prospect directory");
  expect(view).toBeTruthy();
  expect(view.shared).toBe(true);
  const viewDetail = await apiCall(page, "/organizations/" + org + "/saved-views/" + view.id, workspace.token);
  expect(viewDetail.status).toBe(200);
  expect(viewDetail.body.definition_version).toBe(1);
  const viewExecution = await apiCall(page, "/organizations/" + org + "/saved-views/" + view.id + "/execute?page_size=50", workspace.token);
  expect(viewExecution.status).toBe(200);
  expect(viewExecution.body.items.some((item: any) => item.first_name === "Uma" && item.last_name === "Shah")).toBe(true);

  await page.getByRole("button", { name: "Edit" }).click();
  const editor = page.getByRole("dialog", { name: "Edit saved view" });
  await editor.getByRole("textbox", { name: "Name" }).fill("Recently qualified contacts");
  await editor.getByLabel("Contains").fill("Uma");
  await editor.getByLabel("Lifecycle").selectOption("prospect");
  await editor.getByLabel("Sort").selectOption("name_desc");
  await expect(editor.getByLabel("Share with the workspace")).toBeChecked();
  await editor.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "definition version was advanced" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently qualified contacts" })).toBeVisible();
  await expect(page.getByText(/1 matching contacts/)).toBeVisible();
  const updatedViews = await apiCall(page, "/organizations/" + org + "/saved-views", workspace.token);
  const updatedView = updatedViews.body.find((item: any) => item.id === view.id);
  expect(updatedView.name).toBe("Recently qualified contacts");
  expect(updatedView.definition_version).toBeGreaterThan(viewDetail.body.definition_version);
  expect(updatedView.shared).toBe(true);
  expect(updatedView.definition.sort).toBe("name_desc");
  await page.screenshot({ path: "test-results/walkthrough/24-saved-view-lifecycle.png", fullPage: true });

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No saved views")).toBeVisible();
  const noViews = await apiCall(page, "/organizations/" + org + "/saved-views", workspace.token);
  expect(noViews.status).toBe(200);
  expect(noViews.body).toHaveLength(0);

  await page.getByRole("link", { name: "Imports" }).click();
  const invalidPreviewPromise = page.waitForResponse((response) =>
    response.url().includes("/imports/contacts/preview") && response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid-email.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("first_name,last_name,email,lifecycle\nOmar,Rahman,not-an-email,prospect\n"),
  });
  const invalidPreviewResponse = await invalidPreviewPromise;
  expect(invalidPreviewResponse.status()).toBe(201);
  const invalidPreview = await invalidPreviewResponse.json();
  expect(invalidPreview.invalid_rows).toBe(1);
  const invalidJob = await apiCall(page, "/organizations/" + org + "/imports/" + invalidPreview.id, workspace.token);
  expect(invalidJob.status).toBe(200);
  expect(invalidJob.body.status).toBe("preview_ready");
  expect(invalidJob.body.invalid_rows).toBe(1);
  await expect(page.locator(".import-errors")).toBeVisible();
  await expect(page.getByRole("button", { name: "Commit import" })).toBeDisabled();

  const duplicatePreviewPromise = page.waitForResponse((response) =>
    response.url().includes("/imports/contacts/preview") && response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "duplicate-email.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("first_name,last_name,email,lifecycle\nUma,Shah," + email + ",prospect\n"),
  });
  const duplicatePreviewResponse = await duplicatePreviewPromise;
  const duplicatePreview = await duplicatePreviewResponse.json();
  expect(duplicatePreview.invalid_rows).toBe(1);
  expect(JSON.stringify(duplicatePreview.errors)).toContain("email already exists in this organization");
  await expect(page.locator(".import-errors")).toContainText("email already exists in this organization");
  await page.screenshot({ path: "test-results/walkthrough/25-import-validation.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Commit import" })).toBeDisabled();

  const validPreviewPromise = page.waitForResponse((response) =>
    response.url().includes("/imports/contacts/preview") && response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "accepted-contacts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("first_name,last_name,email,lifecycle\nNora,King,nora-" + workspace.stamp + "@example.com,prospect\n"),
  });
  const validPreviewResponse = await validPreviewPromise;
  const validPreview = await validPreviewResponse.json();
  expect(validPreview.invalid_rows).toBe(0);
  const dryRunResponse = page.waitForResponse((response) =>
    response.url().includes("/imports/" + validPreview.id + "/commit") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Dry run" }).click();
  const dryRun = await dryRunResponse;
  expect((await dryRun.json()).would_create).toBe(1);
  await expect(page.getByRole("status")).toContainText("would be created");
  const commitResponse = page.waitForResponse((response) =>
    response.url().includes("/imports/" + validPreview.id + "/commit") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Commit import" }).click();
  const commit = await commitResponse;
  expect((await commit.json()).committed_rows).toBe(1);
  const completedJob = await apiCall(page, "/organizations/" + org + "/imports/" + validPreview.id, workspace.token);
  expect(completedJob.body.status).toBe("completed");
  expect(completedJob.body.committed_rows).toBe(1);

  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByText("Nora King")).toBeVisible();
  const importedContact = await apiCall(page, "/organizations/" + org + "/contacts?page=1&page_size=100&q=Nora", workspace.token);
  expect(importedContact.body.items.some((item: any) => item.first_name === "Nora" && item.last_name === "King")).toBe(true);
  await page.screenshot({ path: "test-results/walkthrough/26-import-readback.png", fullPage: true });
});
