import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";
import { mockAiChat, mockContractAnalyze } from "./helpers/mockAI";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(dirname, "fixtures", "sample-contract.txt");

test.describe("Document Review (Contract Review)", () => {
  test.beforeEach(async ({ page }) => {
    await mockContractAnalyze(page);
    await mockAiChat(page);
    await loginAsTestUser(page);
  });

  test("page loads with upload/paste tabs", async ({ page }) => {
    await clickSidebarLink(page, "Document Review");
    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByRole("button", { name: "Paste Document Text" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload File" })).toBeVisible();
  });

  test("uploads a document and shows the mocked AI analysis", async ({ page }) => {
    await clickSidebarLink(page, "Document Review");
    await page.getByRole("button", { name: "Upload File" }).click();

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(fixture);

    await expect(page.getByText("sample-contract.txt", { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /analyse document/i }).click();

    // Step tracker should appear while the (mocked) analysis "runs".
    await expect(page.getByText(/analysing document/i)).toBeVisible();

    // Mocked contract-analyze response renders the AI Analysis panel.
    await expect(page.getByRole("heading", { name: "AI Analysis" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/mocked contract has moderate risk/i)).toBeVisible();
  });
});
