import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/profile");
  });

  test("page loads with stats and personal information form", async ({ page }) => {
    // Scoped to <main>: "Documents" also exactly matches the sidebar nav link.
    const main = page.getByRole("main");
    await expect(main.getByText("Total Cases")).toBeVisible();
    await expect(main.getByText("Documents", { exact: true })).toBeVisible();
    await expect(main.getByText("Contract Reviews")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
    await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  });

  test("email field is disabled", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeDisabled();
  });

  test("updates and saves the organization field", async ({ page }) => {
    const org = `E2E Org ${Date.now()}`;
    await page.getByPlaceholder("Your law firm or organization").fill(org);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/updated|saved/i)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByPlaceholder("Your law firm or organization")).toHaveValue(org, { timeout: 10000 });
  });

  test("Account Actions section is visible", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(page.getByRole("heading", { name: "Account Actions" })).toBeVisible();
    await expect(page.getByText("Change Password")).toBeVisible();
    // Scoped to <main>: the sidebar also has its own "Sign out" button.
    await expect(main.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});
