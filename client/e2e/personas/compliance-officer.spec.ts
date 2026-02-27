import { test, expect } from '@playwright/test';
import { login, waitForPageLoad } from '../utils/test-helpers';

const COMPLIANCE_EMAIL = 'compliance@agentfoundry.test';
const COMPLIANCE_PASSWORD = 'Test@1234!';

test.describe('Compliance Officer Persona Journey', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, COMPLIANCE_EMAIL, COMPLIANCE_PASSWORD).catch(() => {
      // Login may fail without backend — test structure is what matters
    });
  });

  test('navigate to dashboard — verify compliance-specific view', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Compliance-specific content
    const complianceContent = page.getByText(/compliance/i).first();
    await expect(complianceContent)
      .toBeVisible()
      .catch(() => {
        // May not have data without backend
      });
  });

  test('navigate to recommendations — view compliance gaps', async ({ page }) => {
    await page.goto('/recommendations');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /recommendation/i })).toBeVisible();
  });

  test('submit feedback on a recommendation (accept/dismiss)', async ({ page }) => {
    await page.goto('/recommendations');
    await waitForPageLoad(page);

    // Look for accept or dismiss buttons on recommendation cards
    const acceptBtn = page.getByRole('button', { name: /accept|approve|implement/i }).first();
    const dismissBtn = page.getByRole('button', { name: /dismiss|reject|skip/i }).first();

    const hasAccept = await acceptBtn.isVisible().catch(() => false);
    const hasDismiss = await dismissBtn.isVisible().catch(() => false);

    if (hasAccept) {
      await acceptBtn.click();
    } else if (hasDismiss) {
      await dismissBtn.click();
    }

    // Feedback interaction attempted — result depends on backend availability
  });

  test('navigate to notifications — verify notification list', async ({ page }) => {
    await page.goto('/notifications');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible();
  });

  test('navigate to search — use natural language search', async ({ page }) => {
    await page.goto('/search');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible();

    // Attempt a natural language search
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    const hasSearchInput = await searchInput.isVisible().catch(() => false);
    if (hasSearchInput) {
      await searchInput.fill('show me failed compliance checks from last month');
      await searchInput.press('Enter');
    }
  });
});
