import { Page } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@cima.dev";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";

export async function loginAsTestUser(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  const acceptTerms = page.locator("#acceptTerms");
  if (!(await acceptTerms.isChecked())) {
    await acceptTerms.check();
  }
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for navigation away from login page
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15000 });
}

export { TEST_EMAIL, TEST_PASSWORD };
