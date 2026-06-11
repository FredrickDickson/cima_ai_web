import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  
  await page.goto('http://localhost:5173/review');
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  // Try to click the menu button
  try {
    const menuButton = page.locator('button[aria-label="Open navigation"]').first();
    const isVisible = await menuButton.isVisible();
    console.log('Menu button visible:', isVisible);
    
    // Check what element is actually at the coordinates of the menu button
    const box = await menuButton.boundingBox();
    if (box) {
      console.log('Menu button box:', box);
      // Wait for it to be clickable
      await menuButton.click({ timeout: 2000 });
      console.log('Successfully clicked menu button!');
    } else {
      console.log('Could not get bounding box for menu button');
    }
  } catch (error) {
    console.error('Failed to click menu button:', error.message);
  }
  
  await browser.close();
})();
