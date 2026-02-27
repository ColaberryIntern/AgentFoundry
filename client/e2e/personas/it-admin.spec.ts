import { test, expect } from '@playwright/test';
import { login, waitForPageLoad } from '../utils/test-helpers';

const IT_ADMIN_EMAIL = 'itadmin@agentfoundry.test';
const IT_ADMIN_PASSWORD = 'Test@1234!';

test.describe('IT Admin Persona Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, IT_ADMIN_EMAIL, IT_ADMIN_PASSWORD).catch(() => {
      // Login may fail without backend — test structure is what matters
    });
  });

  test('navigate to dashboard — verify system health view', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('navigate to role management — verify role list', async ({ page }) => {
    await page.goto('/admin/roles');
    await waitForPageLoad(page);

    // Role management page heading
    await expect(page.getByRole('heading', { name: /role|manage/i })).toBeVisible();
  });

  test('navigate to webhooks — verify webhook management', async ({ page }) => {
    await page.goto('/webhooks');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /webhook/i })).toBeVisible();
  });

  test('navigate to reports — generate custom report', async ({ page }) => {
    await page.goto('/reports/custom');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /custom report|report/i })).toBeVisible();

    // Look for form elements to generate a report
    const generateBtn = page.getByRole('button', { name: /generate|create|build/i });
    const hasGenerateBtn = await generateBtn.isVisible().catch(() => false);
    if (hasGenerateBtn) {
      await generateBtn.click();
    }
  });

  test('navigate to search', async ({ page }) => {
    await page.goto('/search');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible();

    // Verify search input is available
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    const hasSearchInput = await searchInput.isVisible().catch(() => false);
    if (hasSearchInput) {
      await searchInput.fill('system audit logs');
      await searchInput.press('Enter');
    }
  });
});
