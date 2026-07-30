import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:5173";
const EMAIL = "e2e-test@cima.dev";
const PASSWORD = "TestPassword123!";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("you@lawfirm.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  const tos = page.locator('input[type="checkbox"]');
  if (await tos.count()) await tos.check();
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30000 });

  await page.goto(`${BASE}/documents`);
  await page.waitForSelector("text=Documents", { timeout: 15000 });

  await page.getByRole("button", { name: /upload document|new document/i }).first().click();
  await page.waitForTimeout(300);
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtest.pdf"));
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^add document$/i }).click();
  await page.getByText("Add Document", { exact: true }).waitFor({ state: "hidden", timeout: 20000 });
  await page.getByText("fixtest.pdf", { exact: true }).first().click();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /^analysis$/i }).click();
  await page.waitForTimeout(300);

  console.log("Clicking Extract Issues...");
  await page.getByRole("button", { name: /extract issues/i }).click();
  await page.waitForSelector("button:has-text('Extract Issues'):not([disabled])", { timeout: 60000 });
  await page.waitForTimeout(500);
  let body = await page.locator("body").innerText();
  let idx = body.indexOf("LEGAL ISSUES");
  console.log("Issues result:", body.slice(idx, idx + 250).replace(/\n+/g, " "));
  console.log("Contains 'Failed to extract':", body.includes("Failed to extract issues"));

  console.log("\nClicking Obligations...");
  await page.getByRole("button", { name: /^obligations$/i }).click();
  await page.waitForSelector("button:has-text('Obligations'):not([disabled])", { timeout: 60000 });
  await page.waitForTimeout(500);
  body = await page.locator("body").innerText();
  idx = body.indexOf("OBLIGATIONS");
  console.log("Obligations result:", body.slice(idx, idx + 250).replace(/\n+/g, " "));
  console.log("Contains 'Failed to extract obligations':", body.includes("Failed to extract obligations"));

  console.log("\nClicking Generate Summary...");
  await page.getByRole("button", { name: /generate summary/i }).click();
  await page.waitForTimeout(15000);
  await page.getByRole("button", { name: /^summary$/i }).click();
  body = await page.locator("body").innerText();
  console.log("Has real AI Summary content:", body.includes("AI Summary"));

  console.log("\nDONE");
} catch (err) {
  console.error("SCRIPT ERROR:", err);
} finally {
  await browser.close();
}
