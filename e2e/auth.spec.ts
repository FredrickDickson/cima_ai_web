import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByPlaceholder("you@lawfirm.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page loads correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/create an account/i)).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/cases");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("wrong@email.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|error|credentials/i)).toBeVisible({ timeout: 10000 });
  });
});
