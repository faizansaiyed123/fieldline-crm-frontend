import { expect, test } from "@playwright/test";

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "demo@fieldline.test",
  full_name: "Demo User",
  is_active: true,
  memberships: [
    {
      organization_id: "22222222-2222-2222-2222-222222222222",
      role: "owner",
    },
  ],
};

test("renders the authenticated dashboard from live-shaped API data", async ({ page }) => {
  const organizationId = user.memberships[0].organization_id;

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "test-access-token",
        token_type: "bearer",
        user,
      }),
    });
  });

  await page.route(
    `**/api/v1/organizations/${organizationId}/contacts**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          page_size: 1,
          total: 3,
        }),
      });
    },
  );

  await page.route(
    `**/api/v1/organizations/${organizationId}/companies**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          page_size: 1,
          total: 2,
        }),
      });
    },
  );

  await page.route(
    `**/api/v1/organizations/${organizationId}/opportunities**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          page_size: 1,
          total: 4,
        }),
      });
    },
  );

  await page.route(
    `**/api/v1/organizations/${organizationId}/attention**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              entity_type: "task",
              entity_id: "33333333-3333-3333-3333-333333333333",
              priority: 95,
              title: "Follow up with Acme",
              reason: "Task is overdue and still incomplete",
              due_at: "2026-09-24T09:00:00Z",
              last_activity_at: null,
            },
          ],
          generated_at: "2026-09-25T09:00:00Z",
        }),
      });
    },
  );

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Good morning. Here is the signal." }),
  ).toBeVisible();
  const contactsCard = page.locator(".stat-card").filter({ hasText: "Contacts" });
  const companiesCard = page.locator(".stat-card").filter({ hasText: "Companies" });
  await expect(contactsCard.locator("strong")).toHaveText("3");
  await expect(companiesCard.locator("strong")).toHaveText("2");
  await expect(page.getByText("Follow up with Acme")).toBeVisible();
  await expect(page.getByText("Evidence based")).toBeVisible();

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});
