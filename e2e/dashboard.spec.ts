import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/dashboard");
  });

  test("shows stat cards", async ({ page }) => {
    // Scoped to <main>: "Documents" also exactly matches the sidebar nav
    // link, and "Upcoming Hearings" appears twice (stat label + section
    // heading) — .first() is enough since we're just checking visibility.
    const main = page.getByRole("main");
    for (const label of ["Active Cases", "Documents", "Research Sessions", "Upcoming Hearings"]) {
      await expect(main.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("Quick Actions section links to key pages", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
    await expect(page.getByText("New Research")).toBeVisible();
    await expect(page.getByText("New Case")).toBeVisible();

    await page.getByText("New Case").click();
    await expect(page).toHaveURL(/\/cases/);
  });

  test("navigating from login lands on the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
