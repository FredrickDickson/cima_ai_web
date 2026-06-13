# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contract-review.spec.ts >> Contract Review - End to End >> Document analysis flow
- Location: e2e\contract-review.spec.ts:103:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Paste Document Text')

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
      - generic [ref=e33]:
        - generic [ref=e34]: Email address
        - textbox "you@lawfirm.com" [ref=e35]
      - generic [ref=e36]:
        - generic [ref=e37]: Password
        - generic [ref=e38]:
          - textbox "••••••••" [ref=e39]
          - button [ref=e40] [cursor=pointer]:
            - img [ref=e41]
      - generic [ref=e44]:
        - checkbox "I agree to the Terms of Service and Privacy Policy" [ref=e45]
        - generic [ref=e46]:
          - text: I agree to the
          - link "Terms of Service" [ref=e47] [cursor=pointer]:
            - /url: /terms
          - text: and
          - link "Privacy Policy" [ref=e48] [cursor=pointer]:
            - /url: /privacy
      - button "Sign in" [ref=e49] [cursor=pointer]
    - paragraph [ref=e50]:
      - text: New to CIMA AI?
      - link "Create an account" [ref=e51] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  12  | 
  13  |   test("Authentication and navigation to Contract Review", async ({ page }) => {
  14  |     // Login with test credentials
  15  |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  16  |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  17  |     await page.getByRole("button", { name: /sign in/i }).click();
  18  | 
  19  |     // Wait for navigation to dashboard
  20  |     await page.waitForURL("/", { timeout: 15000 });
  21  |     await page.waitForTimeout(1000);
  22  | 
  23  |     // Navigate to Document Review via direct URL
  24  |     await page.goto("/review");
  25  |     await page.waitForLoadState("networkidle");
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
  105 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  106 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  107 |     await page.getByRole("button", { name: /sign in/i }).click();
  108 |     await page.waitForTimeout(1000);
  109 |     await page.goto("/review");
  110 | 
  111 |     // Paste contract text
> 112 |     await page.getByText("Paste Document Text").click();
      |                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  113 |     const testContract = `
  114 | SERVICE AGREEMENT
  115 | 
  116 | This Service Agreement is entered into between ABC Corporation and XYZ Company.
  117 | 
  118 | 1. SERVICES
  119 | The Provider shall provide consulting services.
  120 | 
  121 | 2. TERM
  122 | This agreement shall continue for 24 months.
  123 | 
  124 | 3. PAYMENT
  125 | The Client shall pay $10,000 per month.
  126 | 
  127 | 4. LIABILITY
  128 | The Provider shall have unlimited liability for any breaches.
  129 | 
  130 | 5. GOVERNING LAW
  131 | This agreement shall be governed by the laws of Ghana.
  132 | `;
  133 | 
  134 |     await page.locator("textarea").fill(testContract);
  135 | 
  136 |     // Select document type and jurisdiction
  137 |     await page.getByRole("combobox").first().click();
  138 |     await page.getByText("Commercial Contract").click();
  139 |     
  140 |     await page.getByRole("combobox").nth(1).click();
  141 |     await page.getByText("Ghana").click();
  142 | 
  143 |     // Click analyze
  144 |     await page.getByRole("button", { name: /analyse document/i }).click();
  145 | 
  146 |     // Wait for analysis to complete
  147 |     await expect(page.getByText(/analyzing|parsing/i)).toBeVisible();
  148 |     await page.waitForTimeout(15000); // Wait for AI analysis
  149 | 
  150 |     // Verify analysis results appear
  151 |     await expect(page.getByText(/overview|risk score/i)).toBeVisible({ timeout: 20000 });
  152 |   });
  153 | 
  154 |   test("Overview tab displays correctly", async ({ page }) => {
  155 |     // Login and navigate
  156 |     await page.goto("/login");
  157 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  158 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  159 |     await page.getByRole("button", { name: /sign in/i }).click();
  160 |     await page.waitForTimeout(1000);
  161 |     await page.goto("/review");
  162 | 
  163 |     // Paste and analyze
  164 |     await page.getByText("Paste Document Text").click();
  165 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\nThis agreement is between ABC Corp and XYZ Inc.\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. GOVERNING LAW\nGoverened by Ghana law.");
  166 |     await page.getByRole("button", { name: /analyse document/i }).click();
  167 |     await page.waitForTimeout(15000);
  168 | 
  169 |     // Check overview tab
  170 |     await expect(page.getByText("Overview")).toBeVisible();
  171 |     await expect(page.getByText(/risk/i)).toBeVisible();
  172 |   });
  173 | 
  174 |   test("Clauses tab functionality", async ({ page }) => {
  175 |     // Login and navigate
  176 |     await page.goto("/login");
  177 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  178 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  179 |     await page.getByRole("button", { name: /sign in/i }).click();
  180 |     await page.waitForTimeout(1000);
  181 |     await page.goto("/review");
  182 | 
  183 |     // Paste and analyze
  184 |     await page.getByText("Paste Document Text").click();
  185 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. CONFIDENTIALITY\nAll information is confidential.");
  186 |     await page.getByRole("button", { name: /analyse document/i }).click();
  187 |     await page.waitForTimeout(15000);
  188 | 
  189 |     // Navigate to clauses tab
  190 |     await page.getByText("Clauses").click();
  191 |     await page.waitForTimeout(1000);
  192 | 
  193 |     // Verify clauses are displayed
  194 |     await expect(page.getByText(/clause/i)).toBeVisible();
  195 |   });
  196 | 
  197 |   test("AI actions on clauses", async ({ page }) => {
  198 |     // Login and navigate
  199 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  200 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  201 |     await page.getByRole("button", { name: /sign in/i }).click();
  202 |     await page.waitForTimeout(1000);
  203 |     await page.goto("/review");
  204 | 
  205 |     // Paste and analyze
  206 |     await page.getByText("Paste Document Text").click();
  207 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. LIABILITY\nProvider has unlimited liability for all damages.");
  208 |     await page.getByRole("button", { name: /analyse document/i }).click();
  209 |     await page.waitForTimeout(15000);
  210 | 
  211 |     // Navigate to clauses tab
  212 |     await page.getByText("Clauses").click();
```