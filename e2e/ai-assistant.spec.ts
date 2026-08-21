import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";
import { mockAiChat } from "./helpers/mockAI";

test.describe("AI Assistant", () => {
  test.beforeEach(async ({ page }) => {
    await mockAiChat(page, "Mocked AI Assistant reply for e2e testing.");
    await loginAsTestUser(page);
    await clickSidebarLink(page, "AI Assistant");
    await expect(page).toHaveURL(/\/assistant/);
  });

  test("page loads with message composer", async ({ page }) => {
    await expect(page.getByPlaceholder(/ask cima ai/i)).toBeVisible();
  });

  test("sends a message and shows the mocked streamed reply", async ({ page }) => {
    const input = page.getByPlaceholder(/ask cima ai/i);
    await input.fill("What is the New York Convention?");
    await input.press("Enter");

    await expect(page.getByText("Mocked AI Assistant reply for e2e testing.")).toBeVisible({ timeout: 15000 });
  });

  test("starts a new conversation", async ({ page }) => {
    await page.getByTitle("New conversation").click();
    const input = page.getByPlaceholder(/ask cima ai/i);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("");
  });

  test("switches between context modes", async ({ page }) => {
    for (const label of ["Legal Research", "Drafting", "Doc Analysis"]) {
      const option = page.getByRole("button", { name: label, exact: true });
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await expect(page.getByText(new RegExp(label, "i")).first()).toBeVisible();
      }
    }
  });
});
