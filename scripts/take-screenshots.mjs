/**
 * Takes full-page screenshots of every page in the CIMA AI app.
 * Requires the dev server to be running on http://localhost:5173
 *
 * Usage: node scripts/take-screenshots.mjs
 */

import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, "../screenshots");
const BASE_URL = "http://localhost:5173";
const EMAIL = "fredrickdickson026@gmail.com";
const PASSWORD = "BGFZ3850";

// All pages to screenshot after login
const PAGES = [
  { name: "dashboard",       path: "/",           waitFor: ".flex-1" },
  { name: "cases",           path: "/cases",      waitFor: ".flex-1" },
  { name: "documents",       path: "/documents",  waitFor: ".flex-1" },
  { name: "ai-assistant",    path: "/assistant",  waitFor: ".flex-1" },
  { name: "drafting",        path: "/drafting",   waitFor: ".flex-1" },
  { name: "document-review", path: "/review",     waitFor: ".flex-1" },
  { name: "research",        path: "/research",   waitFor: ".flex-1" },
  { name: "profile",         path: "/profile",    waitFor: ".flex-1" },
  { name: "admin",           path: "/admin",      waitFor: ".flex-1" },
];

// Public pages (no login needed)
const PUBLIC_PAGES = [
  { name: "login",    path: "/login",    waitFor: "form" },
  { name: "register", path: "/register", waitFor: "form" },
  { name: "terms",    path: "/terms",    waitFor: "main, .flex-1, body" },
  { name: "privacy",  path: "/privacy",  waitFor: "main, .flex-1, body" },
];

async function main() {
  console.log("📸 CIMA AI Screenshot Tool\n");

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });
  const page = await context.newPage();

  // ── PUBLIC PAGES ──────────────────────────────────────────────────────────
  console.log("📄 Public pages...\n");
  for (const pg of PUBLIC_PAGES) {
    try {
      console.log(`  → ${pg.name}`);
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForSelector(pg.waitFor, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
      const file = path.join(SCREENSHOTS_DIR, `${pg.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`     ✅ ${pg.name}.png`);
    } catch (err) {
      console.error(`     ❌ ${pg.name}: ${err.message}`);
    }
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  console.log("\n🔐 Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[placeholder="you@lawfirm.com"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  // Tick the Terms of Service checkbox if present
  const tosCheckbox = page.locator('input[type="checkbox"]').first();
  const tosVisible = await tosCheckbox.isVisible().catch(() => false);
  if (tosVisible) await tosCheckbox.check();
  await page.click('button:has-text("Sign in")');

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.href.includes("/login"), { timeout: 20000 });
  await page.waitForTimeout(2000); // let the app settle
  console.log("  ✅ Logged in\n");

  // ── AUTHENTICATED PAGES ───────────────────────────────────────────────────
  console.log("📄 Authenticated pages...\n");
  for (const pg of PAGES) {
    try {
      console.log(`  → ${pg.name}`);
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForSelector(pg.waitFor, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200); // let async data load

      const file = path.join(SCREENSHOTS_DIR, `${pg.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`     ✅ ${pg.name}.png`);
    } catch (err) {
      console.error(`     ❌ ${pg.name}: ${err.message}`);
    }
  }

  // ── MOBILE VIEWS ──────────────────────────────────────────────────────────
  console.log("\n📱 Mobile views (375px)...\n");
  await context.close();
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
  });
  const mobilePage = await mobileCtx.newPage();

  // Re-login on mobile context
  await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await mobilePage.waitForSelector('input[type="email"]', { timeout: 8000 });
  await mobilePage.fill('input[placeholder="you@lawfirm.com"]', EMAIL);
  await mobilePage.fill('input[type="password"]', PASSWORD);
  const mobileToS = mobilePage.locator('input[type="checkbox"]').first();
  const mobileToSVisible = await mobileToS.isVisible().catch(() => false);
  if (mobileToSVisible) await mobileToS.check();
  await mobilePage.click('button:has-text("Sign in")');
  await mobilePage.waitForURL((url) => !url.href.includes("/login"), { timeout: 20000 });
  await mobilePage.waitForTimeout(2000);

  const MOBILE_PAGES = [
    { name: "mobile-dashboard",       path: "/" },
    { name: "mobile-cases",           path: "/cases" },
    { name: "mobile-documents",       path: "/documents" },
    { name: "mobile-ai-assistant",    path: "/assistant" },
    { name: "mobile-drafting",        path: "/drafting" },
    { name: "mobile-document-review", path: "/review" },
    { name: "mobile-research",        path: "/research" },
    { name: "mobile-profile",         path: "/profile" },
  ];

  for (const pg of MOBILE_PAGES) {
    try {
      console.log(`  → ${pg.name}`);
      await mobilePage.goto(`${BASE_URL}${pg.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await mobilePage.waitForTimeout(1200);
      const file = path.join(SCREENSHOTS_DIR, `${pg.name}.png`);
      await mobilePage.screenshot({ path: file, fullPage: true });
      console.log(`     ✅ ${pg.name}.png`);
    } catch (err) {
      console.error(`     ❌ ${pg.name}: ${err.message}`);
    }
  }

  await mobileCtx.close();
  await browser.close();

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith(".png"));
  console.log(`\n✅ Done — ${files.length} screenshots saved to screenshots/`);
  files.forEach((f) => console.log(`   ${f}`));
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
