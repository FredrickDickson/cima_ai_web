# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contract-review.spec.ts >> Contract Review - End to End >> Authentication and navigation to Contract Review
- Location: e2e\contract-review.spec.ts:14:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e11]: CIMA AI
    - generic [ref=e12]:
      - blockquote [ref=e13]: "\"AI-native legal intelligence for the modern arbitration practitioner.\""
      - generic [ref=e14]:
        - generic [ref=e17]: Legal research in seconds, not hours
        - generic [ref=e20]: AI-powered contract review and risk analysis
        - generic [ref=e23]: Integrated arbitration case management
        - generic [ref=e26]: CIMA AI with legal domain expertise
    - paragraph [ref=e27]: Supporting Ghana ADR Act 2010 · ICC · UNCITRAL · LCIA · New York Convention
  - generic [ref=e29]:
    - heading "Welcome back" [level=2] [ref=e30]
    - paragraph [ref=e31]: Sign in to your legal workspace
    - generic [ref=e32]:
      - img [ref=e33]
      - text: Invalid login credentials
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: Email address
        - textbox "you@lawfirm.com" [ref=e38]: e2e-test@cima.dev
      - generic [ref=e39]:
        - generic [ref=e40]: Password
        - generic [ref=e41]:
          - textbox "••••••••" [ref=e42]: TestPassword123!
          - button [ref=e43] [cursor=pointer]:
            - img [ref=e44]
      - button "Sign in" [ref=e47] [cursor=pointer]
    - paragraph [ref=e48]:
      - text: New to CIMA AI?
      - link "Create an account" [ref=e49] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { loginAsTestUser, TEST_EMAIL, TEST_PASSWORD } from "./helpers/auth";
  3   | 
  4   | test.describe("Contract Review - End to End", () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Set viewport to desktop size to ensure sidebar is visible
  7   |     await page.setViewportSize({ width: 1280, height: 720 });
  8   |     // Clear any existing state by going to review page first (will redirect to login if not auth)
  9   |     await page.goto("/review");
  10  |     // Navigate to login page
  11  |     await page.goto("/login");
  12  |   });
  13  | 
  14  |   test("Authentication and navigation to Contract Review", async ({ page }) => {
  15  |     // Login with test credentials
  16  |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  17  |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  18  |     await page.getByRole("button", { name: /sign in/i }).click();
  19  | 
  20  |     // Wait for navigation to dashboard
> 21  |     await page.waitForURL("/", { timeout: 15000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  22  |     await page.waitForTimeout(1000);
  23  | 
  24  |     // Navigate to Document Review via direct URL
  25  |     await page.goto("/review");
  26  |     
  27  |     // Verify page loads
  28  |     await expect(page).toHaveURL(/\/review/);
  29  |     await expect(page.getByText("Document Review")).toBeVisible();
  30  |     
  31  |     // Verify main UI elements are present
  32  |     await expect(page.getByText("Upload File")).toBeVisible();
  33  |     await expect(page.getByText("Paste Document Text")).toBeVisible();
  34  |     await expect(page.getByText("Document Type")).toBeVisible();
  35  |     await expect(page.getByText("Jurisdiction")).toBeVisible();
  36  |   });
  37  | 
  38  |   test("File upload - PDF", async ({ page }) => {
  39  |     // Login first
  40  |     await page.goto("/login");
  41  |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  42  |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  43  |     await page.getByRole("button", { name: /sign in/i }).click();
  44  |     await page.waitForTimeout(1000);
  45  | 
  46  |     // Navigate to Document Review via direct URL
  47  |     await page.goto("/review");
  48  | 
  49  |     // Switch to upload tab
  50  |     await page.getByText("Upload File").click();
  51  | 
  52  |     // Create a simple test PDF content (as a text file for testing)
  53  |     const testContract = `
  54  | SERVICE AGREEMENT
  55  | 
  56  | This Service Agreement is entered into on January 1, 2025 between:
  57  | 
  58  | ABC Corporation ("Provider")
  59  | and
  60  | XYZ Company ("Client")
  61  | 
  62  | 1. SERVICES
  63  | The Provider shall provide consulting services to the Client.
  64  | 
  65  | 2. TERM
  66  | This agreement shall commence on January 1, 2025 and continue for 24 months.
  67  | 
  68  | 3. PAYMENT
  69  | The Client shall pay the Provider $10,000 per month.
  70  | 
  71  | 4. CONFIDENTIALITY
  72  | Both parties agree to keep all information confidential.
  73  | 
  74  | 5. LIABILITY
  75  | The Provider shall have unlimited liability for any breaches.
  76  | 
  77  | 6. GOVERNING LAW
  78  | This agreement shall be governed by the laws of Ghana.
  79  | 
  80  | 7. DISPUTE RESOLUTION
  81  | Any disputes shall be resolved through arbitration in Accra.
  82  | `;
  83  | 
  84  |     // Upload as text file (simpler for testing)
  85  |     const fileInput = page.locator('input[type="file"]');
  86  |     // Create a temporary file for upload
  87  |     const fs = require('fs');
  88  |     const path = require('path');
  89  |     const tempFilePath = path.join(__dirname, 'temp-contract.txt');
  90  |     fs.writeFileSync(tempFilePath, testContract);
  91  |     await fileInput.setInputFiles(tempFilePath);
  92  |     // Clean up
  93  |     fs.unlinkSync(tempFilePath);
  94  | 
  95  |     // Wait for file to be processed
  96  |     await page.waitForTimeout(2000);
  97  | 
  98  |     // Verify text is extracted and displayed
  99  |     await expect(page.getByText("SERVICE AGREEMENT")).toBeVisible();
  100 |     await expect(page.getByText("ABC Corporation")).toBeVisible();
  101 |   });
  102 | 
  103 |   test("Document analysis flow", async ({ page }) => {
  104 |     // Login and navigate
  105 |     await page.goto("/login");
  106 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  107 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  108 |     await page.getByRole("button", { name: /sign in/i }).click();
  109 |     await page.waitForTimeout(1000);
  110 |     await page.goto("/review");
  111 | 
  112 |     // Paste contract text
  113 |     await page.getByText("Paste Document Text").click();
  114 |     const testContract = `
  115 | SERVICE AGREEMENT
  116 | 
  117 | This Service Agreement is entered into between ABC Corporation and XYZ Company.
  118 | 
  119 | 1. SERVICES
  120 | The Provider shall provide consulting services.
  121 | 
```