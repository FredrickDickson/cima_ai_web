# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation >> navigates to AI Assistant
- Location: e2e\navigation.spec.ts:20:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder('you@lawfirm.com')

```

# Page snapshot

```yaml
- paragraph [ref=e4]: Loading CIMA AI...
```

# Test source

```ts
  1  | import { Page } from "@playwright/test";
  2  | 
  3  | const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@cima.dev";
  4  | const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";
  5  | 
  6  | export async function loginAsTestUser(page: Page) {
  7  |   await page.goto("/login");
> 8  |   await page.getByPlaceholder("you@lawfirm.com").fill(TEST_EMAIL);
     |                                                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  9  |   await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  10 |   await page.getByRole("button", { name: /sign in/i }).click();
  11 |   // Wait for navigation away from login page
  12 |   await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15000 });
  13 | }
  14 | 
  15 | export { TEST_EMAIL, TEST_PASSWORD };
  16 | 
```