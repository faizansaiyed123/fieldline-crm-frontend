import { expect, test } from "@playwright/test";

test("owner can enter the browser demo and revisit seeded CRM records", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use owner account" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Interactive demo")).toBeVisible();

  await page.goto("/companies");
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
  await expect(page.getByText("Northstar Studio")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
  await expect(page.getByText("Northstar Studio")).toBeVisible();
});

test("member account is authenticated but does not receive owner-only automation access", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use member account" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/automation");
  await expect(page.getByText("Owner/admin access is required to inspect and manage automation.")).toBeVisible();
});
