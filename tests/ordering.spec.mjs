import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page, index) {
  await page.goto(URL);
  await page.evaluate((i) => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: i, answers: {}, flags: {}, comments: {}, checked: {} });
  }, index);
}

test('[M1-07] ordering 드롭다운 선택이 슬롯 순서대로 상태에 저장된다', async ({ page }) => {
  await open(page, 3);
  const selects = page.locator('select[data-slot]');
  await expect(selects).toHaveCount(3);
  await selects.nth(1).selectOption('c2');
  await selects.nth(0).selectOption('c1');
  expect(await page.evaluate(() => window.__exam.state.answers.q4)).toEqual(['c1', 'c2', null]);
  await expect(page.locator('.abe-slot .ui-selectmenu-text').nth(1)).toContainText('암호화된 스냅샷의 복제본');
  await page.locator('select[data-slot]').nth(0).selectOption('');
  expect(await page.evaluate(() => window.__exam.state.answers.q4)).toEqual([null, 'c2', null]);
});

test('[M1-07] 라벨이 right인 문항은 드롭다운 뒤에 라벨이 오고 라벨 없는 슬롯도 렌더링된다', async ({ page }) => {
  await open(page, 4);
  await expect(page.locator('.abe-slot')).toHaveCount(3);
  await expect(page.locator('.abe-slot').nth(0)).toContainText('가장 큰 범위');
  await expect(page.locator('.abe-slot').nth(1)).not.toContainText('범위');
  await expect(page.locator('.abe-slot').nth(2)).toContainText('가장 작은 범위');
});
