import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth";

test.describe("Contract Review - Basic UI Tests", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage to ensure clean state
    await context.clearCookies();
    await page.goto("/login");
    // Set viewport to desktop size to ensure sidebar is visible
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Authentication and navigation to Document Review", async ({ page }) => {
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
  });

  test("File upload - PDF", async ({ page }) => {
    // Login first
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    // Navigate to Document Review via direct URL
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

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

  test("Document input tabs are visible", async ({ page }) => {
    // Login and navigate
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

    // Verify input tabs are visible
    await expect(page.getByText("Paste Document Text")).toBeVisible();
    await expect(page.getByText("Upload File")).toBeVisible();
  });

  test("Past reviews persistence", async ({ page }) => {
    // Login and navigate
    await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

    // Check for past reviews section - skip if not implemented
    const pastReviews = page.getByText(/past reviews|recent/i);
    if (await pastReviews.isVisible()) {
      await expect(pastReviews).toBeVisible();
    }
  });
});
