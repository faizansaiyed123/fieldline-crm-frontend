import { expect, test } from "@playwright/test";

test("full browser journey persists real CRM state across workspace screens", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/signup");

  await page.getByLabel("Organization").fill("Northstar Field Services");
  await page.getByLabel("Your name").fill("Jordan Ellis");
  await page.getByLabel("Email").fill(`deep-${stamp}@example.com`);
  await page.getByLabel("Password").fill("Correct Horse Battery Staple");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/01-dashboard.png", fullPage: true });

  await page.getByRole("link", { name: "Companies" }).click();
  await page.getByRole("button", { name: "Add company" }).click();
  await page.getByLabel("Company name").fill("Acme Systems");
  await page.getByLabel("Website").fill("https://acme.example");
  await page.getByLabel("Phone").fill("+91 98765 43210");
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByText("Acme Systems")).toBeVisible();
  await page.getByText("Acme Systems", { exact: true }).click();
  await page.getByLabel("Company name").fill("Acme Systems Intl");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: /Acme Systems Intl/ })).toBeVisible();
  await page.getByLabel("Close").click();
  await page.reload();
  await expect(page.getByRole("row", { name: /Acme Systems Intl/ })).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/02-companies.png", fullPage: true });

  await page.getByRole("link", { name: "Contacts" }).click();
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("First name").fill("Maya");
  await page.getByLabel("Last name").fill("Chen");
  await page.getByLabel("Email").fill(`maya-${stamp}@example.com`);
  await page.getByLabel("Lifecycle").selectOption("prospect");
  await page.getByLabel("Company").selectOption({ label: "Acme Systems Intl" });
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByText("Maya Chen")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/03-contacts.png", fullPage: true });

  await page.getByRole("button", { name: "Inspect Maya Chen relationship" }).click();
  await expect(page.getByRole("dialog", { name: "Maya Chen" })).toBeVisible();
  await expect(page.getByText("Deterministic relationship-health heuristic.")).toBeVisible();
  await expect(page.getByText("Recent context")).toBeVisible();
  await page.getByLabel("Activity summary").fill("Discovery meeting completed");
  await page.getByLabel("Notes").fill("Reviewed regional rollout requirements and agreed on the next steps.");
  await page.getByRole("button", { name: "Record activity" }).click();
  await expect(page.getByText("Discovery meeting completed")).toBeVisible();
  await page.getByLabel("Task title").fill("Send rollout proposal");
  await page.getByLabel("Task priority").selectOption("high");
  await page.getByLabel("Task due date").fill("2026-10-28");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Send rollout proposal")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/04-relationship-context.png", fullPage: true });
  await page.getByLabel("Close").click();

  await page.getByRole("link", { name: "Pipeline" }).click();
  await page.getByRole("button", { name: "New opportunity" }).click();
  await page.getByLabel("Name").fill("Regional rollout");
  await page.getByLabel("Amount").fill("250000");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("table").getByText("Regional rollout", { exact: true })).toBeVisible();
  await page.getByRole("table").getByText("Regional rollout", { exact: true }).click();
  await page.getByLabel("Expected close").fill("2026-11-15");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Expected close")).toHaveValue("2026-11-15");
  await page.getByRole("button", { name: "Close" }).click();
  await page.screenshot({ path: "test-results/walkthrough/05-pipeline.png", fullPage: true });

  await page.getByRole("link", { name: "Saved views" }).click();
  await page.getByRole("button", { name: "Create view" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Prospects with email");
  await page.getByLabel("Contains").fill("Maya");
  await page.getByLabel("Only contacts with email").check();
  await page.getByRole("button", { name: "Save view" }).click();
  await expect(page.getByRole("heading", { name: "Prospects with email" })).toBeVisible();
  await expect(page.getByText(/1 matching contacts/)).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/06-saved-views.png", fullPage: true });

  await page.getByRole("link", { name: "Imports" }).click();
  const csv = "first_name,last_name,email,lifecycle\nPriya,Nair,priya-" + stamp + "@example.com,prospect\n";
  await page.locator('input[type="file"]').setInputFiles({
    name: "contacts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText("All rows passed validation.")).toBeVisible();
  await page.getByRole("button", { name: "Dry run" }).click();
  await expect(page.getByText(/would be created/)).toBeVisible();
  await page.getByRole("button", { name: "Commit import" }).click();
  await expect(page.getByText(/Imported 1 contacts successfully/)).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/07-imports.png", fullPage: true });

  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByText("Priya Nair")).toBeVisible();
  await page.screenshot({ path: "test-results/walkthrough/08-contact-after-import.png", fullPage: true });

  const productPages = [
    ["/planner", "09-planner.png"],
    ["/quality", "10-data-quality.png"],
    ["/relationships", "11-relationships.png"],
    ["/automation", "12-automation.png"],
    ["/settings", "13-settings.png"],
  ] as const;
  for (const [route, screenshot] of productPages) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "/relationships") {
      await page.getByLabel("Select contact").selectOption({ label: "Maya Chen" });
      await expect(page.getByRole("img", { name: "Customer relationship graph" })).toBeVisible();
    }
    if (route === "/automation") {
      await page.getByRole("button", { name: "Create rule" }).click();
      const ruleDialog = page.getByRole("dialog", { name: "Create automation" });
      await ruleDialog.getByRole("textbox", { name: "Name" }).fill("Won deal handoff");
      await ruleDialog.getByLabel("Trigger").selectOption("opportunity.won");
      await ruleDialog.getByRole("textbox", { name: "Task title" }).fill("Schedule customer kickoff");
      await ruleDialog.getByLabel("Priority").selectOption("high");
      await ruleDialog.getByLabel("Due in days").fill("2");
      await ruleDialog.getByRole("button", { name: "Create rule" }).click();
      await expect(page.getByText("Won deal handoff")).toBeVisible();
    }
    await page.screenshot({ path: `test-results/walkthrough/${screenshot}`, fullPage: true });
  }

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your workspace." })).toBeVisible();
});

