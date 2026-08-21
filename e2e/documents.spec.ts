import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";
import { mockEmbedDocument, mockAiChat } from "./helpers/mockAI";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(dirname, "fixtures", "sample-document.txt");

test.describe("Documents", () => {
  test.beforeEach(async ({ page }) => {
    await mockEmbedDocument(page);
    await mockAiChat(page);
    await loginAsTestUser(page);
    await clickSidebarLink(page, "Documents");
    await expect(page).toHaveURL(/\/documents/);
  });

  test("page loads with search and upload controls", async ({ page }) => {
    await expect(page.getByPlaceholder("Search documents...")).toBeVisible();
    await expect(page.getByRole("button", { name: /upload document/i }).first()).toBeVisible();
  });

  test("uploads a document via the Add Document modal", async ({ page }) => {
    const docName = `E2E Doc ${Date.now()}`;
    await page.getByRole("button", { name: /upload document/i }).first().click();
    await expect(page.getByRole("heading", { name: "Add Document" })).toBeVisible();

    await page.getByPlaceholder(/shareholder agreement/i).fill(docName);
    await page.locator('input[type="file"]').first().setInputFiles(fixture);
    await expect(page.getByText("sample-document.txt", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^adding\.\.\.$|add document/i }).click();
    await expect(page.getByRole("heading", { name: "Add Document" })).not.toBeVisible({ timeout: 20000 });
    await expect(page.getByText(docName, { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test("search filters the document list", async ({ page }) => {
    await page.getByPlaceholder("Search documents...").fill("a very unlikely document name xyzzy123");
    await expect(page.getByText(/no documents match/i)).toBeVisible();
  });

  test("Add Document modal can be cancelled", async ({ page }) => {
    await page.getByRole("button", { name: /upload document/i }).first().click();
    await expect(page.getByRole("heading", { name: "Add Document" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Add Document" })).not.toBeVisible();
  });
});
