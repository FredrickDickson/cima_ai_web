import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  
  await page.goto('http://localhost:5173/review');
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  fs.writeFileSync('page-content.html', html);
  console.log('Saved page-content.html');
  
  await browser.close();
})();
