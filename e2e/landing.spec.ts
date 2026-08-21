import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Landing (unauthenticated)", () => {
  test("shows marketing content with CTAs to login and register", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" }).first()).toBeVisible();
  });

  test("Sign In nav link goes to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign In" }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Get Started nav link goes to /register", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get Started" }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("terms and privacy pages load", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms/);
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
  });
});

test.describe("Landing redirect when authenticated", () => {
  test("logged-in users are bounced from / to /dashboard", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("logged-in users are bounced from /login to /dashboard", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("logged-in users are bounced from /register to /dashboard", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/register");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
