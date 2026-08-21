import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";

test.describe("Legal Library", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await clickSidebarLink(page, "Legal Library");
    await expect(page).toHaveURL(/\/library/);
  });

  test("page loads with search and type filters", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Legal Library" })).toBeVisible();
    await expect(page.getByPlaceholder(/search case names, citations/i)).toBeVisible();
    // exact: true — a "All Jurisdictions" filter button elsewhere on the page
    // otherwise collides with the "All" type filter under substring matching.
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Case Law", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Legislation", exact: true })).toBeVisible();
  });

  test("type filters are clickable", async ({ page }) => {
    await page.getByRole("button", { name: "Case Law", exact: true }).click();
    await page.getByRole("button", { name: "Legislation", exact: true }).click();
    await page.getByRole("button", { name: "All", exact: true }).click();
  });

  test("search box accepts input", async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search case names, citations/i);
    await searchBox.fill("arbitration");
    await expect(searchBox).toHaveValue("arbitration");
  });
});
