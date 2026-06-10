import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

async function shot(route, filename, waitMs = 3000) {
  await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `./screenshots/${filename}.png` });
  console.log(`✅ ${filename}.png`);
}

// Dashboard
await shot('/', 'dashboard');
// Research
await shot('/research', 'research');
// Cases list
await shot('/cases', 'cases');
// Documents
await shot('/documents', 'documents');
// Drafting Studio
await shot('/drafting', 'drafting');
// Document Review
await shot('/review', 'document-review');
// AI Assistant
await shot('/assistant', 'ai-assistant');
// Login page
await shot('/login', 'login');

await browser.close();
console.log('\nDone! Check ./screenshots/');
