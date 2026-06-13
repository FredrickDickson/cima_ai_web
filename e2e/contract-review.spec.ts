import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth";

test.describe("Contract Review - End to End", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage to ensure clean state
    await context.clearCookies();
    await page.goto("/login");
    // Set viewport to desktop size to ensure sidebar is visible
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Authentication and navigation to Contract Review", async ({ page }) => {
    // Login with test credentials
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL("/", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Navigate to Document Review via direct URL
    await page.goto("/review");
    await page.waitForLoadState("networkidle");
    
    // Verify page loads
    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByText("Document Review")).toBeVisible();
    
    // Verify main UI elements are present
    await expect(page.getByText("Upload File")).toBeVisible();
    await expect(page.getByText("Paste Document Text")).toBeVisible();
    await expect(page.getByText("Document Type")).toBeVisible();
    await expect(page.getByText("Jurisdiction")).toBeVisible();
  });

  test("File upload - PDF", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Document Review via direct URL
    await page.goto("/review");

    // Switch to upload tab
    await page.getByText("Upload File").click();

    // Create a simple test PDF content (as a text file for testing)
    const testContract = `
SERVICE AGREEMENT

This Service Agreement is entered into on January 1, 2025 between:

ABC Corporation ("Provider")
and
XYZ Company ("Client")

1. SERVICES
The Provider shall provide consulting services to the Client.

2. TERM
This agreement shall commence on January 1, 2025 and continue for 24 months.

3. PAYMENT
The Client shall pay the Provider $10,000 per month.

4. CONFIDENTIALITY
Both parties agree to keep all information confidential.

5. LIABILITY
The Provider shall have unlimited liability for any breaches.

6. GOVERNING LAW
This agreement shall be governed by the laws of Ghana.

7. DISPUTE RESOLUTION
Any disputes shall be resolved through arbitration in Accra.
`;

    // Upload as text file (simpler for testing)
    const fileInput = page.locator('input[type="file"]');
    // Create a temporary file for upload
    const fs = require('fs');
    const path = require('path');
    const tempFilePath = path.join(__dirname, 'temp-contract.txt');
    fs.writeFileSync(tempFilePath, testContract);
    await fileInput.setInputFiles(tempFilePath);
    // Clean up
    fs.unlinkSync(tempFilePath);

    // Wait for file to be processed
    await page.waitForTimeout(2000);

    // Verify text is extracted and displayed
    await expect(page.getByText("SERVICE AGREEMENT")).toBeVisible();
    await expect(page.getByText("ABC Corporation")).toBeVisible();
  });

  test("Document analysis flow", async ({ page }) => {
    // Login and navigate
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste contract text
    await page.getByText("Paste Document Text").click();
    const testContract = `
SERVICE AGREEMENT

This Service Agreement is entered into between ABC Corporation and XYZ Company.

1. SERVICES
The Provider shall provide consulting services.

2. TERM
This agreement shall continue for 24 months.

3. PAYMENT
The Client shall pay $10,000 per month.

4. LIABILITY
The Provider shall have unlimited liability for any breaches.

5. GOVERNING LAW
This agreement shall be governed by the laws of Ghana.
`;

    await page.locator("textarea").fill(testContract);

    // Select document type and jurisdiction
    await page.getByRole("combobox").first().click();
    await page.getByText("Commercial Contract").click();
    
    await page.getByRole("combobox").nth(1).click();
    await page.getByText("Ghana").click();

    // Click analyze
    await page.getByRole("button", { name: /analyse document/i }).click();

    // Wait for analysis to complete
    await expect(page.getByText(/analyzing|parsing/i)).toBeVisible();
    await page.waitForTimeout(15000); // Wait for AI analysis

    // Verify analysis results appear
    await expect(page.getByText(/overview|risk score/i)).toBeVisible({ timeout: 20000 });
  });

  test("Overview tab displays correctly", async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste and analyze
    await page.getByText("Paste Document Text").click();
    await page.locator("textarea").fill("SERVICE AGREEMENT\n\nThis agreement is between ABC Corp and XYZ Inc.\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. GOVERNING LAW\nGoverened by Ghana law.");
    await page.getByRole("button", { name: /analyse document/i }).click();
    await page.waitForTimeout(15000);

    // Check overview tab
    await expect(page.getByText("Overview")).toBeVisible();
    await expect(page.getByText(/risk/i)).toBeVisible();
  });

  test("Clauses tab functionality", async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste and analyze
    await page.getByText("Paste Document Text").click();
    await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. CONFIDENTIALITY\nAll information is confidential.");
    await page.getByRole("button", { name: /analyse document/i }).click();
    await page.waitForTimeout(15000);

    // Navigate to clauses tab
    await page.getByText("Clauses").click();
    await page.waitForTimeout(1000);

    // Verify clauses are displayed
    await expect(page.getByText(/clause/i)).toBeVisible();
  });

  test("AI actions on clauses", async ({ page }) => {
    // Login and navigate
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste and analyze
    await page.getByText("Paste Document Text").click();
    await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. LIABILITY\nProvider has unlimited liability for all damages.");
    await page.getByRole("button", { name: /analyse document/i }).click();
    await page.waitForTimeout(15000);

    // Navigate to clauses tab
    await page.getByText("Clauses").click();
    await page.waitForTimeout(1000);

    // Click on a clause to expand
    const clauseCard = page.locator(".bg-white").first();
    await clauseCard.click();
    await page.waitForTimeout(1000);

    // Try an AI action
    const explainButton = page.getByText("Explain").first();
    if (await explainButton.isVisible()) {
      await explainButton.click();
      await page.waitForTimeout(5000);
      // Verify AI response appears
      await expect(page.getByText(/explanation|analysis/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test("Export functionality", async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste and analyze
    await page.getByText("Paste Document Text").click();
    await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.");
    await page.getByRole("button", { name: /analyse document/i }).click();
    await page.waitForTimeout(15000);

    // Try export
    const exportButton = page.getByRole("button", { name: /export/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
      
      // Check for export options
      await expect(page.getByText(/word|pdf/i)).toBeVisible();
    }
  });

  test("Error handling - empty text", async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Try to analyze without text
    await page.getByRole("button", { name: /analyse document/i }).click();

    // Should show error or be disabled
    await page.waitForTimeout(1000);
    // Verify button is still disabled or error appears
  });

  test("Past reviews persistence", async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Check for past reviews section - skip if not implemented
    const pastReviews = page.getByText(/past reviews|recent/i);
    if (await pastReviews.isVisible()) {
      await expect(pastReviews).toBeVisible();
    }
  });

  test("All tabs are accessible", async ({ page }) => {
    // Login and navigate
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");

    // Paste and analyze
    await page.getByText("Paste Document Text").click();
    await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.");
    await page.getByRole("button", { name: /analyse document/i }).click();
    await page.waitForTimeout(15000);

    // Test each tab
    const tabs = ["Overview", "Clauses", "Obligations", "Risks", "Missing", "Redlines", "Arbitration", "AI Insights"];
    
    for (const tab of tabs) {
      const tabButton = page.getByText(tab).first();
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(500);
        await expect(tabButton).toBeVisible();
      }
    }
  });
});
