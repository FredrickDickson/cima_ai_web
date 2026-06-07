import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  const pages = [
    { link: "Research", url: "/research" },
    { link: "Cases", url: "/cases" },
    { link: "Documents", url: "/documents" },
    { link: "Drafting Studio", url: "/drafting" },
    { link: "Contract Review", url: "/contracts" },
    { link: "AI Assistant", url: "/assistant" },
    { link: "Dashboard", url: "/" },
  ];

  for (const p of pages) {
    test(`navigates to ${p.link}`, async ({ page }) => {
      await page.getByRole("link", { name: p.link }).click();
      await expect(page).toHaveURL(p.url);
    });
  }
});
