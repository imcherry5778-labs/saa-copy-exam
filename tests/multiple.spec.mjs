import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

test('[M1-06] multiple 문항은 select개를 넘겨도 선택이 허용되고 해제하면 제거된다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 1, answers: {}, flags: {}, comments: {}, checked: {} });
  });
  const boxes = page.locator('input[type="checkbox"]');
  expect(await boxes.count()).toBeGreaterThan(2);
  for (const i of [0, 1, 2]) await boxes.nth(i).check();
  expect(await page.evaluate(() => window.__exam.state.answers.q2)).toHaveLength(3);
  await boxes.nth(1).uncheck();
  expect(await page.evaluate(() => window.__exam.state.answers.q2)).toHaveLength(2);
});
