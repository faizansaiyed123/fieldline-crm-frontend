import { expect, test } from "@playwright/test";

test("workspace setup and contact creation work end to end", async ({ page }) => {
  const stamp = Date.now();
  const organization = `Cedarfield Consulting ${stamp}`;
  const email = `e2e-${stamp}@example.com`;

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Start with clean customer context." })).toBeVisible();

  await page.getByLabel("Organization").fill(organization);
  await page.getByLabel("Your name").fill("Morgan Reed");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Correct Horse Battery Staple");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(
    page.getByRole("heading", { name: "Good morning. Here is the signal." }),
  ).toBeVisible();

  const contactsCard = page.locator(".stat-card").filter({ hasText: "Contacts" });
  const companiesCard = page.locator(".stat-card").filter({ hasText: "Companies" });
  const pipelineCard = page.locator(".stat-card").filter({ hasText: "Pipeline" });
  const attentionCard = page.locator(".stat-card").filter({ hasText: "Attention" });

  await expect(contactsCard.locator("strong")).toHaveText("0");
  await expect(companiesCard.locator("strong")).toHaveText("0");
  await expect(pipelineCard.locator("strong")).toHaveText("0");
  await expect(attentionCard.locator("strong")).toHaveText("0");

  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByRole("heading", { name: "Contacts", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("First name").fill("Noor");
  await page.getByLabel("Last name").fill("Patel");
  await page.getByLabel("Email").fill(`noor-${stamp}@example.com`);
  await page.getByLabel("Lifecycle").selectOption("prospect");
  await page.getByRole("button", { name: "Create contact" }).click();

  await expect(page.getByText("Noor Patel")).toBeVisible();

  await page.getByRole("link", { name: "Overview" }).click();
  await expect(contactsCard.locator("strong")).toHaveText("1");
});
