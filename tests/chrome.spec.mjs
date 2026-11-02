import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
    window.__exam.setRemaining(29 * 60 + 58);
  });
}

test('[M1-04] 타이머를 클릭하면 숫자가 숨겨지고 다시 클릭하면 표시된다', async ({ page }) => {
  await open(page);
  const time = page.locator('#timeRemaining');
  await expect(time).toBeVisible();
  await expect(time).toHaveText('29:58');
  await page.getByRole('button', { name: /타이머 숨기기/ }).click();
  await expect(time).toBeHidden();
  // 아이콘은 남아 있다
  await expect(page.locator('#abe-timerPlaceholder')).toBeVisible();
  await page.locator('#abe-TimeRemainingSectionButton').click();
  await expect(time).toBeVisible();
});

test('[M1-04] 문제 카운터를 클릭하면 숨겨지고 다시 클릭하면 표시된다', async ({ page }) => {
  await open(page);
  const counter = page.locator('#abe-ItemOrdinalKnown');
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText('문제 1 / 9');
  await page.getByRole('button', { name: /화면 카운터 화면 숨기기/ }).click();
  await expect(counter).toBeHidden();
  await page.locator('#abe-ItemOrdinalKnownButton').click();
  await expect(counter).toBeVisible();
});

test('[M1-04] 첫 문항에는 이전 버튼이 없고 다음 버튼이 있다', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('button', { name: '이전 (P)' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음 (N)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '설명 (M)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '검토용으로 플래그 지정 (F)' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(4);
});
