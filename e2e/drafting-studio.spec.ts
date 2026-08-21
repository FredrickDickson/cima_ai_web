import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";
import { mockGenerateDraft } from "./helpers/mockAI";

test.describe("Drafting Studio", () => {
  test.beforeEach(async ({ page }) => {
    await mockGenerateDraft(page);
    await loginAsTestUser(page);
    await clickSidebarLink(page, "Drafting Studio");
    await expect(page).toHaveURL(/\/drafting/);
  });

  test("page loads in prompt mode with the templates/drafts panel", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "What would you like to draft?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Templates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Drafts" })).toBeVisible();
  });

  test("generates a draft from a natural-language prompt", async ({ page }) => {
    await page.getByPlaceholder(/draft a notice of arbitration/i).fill("Draft a simple non-disclosure agreement for e2e testing.");
    await page.getByRole("button", { name: /^generate$/i }).click();

    await expect(page.getByText(/mocked generated draft content/i)).toBeVisible({ timeout: 15000 });
  });

  test("My Drafts tab is switchable", async ({ page }) => {
    await page.getByRole("button", { name: "My Drafts" }).click();
    await page.getByRole("button", { name: "Templates" }).click();
    await expect(page.getByPlaceholder("Search templates...")).toBeVisible();
  });
});