test("workspace stays within mobile viewport bounds", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const user = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "mobile@fieldline.test",
    full_name: "Mobile User",
    is_active: true,
    memberships: [
      {
        organization_id: "22222222-2222-2222-2222-222222222222",
        role: "owner",
      },
    ],
  };

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "mobile-token", token_type: "bearer", user }),
    });
  });

  await page.route("**/api/v1/organizations/22222222-2222-2222-2222-222222222222/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/contacts?")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
      });
      return;
    }
    if (url.includes("/companies?")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
      });
      return;
    }
    if (url.includes("/opportunities?")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
      });
      return;
    }
    if (url.includes("/attention")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], generated_at: new Date().toISOString() }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);

  await page.getByRole("link", { name: "Contacts" }).click();
  const contactsWidths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(contactsWidths.document).toBeLessThanOrEqual(contactsWidths.viewport);
});


test("client coalesces concurrent expired-session refreshes", async ({ page }) => {
  let refreshCount = 0;
  let contact401s = 0;
  let company401s = 0;

  const user = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "refresh@fieldline.test",
    full_name: "Refresh User",
    is_active: true,
    memberships: [{ organization_id: "22222222-2222-2222-2222-222222222222", role: "owner" }],
  };
  const base = "/api/v1/organizations/22222222-2222-2222-2222-222222222222";

  await page.route("**/api/v1/auth/refresh", async (route) => {
    refreshCount += 1;
    if (refreshCount > 1) await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: `token-${refreshCount}`, token_type: "bearer", user }),
    });
  });

  await page.route(`**${base}/contacts**`, async (route) => {
    if (contact401s++ === 0) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "expired" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
    });
  });

  await page.route(`**${base}/companies**`, async (route) => {
    if (company401s++ === 0) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "expired" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
    });
  });

  await page.route(`**${base}/opportunities**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, page_size: 25, total: 0 }),
    });
  });
  await page.route(`**${base}/attention`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], generated_at: new Date().toISOString() }),
    });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Good morning. Here is the signal." })).toBeVisible();
  await expect(page.locator(".stat-card").filter({ hasText: "Contacts" }).locator("strong")).toHaveText("0");
  await expect(page.locator(".stat-card").filter({ hasText: "Companies" }).locator("strong")).toHaveText("0");
  expect(refreshCount).toBe(2);
});

test("dashboard surfaces a retryable data failure instead of a false zero state", async ({ page }) => {
  const user = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "retry@fieldline.test",
    full_name: "Retry User",
    is_active: true,
    memberships: [{ organization_id: "22222222-2222-2222-2222-222222222222", role: "owner" }],
  };
  const base = "/api/v1/organizations/22222222-2222-2222-2222-222222222222";
  let shouldFail = true;

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "retry-token", token_type: "bearer", user }),
    });
  });
  await page.route(`**${base}/contacts**`, async (route) => {
    if (shouldFail) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Contacts service unavailable" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], page: 1, page_size: 1, total: 4 }),
    });
  });
  await page.route(`**${base}/companies**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], page: 1, page_size: 1, total: 2 }) });
  });
  await page.route(`**${base}/opportunities**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], page: 1, page_size: 1, total: 3 }) });
  });
  await page.route(`**${base}/attention`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], generated_at: new Date().toISOString() }) });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("alert").filter({ hasText: "could not be refreshed" })).toBeVisible();

  shouldFail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not be refreshed" })).toHaveCount(0);
  await expect(page.locator(".stat-card").filter({ hasText: "Contacts" }).locator("strong")).toHaveText("4");
});
