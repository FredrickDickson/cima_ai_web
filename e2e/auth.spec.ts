import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByPlaceholder("you@lawfirm.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page loads correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/don't have an account/i)).toBeVisible();
    await page.getByRole("link", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/already have an account/i)).toBeVisible();
    await page.getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to login from a protected route", async ({ page }) => {
    await page.goto("/cases");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login requires accepting terms before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("someone@example.com");
    await page.getByPlaceholder("••••••••").fill("somepassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/accept the terms/i)).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("wrong@email.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.locator("#acceptTerms").check();
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|error|credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test("forgot password link navigates from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot Password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
  });
});
