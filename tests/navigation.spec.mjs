import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page, index = 0) {
  await page.goto(URL);
  await page.evaluate((idx) => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: idx, answers: {}, flags: {}, comments: {}, checked: {} });
  }, index);
}

test('[M2-01] 이전/다음 버튼으로 문항 사이를 이동한다', async ({ page }) => {
  await open(page, 0);
  const counter = page.locator('#abe-ItemOrdinalKnown');
  await expect(counter).toHaveText('문제 1 / 9');
  await expect(page.getByRole('button', { name: '이전 (P)' })).toHaveCount(0);

  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(counter).toHaveText('문제 2 / 9');
  await expect(page.getByRole('button', { name: '이전 (P)' })).toBeVisible();
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(1);

  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(counter).toHaveText('문제 3 / 9');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(2);

  await page.getByRole('button', { name: '이전 (P)' }).click();
  await expect(counter).toHaveText('문제 2 / 9');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(1);

  await page.getByRole('button', { name: '이전 (P)' }).click();
  await expect(counter).toHaveText('문제 1 / 9');
  await expect(page.getByRole('button', { name: '이전 (P)' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(0);
});

test('[M2-01] 마지막 문항에서 다음을 누르면 Review 화면으로 이동한다', async ({ page }) => {
  await open(page, 8);
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 9 / 9');
  await expect(page.getByRole('button', { name: '이전 (P)' })).toBeVisible();

  await page.getByRole('button', { name: '다음 (N)' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('review');
  await expect(page.getByRole('heading', { name: '검토', level: 3 })).toBeVisible();
  await expect(page.getByRole('button', { name: '지침 (R)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '검토 종료 (E)' })).toBeVisible();
  await expect(page.locator('#abe-itemCounter')).toBeHidden();
});
