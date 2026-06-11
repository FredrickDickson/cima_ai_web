import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Go to app
  await page.goto('http://localhost:5173/');
  
  // Wait for login page
  await page.waitForSelector('input[type="email"]');
  console.log('At login page');
  
  // Login
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  console.log('Logged in successfully');
  
  // Click on Cases tab
  await page.click('a[href="/cases"]');
  console.log('Clicked Cases tab');
  
  // Wait a bit
  await page.waitForTimeout(2000);
  
  // Check URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  await browser.close();
})();
