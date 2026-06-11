import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`FAILED REQUEST [${response.status()}]: ${response.url()}`);
      response.text().then(text => console.log(`RESPONSE BODY:`, text)).catch(e => console.log('Could not read response body'));
    }
  });
  
  // Go to app
  await page.goto('http://localhost:5173/register');
  
  // Wait for signup page
  await page.waitForSelector('input[type="email"]');
  console.log('At register page');
  
  const uniqueEmail = `test_${Date.now()}@example.com`;
  
  // Register
  await page.fill('input[type="text"]', 'Test User'); // full name
  await page.fill('input[type="email"]', uniqueEmail);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  try {
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    console.log('Logged in successfully');
  } catch (e) {
    console.log('Timeout waiting for Dashboard');
  }
  
  await browser.close();
})();
