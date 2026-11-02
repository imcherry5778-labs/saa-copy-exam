import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page, index) {
  await page.goto(URL);
  await page.evaluate((i) => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: i, answers: {}, flags: {}, comments: {}, checked: {} });
  }, index);
}

test('[M1-10] English 버튼으로 영어 팝업이 열리고 닫기 X로 닫힌다', async ({ page }) => {
  await open(page, 0);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button').filter({ hasText: 'English' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Which AWS service or feature will meet these requirements?');
  await expect(dialog).toContainText('A. Amazon GuardDuty');
  await dialog.locator('#abe-eng-close').click();
  await expect(dialog).toHaveCount(0);
});

test('[M1-10] 다른 문항으로 이동하면 팝업이 닫힌다', async ({ page }) => {
  await open(page, 0);
  await page.getByRole('button').filter({ hasText: 'English' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#abe-NextButton').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
