import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  const pages = [
    { link: "Dashboard", url: "/dashboard" },
    { link: "Research", url: "/research" },
    { link: "Cases", url: "/cases" },
    { link: "Documents", url: "/documents" },
    { link: "Legal Library", url: "/library" },
    { link: "Drafting Studio", url: "/drafting" },
    { link: "Document Review", url: "/review" },
    { link: "AI Assistant", url: "/assistant" },
  ];

  for (const p of pages) {
    test(`navigates to ${p.link}`, async ({ page }) => {
      await clickSidebarLink(page, p.link);
      await expect(page).toHaveURL(p.url);
    });
  }

  test("sidebar navigates to profile from the account button", async ({ page }) => {
    await page.goto("/dashboard");
    // Sidebar footer has exactly two buttons at desktop width: the account
    // button (name + role), then "Sign out" — account button comes first.
    await page.locator("aside").getByRole("button").first().click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test("sign out returns to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
