import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Agent Foundry')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign In')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('404 page for unknown route', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page.getByText('404')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
