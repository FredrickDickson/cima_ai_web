import { test, expect } from "@playwright/test";

test.describe("Forgot password", () => {
  test("page loads with email form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@lawfirm.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("submitting shows a confirmation banner", async ({ page }) => {
    await page.goto("/forgot-password");
    // Supabase's email validation on this project rejects the "cima.dev"
    // domain (used by the E2E login account) as undeliverable — a real TLD
    // avoids that without needing to own the mailbox (reset doesn't require
    // the email to actually arrive for this request to succeed).
    await page.getByPlaceholder("you@lawfirm.com").fill("e2e-test@gmail.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email for a link/i)).toBeVisible({ timeout: 10000 });
  });

  test("back to sign in link returns to login", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Reset password", () => {
  test("shows an expired-link state without a recovery session", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Link expired" })).toBeVisible({ timeout: 10000 });
  });
});
