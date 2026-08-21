import { Page } from "@playwright/test";

/**
 * Clicks a sidebar nav link by its label. Dashboard/Landing pages contain
 * other links whose accessible name *contains* the same label (e.g. "Open AI
 * Assistant", "New Research Legal search & analysis"), and Playwright's
 * default name matching is substring-based, so an unscoped
 * `page.getByRole("link", { name })` collides with them. Scoping to the
 * sidebar `<aside>` with an exact match avoids that.
 */
export async function clickSidebarLink(page: Page, label: string) {
  await page.locator("aside").getByRole("link", { name: label, exact: true }).click();
}
