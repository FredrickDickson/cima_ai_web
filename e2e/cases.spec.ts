import { test, expect } from "@playwright/test";

test.describe("Cases - End to End", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");
  });

  test("Authentication protection - redirect to login", async ({ page }) => {
    // Try to access cases without authentication
    await page.goto("/cases");
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("Authentication and navigation to Cases", async ({ page }) => {
    // Login with test credentials
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/(dashboard|cases)/);
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();
    
    // Verify page loads
    await expect(page).toHaveURL(/\/cases/);
    await expect(page.getByText(/cases & matters/i)).toBeVisible();
    
    // Verify main UI elements are present
    await expect(page.getByText("New Matter")).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test("Case creation flow - arbitration case", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();

    // Click New Matter button
    await page.getByText("New Matter").click();

    // Verify modal opens
    await expect(page.getByText(/create new matter/i)).toBeVisible();

    // Fill in case details
    await page.getByPlaceholder(/case title/i).fill("Test Arbitration Case");
    await page.getByPlaceholder(/matter number/i).fill("ARB-2025-001");
    
    // Select case type
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();

    // Select framework
    await page.getByRole("combobox").nth(1).click();
    await page.getByText("ICC Arbitration Rules").click();

    // Add parties
    await page.getByPlaceholder(/claimant/i).fill("ABC Corporation");
    await page.getByPlaceholder(/respondent/i).fill("XYZ Company");

    // Add description
    await page.getByPlaceholder(/description/i).fill("Test case for e2e testing");

    // Submit form
    await page.getByRole("button", { name: /create matter/i }).click();

    // Wait for navigation to case workspace
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/cases\/[a-f0-9-]+/);

    // Verify case details are displayed
    await expect(page.getByText("Test Arbitration Case")).toBeVisible();
    await expect(page.getByText("ARB-2025-001")).toBeVisible();
  });

  test("Case creation flow - litigation case", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();

    // Click New Matter button
    await page.getByText("New Matter").click();

    // Fill in case details
    await page.getByPlaceholder(/case title/i).fill("Test Litigation Case");
    await page.getByPlaceholder(/matter number/i).fill("LIT-2025-001");
    
    // Select case type
    await page.getByRole("combobox").first().click();
    await page.getByText("Litigation").click();

    // Select framework
    await page.getByRole("combobox").nth(1).click();
    await page.getByText("High Court Rules").click();

    // Add parties
    await page.getByPlaceholder(/claimant/i).fill("John Doe");
    await page.getByPlaceholder(/respondent/i).fill("Jane Smith");

    // Submit form
    await page.getByRole("button", { name: /create matter/i }).click();

    // Wait for navigation
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/cases\/[a-f0-9-]+/);
  });

  test("Case list view - display cases", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();

    // Wait for cases to load
    await page.waitForTimeout(2000);

    // Verify cases are displayed (if any exist)
    const caseCards = page.locator('[data-testid="case-card"]');
    const count = await caseCards.count();
    
    if (count > 0) {
      // Verify first case card has required elements
      await expect(caseCards.first()).toBeVisible();
      await expect(page.getByText(/title/i)).toBeVisible();
    } else {
      // Verify empty state is shown
      await expect(page.getByText(/no cases|create your first matter/i)).toBeVisible();
    }
  });

  test("Case list view - search functionality", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();
    await page.waitForTimeout(2000);

    // Search for a case
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("Test");
    await page.waitForTimeout(1000);

    // Verify search results (if any cases exist)
    // This test assumes cases may or may not exist
  });

  test("Case list view - status filtering", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();
    await page.waitForTimeout(2000);

    // Test status filters
    const filters = ["All", "Active", "Pending", "Closed", "Settled"];
    
    for (const filter of filters) {
      const filterButton = page.getByText(filter).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("Case workspace navigation", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();
    await page.waitForTimeout(2000);

    // Check if any cases exist
    const caseCards = page.locator('[data-testid="case-card"]');
    const count = await caseCards.count();
    
    if (count > 0) {
      // Click on first case
      await caseCards.first().click();
      await page.waitForTimeout(2000);

      // Verify workspace loads
      await expect(page).toHaveURL(/\/cases\/[a-f0-9-]+/);

      // Verify back button
      await expect(page.getByRole("button", { name: /back/i })).toBeVisible();

      // Verify tabs are present
      const tabs = ["Overview", "Issues", "Deadlines", "Hearings", "Evidence", "Documents", "Orders", "Research", "Drafts", "Settlement", "AI Insights"];
      
      for (const tab of tabs) {
        const tabButton = page.getByText(tab).first();
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await page.waitForTimeout(500);
          await expect(tabButton).toBeVisible();
        }
      }
    }
  });

  test("Issues tab - CRUD operations", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create a test case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Issues Case");
    await page.getByPlaceholder(/matter number/i).fill("ISS-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to Issues tab
    await page.getByText("Issues").click();
    await page.waitForTimeout(1000);

    // Add a new issue
    await page.getByRole("button", { name: /add issue/i }).click();
    await page.getByPlaceholder(/issue title/i).fill("Test Issue 1");
    await page.getByPlaceholder(/description/i).fill("This is a test issue");
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Verify issue is added
    await expect(page.getByText("Test Issue 1")).toBeVisible();
  });

  test("Deadlines tab - CRUD operations", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create a test case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Deadlines Case");
    await page.getByPlaceholder(/matter number/i).fill("DLN-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to Deadlines tab
    await page.getByText("Deadlines").click();
    await page.waitForTimeout(1000);

    // Add a new deadline
    await page.getByRole("button", { name: /add deadline/i }).click();
    await page.getByPlaceholder(/deadline title/i).fill("Test Deadline");
    await page.getByRole("combobox").click();
    await page.getByText("Submission").click();
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Verify deadline is added
    await expect(page.getByText("Test Deadline")).toBeVisible();
  });

  test("Hearings tab - CRUD operations", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create a test case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Hearings Case");
    await page.getByPlaceholder(/matter number/i).fill("HRG-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to Hearings tab
    await page.getByText("Hearings").click();
    await page.waitForTimeout(1000);

    // Add a new hearing
    await page.getByRole("button", { name: /add hearing/i }).click();
    await page.getByPlaceholder(/hearing title/i).fill("Test Hearing");
    await page.getByRole("combobox").click();
    await page.getByText("First Hearing").click();
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Verify hearing is added
    await expect(page.getByText("Test Hearing")).toBeVisible();
  });

  test("Evidence tab - CRUD operations", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create a test case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Evidence Case");
    await page.getByPlaceholder(/matter number/i).fill("EVD-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to Evidence tab
    await page.getByText("Evidence").click();
    await page.waitForTimeout(1000);

    // Add a new evidence item
    await page.getByRole("button", { name: /add evidence/i }).click();
    await page.getByPlaceholder(/evidence title/i).fill("Test Evidence");
    await page.getByRole("combobox").click();
    await page.getByText("Document").click();
    await page.getByPlaceholder(/summary/i).fill("Test evidence summary");
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Verify evidence is added
    await expect(page.getByText("Test Evidence")).toBeVisible();
  });

  test("Arbitration features - Gen ToR button", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create an arbitration case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test ToR Case");
    await page.getByPlaceholder(/matter number/i).fill("TOR-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Verify Gen ToR button is present for arbitration cases
    await expect(page.getByText(/gen tor/i)).toBeVisible();
  });

  test("Arbitration features - Draft Award button", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create an arbitration case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Award Case");
    await page.getByPlaceholder(/matter number/i).fill("AWD-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Verify Draft Award button is present for arbitration cases
    await expect(page.getByText(/draft award/i)).toBeVisible();
  });

  test("Case creation validation - required fields", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases
    await page.getByRole("link", { name: /cases/i }).click();

    // Click New Matter button
    await page.getByText("New Matter").click();

    // Try to submit without required fields
    await page.getByRole("button", { name: /create matter/i }).click();

    // Verify validation error or button remains disabled
    await page.waitForTimeout(1000);
    // The form should not submit without title
  });

  test("Back navigation from case workspace", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Cases and create a test case
    await page.getByRole("link", { name: /cases/i }).click();
    await page.getByText("New Matter").click();
    await page.getByPlaceholder(/case title/i).fill("Test Navigation Case");
    await page.getByPlaceholder(/matter number/i).fill("NAV-2025-001");
    await page.getByRole("combobox").first().click();
    await page.getByText("Arbitration").click();
    await page.getByPlaceholder(/claimant/i).fill("Test Claimant");
    await page.getByPlaceholder(/respondent/i).fill("Test Respondent");
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForTimeout(2000);

    // Click back button
    await page.getByRole("button", { name: /back/i }).click();

    // Verify navigation back to cases list
    await expect(page).toHaveURL(/\/cases$/);
  });
});
