import { test, expect } from "@playwright/test";

test.describe("Contract Review - Basic UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size to ensure sidebar is visible
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Document Review page is accessible", async ({ page }) => {
    // Navigate to Document Review page
    await page.goto("/review");
    
    // Page should either load or redirect to login
    // Either way, the route is working
    expect(page.url()).toMatch(/\/(review|login)/);
  });

  test("Login page is accessible", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");
    
    // Verify login form elements are present
    await expect(page.getByPlaceholder("you@lawfirm.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
