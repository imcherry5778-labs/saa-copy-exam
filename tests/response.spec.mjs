import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });
}

test('[M1-05] 응답을 선택하면 상태에 저장되고 이동 후에도 유지된다', async ({ page }) => {
  await open(page);
  await page.locator('input[id="q1.R.B"]').check();
  expect(await page.evaluate(() => window.__exam.state.answers.q1)).toEqual(['B']);
  await page.locator('input[id="q1.R.C"]').check();
  expect(await page.evaluate(() => window.__exam.state.answers.q1)).toEqual(['C']);
  await page.getByRole('button', { name: /^다음/ }).click();
  await page.getByRole('button', { name: /^이전/ }).click();
  await expect(page.locator('input[id="q1.R.C"]')).toBeChecked();
});

test('[M1-05] 플래그 버튼이 토글된다', async ({ page }) => {
  await open(page);
  const flag = page.locator('#abe-FlagForReviewItemButton');
  await expect(flag).toHaveClass(/ButtonUnselected/);
  await flag.click();
  await expect(flag).toHaveClass(/ButtonSelected/);
  expect(await page.evaluate(() => window.__exam.state.flags.q1)).toBe(true);
  await flag.click();
  await expect(flag).toHaveClass(/ButtonUnselected/);
});
