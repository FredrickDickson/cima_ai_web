import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Admin (smoke)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/admin");
  });

  test("upload form renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Upload Legal Document" })).toBeVisible();
    await expect(page.locator('input[type="file"][accept=".pdf"]')).toBeVisible();
    await expect(page.getByPlaceholder(/accra arbitration rules/i)).toBeVisible();
  });

  test("ingested documents list section renders", async ({ page }) => {
    await expect(page.getByText(/uploaded documents/i)).toBeVisible();
  });
});
