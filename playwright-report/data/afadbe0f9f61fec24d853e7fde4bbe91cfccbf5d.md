# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contract-review.spec.ts >> Contract Review - End to End >> Clauses tab functionality
- Location: e2e\contract-review.spec.ts:170:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: /contract review/i })

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
        - textbox "you@lawfirm.com" [ref=e38]: test@example.com
      - generic [ref=e39]:
        - generic [ref=e40]: Password
        - generic [ref=e41]:
          - textbox "••••••••" [ref=e42]: password123
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
  77  | Any disputes shall be resolved through arbitration in Accra.
  78  | `;
  79  | 
  80  |     // Upload as text file (simpler for testing)
  81  |     const fileInput = page.locator('input[type="file"]');
  82  |     // Create a temporary file for upload
  83  |     const fs = require('fs');
  84  |     const path = require('path');
  85  |     const tempFilePath = path.join(__dirname, 'temp-contract.txt');
  86  |     fs.writeFileSync(tempFilePath, testContract);
  87  |     await fileInput.setInputFiles(tempFilePath);
  88  |     // Clean up
  89  |     fs.unlinkSync(tempFilePath);
  90  | 
  91  |     // Wait for file to be processed
  92  |     await page.waitForTimeout(2000);
  93  | 
  94  |     // Verify text is extracted and displayed
  95  |     await expect(page.getByText("SERVICE AGREEMENT")).toBeVisible();
  96  |     await expect(page.getByText("ABC Corporation")).toBeVisible();
  97  |   });
  98  | 
  99  |   test("Document analysis flow", async ({ page }) => {
  100 |     // Login and navigate
  101 |     await page.goto("/login");
  102 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  103 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  104 |     await page.getByRole("button", { name: /sign in/i }).click();
  105 |     await page.waitForTimeout(1000);
  106 |     await page.getByRole("link", { name: /contract review/i }).click();
  107 | 
  108 |     // Paste contract text
  109 |     await page.getByText("Paste Contract Text").click();
  110 |     const testContract = `
  111 | SERVICE AGREEMENT
  112 | 
  113 | This Service Agreement is entered into between ABC Corporation and XYZ Company.
  114 | 
  115 | 1. SERVICES
  116 | The Provider shall provide consulting services.
  117 | 
  118 | 2. TERM
  119 | This agreement shall continue for 24 months.
  120 | 
  121 | 3. PAYMENT
  122 | The Client shall pay $10,000 per month.
  123 | 
  124 | 4. LIABILITY
  125 | The Provider shall have unlimited liability for any breaches.
  126 | 
  127 | 5. GOVERNING LAW
  128 | This agreement shall be governed by the laws of Ghana.
  129 | `;
  130 | 
  131 |     await page.locator("textarea").fill(testContract);
  132 | 
  133 |     // Select document type and jurisdiction
  134 |     await page.getByRole("combobox").first().click();
  135 |     await page.getByText("Commercial Contract").click();
  136 |     
  137 |     await page.getByRole("combobox").nth(1).click();
  138 |     await page.getByText("Ghana").click();
  139 | 
  140 |     // Click analyze
  141 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  142 | 
  143 |     // Wait for analysis to complete
  144 |     await expect(page.getByText(/analyzing|parsing/i)).toBeVisible();
  145 |     await page.waitForTimeout(15000); // Wait for AI analysis
  146 | 
  147 |     // Verify analysis results appear
  148 |     await expect(page.getByText(/overview|risk score/i)).toBeVisible({ timeout: 20000 });
  149 |   });
  150 | 
  151 |   test("Overview tab displays correctly", async ({ page }) => {
  152 |     // Login and navigate
  153 |     await page.goto("/login");
  154 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  155 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  156 |     await page.getByRole("button", { name: /sign in/i }).click();
  157 |     await page.waitForTimeout(1000);
  158 |     await page.getByRole("link", { name: /contract review/i }).click();
  159 | 
  160 |     // Paste and analyze
  161 |     await page.getByText("Paste Contract Text").click();
  162 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\nThis agreement is between ABC Corp and XYZ Inc.\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. GOVERNING LAW\nGoverened by Ghana law.");
  163 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  164 |     await page.waitForTimeout(15000);
  165 | 
  166 |     // Check overview tab
  167 |     await expect(page.getByText("Overview")).toBeVisible();
  168 |     await expect(page.getByText(/risk/i)).toBeVisible();
  169 |   });
  170 | 
  171 |   test("Clauses tab functionality", async ({ page }) => {
  172 |     // Login and navigate
  173 |     await page.goto("/login");
  174 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  175 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  176 |     await page.getByRole("button", { name: /sign in/i }).click();
> 177 |     await page.waitForTimeout(1000);
      |                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  178 |     await page.getByRole("link", { name: /contract review/i }).click();
  179 | 
  180 |     // Paste and analyze
  181 |     await page.getByText("Paste Contract Text").click();
  182 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.\n\n3. CONFIDENTIALITY\nAll information is confidential.");
  183 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  184 |     await page.waitForTimeout(15000);
  185 | 
  186 |     // Navigate to clauses tab
  187 |     await page.getByText("Clauses").click();
  188 |     await page.waitForTimeout(1000);
  189 | 
  190 |     // Verify clauses are displayed
  191 |     await expect(page.getByText(/clause/i)).toBeVisible();
  192 |   });
  193 | 
  194 |   test("AI actions on clauses", async ({ page }) => {
  195 |     // Login and navigate
  196 |     await page.goto("/login");
  197 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  198 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  199 |     await page.getByRole("button", { name: /sign in/i }).click();
  200 |     await page.waitForTimeout(1000);
  201 |     await page.getByRole("link", { name: /contract review/i }).click();
  202 | 
  203 |     // Paste and analyze
  204 |     await page.getByText("Paste Contract Text").click();
  205 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. LIABILITY\nProvider has unlimited liability for all damages.");
  206 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  207 |     await page.waitForTimeout(15000);
  208 | 
  209 |     // Navigate to clauses tab
  210 |     await page.getByText("Clauses").click();
  211 |     await page.waitForTimeout(1000);
  212 | 
  213 |     // Click on a clause to expand
  214 |     const clauseCard = page.locator(".bg-white").first();
  215 |     await clauseCard.click();
  216 |     await page.waitForTimeout(1000);
  217 | 
  218 |     // Try an AI action
  219 |     const explainButton = page.getByText("Explain").first();
  220 |     if (await explainButton.isVisible()) {
  221 |       await explainButton.click();
  222 |       await page.waitForTimeout(5000);
  223 |       // Verify AI response appears
  224 |       await expect(page.getByText(/explanation|analysis/i)).toBeVisible({ timeout: 10000 });
  225 |     }
  226 |   });
  227 | 
  228 |   test("Export functionality", async ({ page }) => {
  229 |     // Login and navigate
  230 |     await page.goto("/login");
  231 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  232 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  233 |     await page.getByRole("button", { name: /sign in/i }).click();
  234 |     await page.waitForTimeout(1000);
  235 |     await page.getByRole("link", { name: /contract review/i }).click();
  236 | 
  237 |     // Paste and analyze
  238 |     await page.getByText("Paste Contract Text").click();
  239 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.");
  240 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  241 |     await page.waitForTimeout(15000);
  242 | 
  243 |     // Try export
  244 |     const exportButton = page.getByRole("button", { name: /export/i });
  245 |     if (await exportButton.isVisible()) {
  246 |       await exportButton.click();
  247 |       await page.waitForTimeout(1000);
  248 |       
  249 |       // Check for export options
  250 |       await expect(page.getByText(/word|pdf/i)).toBeVisible();
  251 |     }
  252 |   });
  253 | 
  254 |   test("Error handling - empty text", async ({ page }) => {
  255 |     // Login and navigate
  256 |     await page.goto("/login");
  257 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  258 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  259 |     await page.getByRole("button", { name: /sign in/i }).click();
  260 |     await page.waitForTimeout(1000);
  261 |     await page.getByRole("link", { name: /contract review/i }).click();
  262 | 
  263 |     // Try to analyze without text
  264 |     await page.getByRole("button", { name: /analyze contract/i }).click();
  265 | 
  266 |     // Should show error or be disabled
  267 |     await page.waitForTimeout(1000);
  268 |     // Verify button is still disabled or error appears
  269 |   });
  270 | 
  271 |   test("Past reviews persistence", async ({ page }) => {
  272 |     // Login and navigate
  273 |     await page.goto("/login");
  274 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  275 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  276 |     await page.getByRole("button", { name: /sign in/i }).click();
  277 |     await page.waitForTimeout(1000);
```