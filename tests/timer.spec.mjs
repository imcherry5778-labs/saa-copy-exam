import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

test('[M2-07] 시험 모드에서 타이머가 매초 감소하고 0이 되면 바로 결과 화면으로 이동한다', async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'item',
      index: 0,
      remainingSec: 3,
      answers: { q1: ['D'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });

  const time = page.locator('#timeRemaining');
  await expect(time).toHaveText('00:03');

  // 1초 경과 -> 00:02
  await page.clock.runFor(1000);
  await expect(time).toHaveText('00:02');
  await expect(page.locator('#accessibleTimerText')).toContainText('남은 시간 0 분, 2 초');

  // 1초 경과 -> 00:01
  await page.clock.runFor(1000);
  await expect(time).toHaveText('00:01');

  // 1초 경과 -> 0이 되어 바로 결과 화면으로 전환
  await page.clock.runFor(1000);
  const phase = await page.evaluate(() => window.__exam.state.phase);
  expect(phase).toBe('result');
  await expect(page.locator('#abe-resultScreen')).toBeVisible();
});

test('[M2-07] Review 화면이나 대화상자가 열린 상태에서도 시간이 종료되면 바로 결과 화면으로 이동한다', async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'review',
      remainingSec: 2,
      answers: {},
      flags: {},
      comments: {},
      checked: {},
    });
  });

  // 지침 대화상자를 열어 둔다
  await page.getByRole('button', { name: '지침 (R)' }).click();
  await expect(page.getByRole('dialog', { name: '지침' })).toBeVisible();

  await page.clock.runFor(1000);
  await expect(page.locator('#timeRemaining')).toHaveText('00:01');

  await page.clock.runFor(1000);
  const phase = await page.evaluate(() => window.__exam.state.phase);
  expect(phase).toBe('result');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#abe-resultScreen')).toBeVisible();
});
