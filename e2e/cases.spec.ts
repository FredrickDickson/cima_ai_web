import { test, expect, Page } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { clickSidebarLink } from "./helpers/nav";

async function openNewMatterModal(page: Page) {
  await clickSidebarLink(page, "Cases");
  await expect(page).toHaveURL(/\/cases/);
  await page.getByRole("button", { name: /new matter/i }).click();
  await expect(page.getByRole("heading", { name: "New Matter" })).toBeVisible();
}

function newMatterModal(page: Page) {
  // The heading's grandparent is the modal card div, which also contains the
  // form — scoping here (rather than to any ancestor "has" match, which
  // includes the whole page) keeps locators from colliding with same-named
  // background elements (e.g. the empty-state "Create Matter" button, the
  // case list's sort <select>).
  return page.getByRole("heading", { name: "New Matter" }).locator("../..");
}

async function fillAndSubmitNewMatter(
  page: Page,
  { title, matterNumber, type, claimant, respondent }: { title: string; matterNumber: string; type?: string; claimant: string; respondent: string }
) {
  const modal = newMatterModal(page);
  await modal.getByPlaceholder("e.g. Acme Corp v. Delta Industries").fill(title);
  await modal.getByPlaceholder("ARB/2025/001").fill(matterNumber);
  if (type) {
    // The "Type" <select> is the only <select> in this modal — the
    // Framework field is a text input with a <datalist>, which Playwright
    // also exposes with role "combobox", so target the tag directly.
    await modal.locator("select").selectOption(type);
  }
  const partyInputs = modal.getByPlaceholder("Party name");
  await partyInputs.first().fill(claimant);
  await partyInputs.nth(1).fill(respondent);
  await modal.getByRole("button", { name: /create matter/i }).click();
}

test("redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/cases");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("Cases", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("Cases page loads with header and search", async ({ page }) => {
    await clickSidebarLink(page, "Cases");
    await expect(page).toHaveURL(/\/cases/);
    await expect(page.getByText(/cases & matters/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /new matter/i })).toBeVisible();
    await expect(page.getByPlaceholder("Search matters...")).toBeVisible();
  });

  test("creates an arbitration matter and shows it in the workspace", async ({ page }) => {
    const title = `E2E Arbitration ${Date.now()}`;
    await openNewMatterModal(page);
    await fillAndSubmitNewMatter(page, {
      title,
      matterNumber: `ARB-${Date.now()}`,
      type: "arbitration",
      claimant: "ABC Corporation",
      respondent: "XYZ Company",
    });

    // On success the modal closes and the case workspace opens in-place (no URL change).
    await expect(page.getByRole("heading", { name: "New Matter" })).not.toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/cases$/);
    await expect(page.getByText(title)).toBeVisible();

    // Arbitration-only actions should be present.
    await expect(page.getByText(/gen tor/i)).toBeVisible();
    await expect(page.getByText(/draft award/i)).toBeVisible();
  });

  test("case workspace tabs are navigable", async ({ page }) => {
    const title = `E2E Tabs Case ${Date.now()}`;
    await openNewMatterModal(page);
    await fillAndSubmitNewMatter(page, {
      title,
      matterNumber: `TAB-${Date.now()}`,
      claimant: "Test Claimant",
      respondent: "Test Respondent",
    });
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });

    // Scoped to <main>: the sidebar (persistent via AppLayout) has its own
    // "Documents"/"Research" links whose names collide with tab labels.
    const main = page.getByRole("main");
    const tabs = ["Overview", "Issues", "Deadlines", "Hearings", "Evidence", "Documents", "Orders", "Research", "Drafts", "Settlement", "AI Insights"];
    for (const tab of tabs) {
      const tabButton = main.getByRole("button", { name: tab, exact: true }).or(main.getByText(tab, { exact: true }));
      if (await tabButton.first().isVisible().catch(() => false)) {
        await tabButton.first().click();
        await expect(tabButton.first()).toBeVisible();
      }
    }
  });

  test("back navigation returns to the case list", async ({ page }) => {
    const title = `E2E Back Nav ${Date.now()}`;
    await openNewMatterModal(page);
    await fillAndSubmitNewMatter(page, {
      title,
      matterNumber: `NAV-${Date.now()}`,
      claimant: "Test Claimant",
      respondent: "Test Respondent",
    });
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });
    // The back button's accessible name is "Cases" (a ChevronLeft icon + the
    // text "Cases"), not "Back" — there's no "Back" text anywhere in it.
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await expect(page.getByText(/cases & matters/i)).toBeVisible();
    await expect(page.getByPlaceholder("Search matters...")).toBeVisible();
  });

  test("search filters the case list", async ({ page }) => {
    await clickSidebarLink(page, "Cases");
    await page.getByPlaceholder("Search matters...").fill("a very unlikely matter name xyzzy123");
    await expect(page.getByText(/no matching matters/i)).toBeVisible();
  });

  test("status filters are clickable", async ({ page }) => {
    await clickSidebarLink(page, "Cases");
    for (const filter of ["All", "Active", "Pending", "Closed", "Settled"]) {
      await page.getByRole("button", { name: filter, exact: true }).click();
    }
  });

  test("new matter form requires a title", async ({ page }) => {
    await openNewMatterModal(page);
    const createButton = newMatterModal(page).getByRole("button", { name: /create matter/i });
    await expect(createButton).toBeDisabled();
  });
});
