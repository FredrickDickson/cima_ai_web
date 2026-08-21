import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";
import { mockLegalSearch, mockEmbedDocument } from "./helpers/mockAI";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(dirname, "fixtures", "sample-document.txt");

test.describe("Research", () => {
  test.beforeEach(async ({ page }) => {
    await mockLegalSearch(page);
    await loginAsTestUser(page);
    await clickSidebarLink(page, "Research");
    await expect(page).toHaveURL(/\/research/);
  });

  test("page loads with query form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Legal Research" })).toBeVisible();
    await expect(page.getByPlaceholder(/grounds for challenging an arbitral award/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^research$/i })).toBeVisible();
  });

  test("submits a query and renders the mocked analysis", async ({ page }) => {
    const queryBox = page.getByPlaceholder(/grounds for challenging an arbitral award/i);
    await queryBox.fill("What are the requirements for a valid arbitration clause?");
    await page.getByRole("button", { name: /^research$/i }).click();

    await expect(page.getByText(/mocked legal research analysis/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Mock v. Example Case")).toBeVisible();
  });

  test("suggested queries populate the query box", async ({ page }) => {
    const suggestionsHeading = page.getByText("Suggested queries");
    if (await suggestionsHeading.isVisible().catch(() => false)) {
      const suggestions = suggestionsHeading.locator("..").getByRole("button");
      const text = await suggestions.first().textContent();
      await suggestions.first().click();
      const queryBox = page.getByPlaceholder(/grounds for challenging an arbitral award/i);
      await expect(queryBox).toHaveValue(text?.trim() ?? "");
    }
  });

  test("uploads a document, tags it with @, and grounds the research query on it", async ({ page }) => {
    await mockEmbedDocument(page);
    const docName = `E2ETagDoc${Date.now()}`;

    // Upload a real document via the Documents page — the mention popup's
    // "Your Documents" results come from a live search_documents RPC against
    // this row, not a mock, so it has to actually exist and reach status
    // "processing"/"ready" (see 20260804000001_gate_search_documents_on_status.sql).
    await clickSidebarLink(page, "Documents");
    await expect(page).toHaveURL(/\/documents/);
    await page.getByRole("button", { name: /upload document/i }).first().click();
    await expect(page.getByRole("heading", { name: "Add Document" })).toBeVisible();
    await page.getByPlaceholder(/shareholder agreement/i).fill(docName);
    await page.locator('input[type="file"]').first().setInputFiles(fixture);
    await expect(page.getByText("sample-document.txt", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^adding\.\.\.$|add document/i }).click();
    await expect(page.getByRole("heading", { name: "Add Document" })).not.toBeVisible({ timeout: 20000 });
    await expect(page.getByText(docName, { exact: true })).toBeVisible({ timeout: 15000 });

    await clickSidebarLink(page, "Research");
    await expect(page).toHaveURL(/\/research/);

    // Type "@" + the exact document name so the FTS match on the RPC side
    // (same tokenizer applied to the same string on both sides) isn't
    // sensitive to how a partial/fuzzy query would tokenize.
    const queryBox = page.getByPlaceholder(/grounds for challenging an arbitral award/i);
    await queryBox.fill(`@${docName}`);

    const suggestion = page.getByRole("button", { name: docName, exact: true });
    await expect(suggestion).toBeVisible({ timeout: 10000 });
    await suggestion.click();

    // Selecting the suggestion splices a marker into the query and renders a chip.
    await expect(queryBox).toHaveValue(new RegExp(`@\\[${docName}\\]`));
    await expect(page.getByText(docName, { exact: true })).toBeVisible();
    await expect(page.getByText("Your Document")).toBeVisible();
    await expect(page.getByText("Answering only from tagged sources")).toBeVisible();

    const searchRequest = page.waitForRequest((req) => req.url().includes("/functions/v1/legal-search"));
    await page.getByRole("button", { name: /^research$/i }).click();
    const req = await searchRequest;
    const body = req.postDataJSON() as { document_ids?: string[] };
    expect(body.document_ids, "tagged document id should be sent to legal-search").toBeTruthy();
    expect(body.document_ids!.length).toBeGreaterThan(0);

    await expect(page.getByText(/mocked legal research analysis/i)).toBeVisible({ timeout: 15000 });
  });
});
