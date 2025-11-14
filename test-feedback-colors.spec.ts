import { test, expect } from '@playwright/test';

test('check feedback button colors', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3001');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Find and click the feedback bubble
  const feedbackBubble = page.locator('button[aria-label="Send Feedback"]');
  await expect(feedbackBubble).toBeVisible();

  // Take screenshot of feedback bubble
  await feedbackBubble.screenshot({ path: 'feedback-bubble.png' });

  // Click to open feedback modal
  await feedbackBubble.click();

  // Wait for modal to be visible
  await page.waitForSelector('text=Send Feedback', { timeout: 5000 });

  // Find the submit button
  const submitButton = page.locator('button:has-text("Send Feedback")').last();
  await expect(submitButton).toBeVisible();

  // Get computed styles of the submit button
  const backgroundColor = await submitButton.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });

  const color = await submitButton.evaluate((el) => {
    return window.getComputedStyle(el).color;
  });

  console.log('Submit Button Background Color:', backgroundColor);
  console.log('Submit Button Text Color:', color);

  // Take screenshot of the feedback modal
  await page.screenshot({ path: 'feedback-modal.png' });

  // Check main app button for comparison
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Find a button on the main page (Beta Apply button)
  const mainButton = page.locator('button:has-text("Apply")').first();
  if (await mainButton.isVisible()) {
    const mainBg = await mainButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const mainColor = await mainButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log('Main App Button Background Color:', mainBg);
    console.log('Main App Button Text Color:', mainColor);
  }
});
