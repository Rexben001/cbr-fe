import { expect, test } from '@playwright/test';

test('admin can open content lists and report moderation', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.getByRole('link', { name: 'Lessons' }).click();
  await expect(page.getByRole('heading', { name: /Lessons/i })).toBeVisible();
  await page.getByRole('link', { name: 'Question reports' }).click();
  await expect(page.getByRole('heading', { name: 'Question reports' })).toBeVisible();
});
