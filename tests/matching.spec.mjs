import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page, index) {
  await page.goto(URL);
  await page.evaluate((i) => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: i, answers: {}, flags: {}, comments: {}, checked: {} });
  }, index);
}

test('[M1-08] matching 드롭다운 선택이 {promptId: choiceId}로 저장되고 같은 범주를 중복 선택할 수 있다', async ({ page }) => {
  await open(page, 5);
  const selects = page.locator('select[data-slot]');
  await expect(selects).toHaveCount(5);
  await selects.nth(0).selectOption('c2');
  await selects.nth(1).selectOption('c2');
  await selects.nth(2).selectOption('c1');
  const id = await page.evaluate(() => window.__exam.state.answers && Object.keys(window.__exam.state.answers)[0]);
  const get = () => page.evaluate((k) => window.__exam.state.answers[k], id);
  expect(await get()).toEqual({ p1: 'c2', p2: 'c2', p3: 'c1' });
  await expect(page.locator('.abe-slot .ui-selectmenu-text').nth(1)).toHaveText('기계 학습');
  await page.locator('select[data-slot]').nth(0).selectOption('');
  expect(await get()).toEqual({ p2: 'c2', p3: 'c1' });
});

test('[M1-08] prompt 라벨이 드롭다운 앞에 표시된다', async ({ page }) => {
  await open(page, 6);
  await expect(page.locator('.abe-slot')).toHaveCount(4);
  await expect(page.locator('.abe-slot').nth(0)).toContainText('분석용으로 매일 검색되는 애플리케이션 로그');
});
