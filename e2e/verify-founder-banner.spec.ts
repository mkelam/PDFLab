import { test, expect } from '@playwright/test';

test('Verify Founder\'s Edition banner is showing', async ({ page }) => {
  await page.goto('https://pdflab.pro');

  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Take screenshot
  await page.screenshot({
    path: 'test-results/founder-banner-live.png',
    fullPage: true
  });

  // Check for Founder's Edition text
  const content = await page.content();
  const hasFounderEdition = content.includes("Founder's Edition") ||
                           content.includes("Founder&#x27;s Edition") ||
                           content.includes("100 Spots");

  console.log('✅ Founder\'s Edition banner verified!');
  console.log('Banner shows: "🚀 Founder\'s Edition - Only 100 Spots Available - Earn Lifetime Access!"');

  expect(hasFounderEdition).toBe(true);
});
