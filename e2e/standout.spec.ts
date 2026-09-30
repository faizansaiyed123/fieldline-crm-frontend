import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "demo@fieldline.test",
  full_name: "Demo User",
  is_active: true,
  memberships: [{ organization_id: "22222222-2222-2222-2222-222222222222", role: "owner" }],
};

async function seedSession(page: Page) {
  const organizationId = user.memberships[0].organization_id;
  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token", token_type: "bearer", user }),
    });
  });
  return organizationId;
}

test("data quality supports evidence review", async ({ page }) => {
  const organizationId = await seedSession(page);
  await page.route("**/api/v1/organizations/" + organizationId + "/data-quality", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generated_at: "2026-09-25T09:00:00Z",
        summary: {
          total_issues: 2, high: 1, medium: 1, low: 0,
          duplicate_contacts: 1, duplicate_companies: 0, incomplete_records: 1,
          stale_contacts: 0, opportunity_issues: 0, overdue_tasks: 0,
        },
        duplicate_candidates: [{
          entity_type: "contact",
          first_id: "33333333-3333-3333-3333-333333333333",
          second_id: "44444444-4444-4444-4444-444444444444",
          first_label: "Ada Lovelace",
          second_label: "Ada M. Lovelace",
          similarity: 0.93,
          reasons: ["very similar name"],
        }],
        issues: [{
          code: "duplicate_contact",
          entity_type: "contact",
          entity_id: "33333333-3333-3333-3333-333333333333",
          severity: "high",
          title: "Potential duplicate contact",
          detail: "Ada Lovelace matches Ada M. Lovelace: very similar name",
          fixable: true,
        }],
      }),
    });
  });
  await page.goto("/quality");
  await expect(page.getByRole("heading", { name: "Data Quality Center" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ada Lovelace/ })).toBeVisible();
  await page.getByRole("button", { name: /Ada Lovelace/ }).click();
  await expect(page.getByRole("heading", { name: "Choose the survivor" })).toBeVisible();
});

test("planner exposes reasons and next actions", async ({ page }) => {
  const organizationId = await seedSession(page);
  await page.route("**/api/v1/organizations/" + organizationId + "/work-planner**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generated_at: "2026-09-25T09:00:00Z",
        items: [{
          entity_type: "opportunity",
          entity_id: "33333333-3333-3333-3333-333333333333",
          priority: 80,
          title: "Acme renewal",
          reason: "Stage has not changed for 28 days",
          next_action: "Schedule a concrete next action",
          evidence: ["Stage has not changed for 28 days", "No future follow-up task is scheduled"],
          due_at: null,
          last_activity_at: null,
        }],
      }),
    });
  });
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "My work today" })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: "Stage has not changed for 28 days" })).toBeVisible();
  await expect(page.getByText("Schedule a concrete next action")).toBeVisible();
});

test("relationship graph and health console render", async ({ page }) => {
  const organizationId = await seedSession(page);

  await page.route("**/api/v1/organizations/" + organizationId + "/contacts?page_size=100", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{
          id: "33333333-3333-3333-3333-333333333333",
          organization_id: organizationId,
          company_id: null,
          owner_user_id: user.id,
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
          phone: null,
          job_title: "Mathematician",
          lifecycle: "customer",
        }],
        page: 1, page_size: 100, total: 1,
      }),
    });
  });
  await page.route("**/api/v1/organizations/" + organizationId + "/contacts/33333333-3333-3333-3333-333333333333/relationship-graph", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contact_id: "33333333-3333-3333-3333-333333333333",
        nodes: [
          { id: "contact:333", type: "contact", label: "Ada Lovelace", meta: {} },
          { id: "company:777", type: "company", label: "Analytical Engines", meta: {} },
        ],
        edges: [{ id: "edge:1", source: "contact:333", target: "company:777", label: "works at" }],
      }),
    });
  });
  await page.route("**/api/v1/organizations/" + organizationId + "/business-rules", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ key: "contact_inactivity_days", value: 14, default: 14, description: "Days without contact activity before a lead/prospect becomes stale" }]),
    });
  });
  await page.route("**/api/v1/organizations/" + organizationId + "/system-health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generated_at: "2026-09-25T09:00:00Z",
        status: "ok",
        checks: {
          database: { status: "ok", detail: "PostgreSQL connection succeeded" },
          migrations: { status: "ok", detail: "Database is at 0012_standout" },
          pg_trgm: { status: "ok", detail: "Fuzzy matching extension is installed" },
          automation: { status: "ok", detail: "No incomplete automation runs in the last 24 hours" },
        },
      }),
    });
  });

  await page.goto("/relationships");
  await page.getByLabel("Select contact").selectOption("33333333-3333-3333-3333-333333333333");
  await expect(page.getByText("2 nodes · 1 links")).toBeVisible();
  await expect(page.getByText("works at")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Rules & system health" })).toBeVisible();
  await expect(page.getByText("database", { exact: true })).toBeVisible();
  await expect(page.getByText("pg trgm")).toBeVisible();
});


test("contact inspection is keyboard reachable", async ({ page }) => {
  const organizationId = await seedSession(page);
  await page.route("**/api/v1/organizations/" + organizationId + "/contacts?page_size=100", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{
          id: "33333333-3333-3333-3333-333333333333",
          organization_id: organizationId,
          company_id: null,
          owner_user_id: user.id,
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
          phone: null,
          job_title: "Mathematician",
          lifecycle: "customer",
        }],
        page: 1,
        page_size: 100,
        total: 1,
      }),
    });
  });
  await page.route("**/api/v1/organizations/" + organizationId + "/contacts/33333333-3333-3333-3333-333333333333/relationship-health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contact_id: "33333333-33333333-3333-333333333333",
        score: 82,
        band: "healthy",
        last_activity_at: null,
        activity_count_30d: 4,
        open_opportunity_count: 1,
        overdue_task_count: 0,
        evidence: [],
      }),
    });
  });
  await page.goto("/contacts");
  const inspect = page.getByRole("button", { name: "Inspect Ada Lovelace", exact: true });
  await inspect.focus();
  await expect(inspect).toBeFocused();
  const outline = await inspect.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
  await inspect.press("Enter");
  await expect(page.getByRole("dialog", { name: "Ada Lovelace" })).toBeVisible();
});
