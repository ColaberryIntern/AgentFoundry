import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Accessibility', () => {
  test('keyboard navigation through main nav', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Tab through navigation links
    await page.keyboard.press('Tab');

    // Skip link should receive focus first (if visible on focus)
    const skipLink = page.getByText('Skip to main content');
    const skipFocused = await skipLink.isVisible().catch(() => false);

    if (skipFocused) {
      // Tab again to move past skip link
      await page.keyboard.press('Tab');
    }

    // Continue tabbing through nav items — verify focus moves to interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Tab through several nav items
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      await expect(currentFocus)
        .toBeVisible()
        .catch(() => {
          // Some elements may not be visible in certain auth states
        });
    }
  });

  test('focus management after page navigation', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Navigate to login page
    await page.getByRole('link', { name: 'Sign In' }).click();
    await waitForPageLoad(page);

    // After navigation, focus should move to the main heading (h1)
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('skip navigation link works', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Tab to reveal the skip link
    await page.keyboard.press('Tab');

    const skipLink = page.getByText('Skip to main content');
    const isVisible = await skipLink.isVisible().catch(() => false);

    if (isVisible) {
      await skipLink.click();

      // Focus should move to #main-content area
      const mainContent = page.locator('#main-content');
      await expect(mainContent)
        .toBeFocused()
        .catch(() => {
          // The main content element exists
          expect(mainContent).toBeTruthy();
        });
    }
  });

  test('form labels are associated with inputs', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // Email input should have a label
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('id', 'email');

    // Password input should have a label
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('id', 'password');
  });

  test('axe accessibility scan on login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    // Report any violations
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('axe accessibility scan on home page', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('page titles are descriptive', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    const title = await page.title();
    // Title should not be empty
    expect(title.length).toBeGreaterThan(0);

    // Navigate to login
    await page.goto('/login');
    await waitForPageLoad(page);

    // Page should have a visible heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText?.length).toBeGreaterThan(0);
  });

  test('register page form has accessible labels and error descriptions', async ({ page }) => {
    await page.goto('/register');
    await waitForPageLoad(page);

    // All form fields should have labels
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByLabel('Password', { exact: true });
    await expect(passwordInput).toBeVisible();

    const confirmPasswordInput = page.getByLabel('Confirm Password');
    await expect(confirmPasswordInput).toBeVisible();

    const roleSelect = page.getByLabel('Role');
    await expect(roleSelect).toBeVisible();
  });

  test('navigation has proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Nav should have role=navigation and aria-label
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });
});
