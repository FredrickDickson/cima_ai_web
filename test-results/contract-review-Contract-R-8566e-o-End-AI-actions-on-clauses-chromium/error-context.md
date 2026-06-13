# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contract-review.spec.ts >> Contract Review - End to End >> AI actions on clauses
- Location: e2e\contract-review.spec.ts:197:3

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
  106 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  107 |     await page.getByRole("button", { name: /sign in/i }).click();
  108 |     await page.waitForTimeout(1000);
  109 |     await page.goto("/review");
  110 | 
  111 |     // Paste contract text
  112 |     await page.getByText("Paste Document Text").click();
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
> 206 |     await page.getByText("Paste Document Text").click();
      |                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  207 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. LIABILITY\nProvider has unlimited liability for all damages.");
  208 |     await page.getByRole("button", { name: /analyse document/i }).click();
  209 |     await page.waitForTimeout(15000);
  210 | 
  211 |     // Navigate to clauses tab
  212 |     await page.getByText("Clauses").click();
  213 |     await page.waitForTimeout(1000);
  214 | 
  215 |     // Click on a clause to expand
  216 |     const clauseCard = page.locator(".bg-white").first();
  217 |     await clauseCard.click();
  218 |     await page.waitForTimeout(1000);
  219 | 
  220 |     // Try an AI action
  221 |     const explainButton = page.getByText("Explain").first();
  222 |     if (await explainButton.isVisible()) {
  223 |       await explainButton.click();
  224 |       await page.waitForTimeout(5000);
  225 |       // Verify AI response appears
  226 |       await expect(page.getByText(/explanation|analysis/i)).toBeVisible({ timeout: 10000 });
  227 |     }
  228 |   });
  229 | 
  230 |   test("Export functionality", async ({ page }) => {
  231 |     // Login and navigate
  232 |     await page.goto("/login");
  233 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  234 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  235 |     await page.getByRole("button", { name: /sign in/i }).click();
  236 |     await page.waitForTimeout(1000);
  237 |     await page.goto("/review");
  238 | 
  239 |     // Paste and analyze
  240 |     await page.getByText("Paste Document Text").click();
  241 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.");
  242 |     await page.getByRole("button", { name: /analyse document/i }).click();
  243 |     await page.waitForTimeout(15000);
  244 | 
  245 |     // Try export
  246 |     const exportButton = page.getByRole("button", { name: /export/i });
  247 |     if (await exportButton.isVisible()) {
  248 |       await exportButton.click();
  249 |       await page.waitForTimeout(1000);
  250 |       
  251 |       // Check for export options
  252 |       await expect(page.getByText(/word|pdf/i)).toBeVisible();
  253 |     }
  254 |   });
  255 | 
  256 |   test("Error handling - empty text", async ({ page }) => {
  257 |     // Login and navigate
  258 |     await page.goto("/login");
  259 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  260 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  261 |     await page.getByRole("button", { name: /sign in/i }).click();
  262 |     await page.waitForTimeout(1000);
  263 |     await page.goto("/review");
  264 | 
  265 |     // Try to analyze without text
  266 |     await page.getByRole("button", { name: /analyse document/i }).click();
  267 | 
  268 |     // Should show error or be disabled
  269 |     await page.waitForTimeout(1000);
  270 |     // Verify button is still disabled or error appears
  271 |   });
  272 | 
  273 |   test("Past reviews persistence", async ({ page }) => {
  274 |     // Login and navigate
  275 |     await page.goto("/login");
  276 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  277 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  278 |     await page.getByRole("button", { name: /sign in/i }).click();
  279 |     await page.waitForTimeout(1000);
  280 |     await page.goto("/review");
  281 | 
  282 |     // Check for past reviews section - skip if not implemented
  283 |     const pastReviews = page.getByText(/past reviews|recent/i);
  284 |     if (await pastReviews.isVisible()) {
  285 |       await expect(pastReviews).toBeVisible();
  286 |     }
  287 |   });
  288 | 
  289 |   test("All tabs are accessible", async ({ page }) => {
  290 |     // Login and navigate
  291 |     await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
  292 |     await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  293 |     await page.getByRole("button", { name: /sign in/i }).click();
  294 |     await page.waitForTimeout(1000);
  295 |     await page.goto("/review");
  296 | 
  297 |     // Paste and analyze
  298 |     await page.getByText("Paste Document Text").click();
  299 |     await page.locator("textarea").fill("SERVICE AGREEMENT\n\n1. SERVICES\nProvider shall provide services.\n\n2. LIABILITY\nProvider has unlimited liability.");
  300 |     await page.getByRole("button", { name: /analyse document/i }).click();
  301 |     await page.waitForTimeout(15000);
  302 | 
  303 |     // Test each tab
  304 |     const tabs = ["Overview", "Clauses", "Obligations", "Risks", "Missing", "Redlines", "Arbitration", "AI Insights"];
  305 |     
  306 |     for (const tab of tabs) {
```