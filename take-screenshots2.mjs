import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

async function shot(route, filename, waitMs = 2000) {
  await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `./demo-${filename}.png` });
  console.log(`Screenshot: demo-${filename}.png`);
}

await shot('/assistant', 'ai-assistant');
await shot('/review', 'document-review');

await browser.close();
console.log('Done.');
