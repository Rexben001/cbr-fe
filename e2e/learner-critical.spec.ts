import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('register, open dashboard, and retain authenticated session', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Display name').fill('E2E Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard|\/$/);
  await page.reload();
  await expect(page.getByText(/Welcome back, E2E Learner/i)).toBeVisible();
});

test('login page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
});

test('admin content workflow is protected', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard|\/login/);
});
