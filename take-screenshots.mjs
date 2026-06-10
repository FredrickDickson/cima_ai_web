import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Helper to screenshot a route
async function shot(route, filename, waitMs = 2000) {
  await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
  await page.keyboard.press('Escape'); // dismiss any error overlays
  await page.waitForTimeout(500);
  await page.screenshot({ path: `./demo-${filename}.png` });
  console.log(`Screenshot: demo-${filename}.png`);
}

await shot('/', 'landing');
await shot('/login', 'login');
await shot('/dashboard', 'dashboard');
await shot('/research', 'research');
await shot('/drafting', 'drafting');
await shot('/documents', 'documents');
await shot('/cases', 'cases');
await shot('/ai-assistant', 'ai-assistant');

await browser.close();
console.log('All done.');
