import { Page, expect } from '@playwright/test';

/**
 * Log in to the application via the login form.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await waitForPageLoad(page);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation away from login page
  await page.waitForURL(/(?!.*\/login).*/, { timeout: 10000 });
}

/**
 * Generate a unique test user with randomised email to avoid collisions.
 */
export function generateTestUser(): {
  email: string;
  password: string;
  role: 'c_suite' | 'compliance_officer' | 'it_admin';
} {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    email: `test-${id}@agentfoundry.test`,
    password: 'Test@1234!',
    role: 'compliance_officer',
  };
}

/**
 * Wait for the page to reach a stable, loaded state.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may not resolve when the dev server has open websockets — that is OK
  });
}

/**
 * Assert that a toast / notification message with the given text appears on the page.
 */
export async function expectToast(page: Page, message: string): Promise<void> {
  const toast = page.getByText(message);
  await expect(toast).toBeVisible({ timeout: 5000 });
}
