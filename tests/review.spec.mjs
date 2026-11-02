import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function openReview(page, extra = {}) {
  await page.goto(URL);
  await page.evaluate((s) => {
    window.__exam.load({ mode: 'exam', phase: 'review', answers: {}, flags: {}, comments: {}, checked: {}, ...s });
  }, extra);
}

test('[M2-02] Review 화면의 탭을 전환하면 목록과 상단 검토 버튼이 바뀐다', async ({ page }) => {
  await openReview(page, { answers: { q1: ['A'] }, flags: { q1: true } });

  const allTab = page.getByRole('tab', { name: /모두/ });
  const incTab = page.getByRole('tab', { name: /미완료/ });
  const flgTab = page.getByRole('tab', { name: /지정된 플래그/ });

  await expect(allTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '모두 검토 (A)' })).toBeVisible();
  await expect(page.locator('#AllTbodyContent tr')).toHaveCount(9);

  await incTab.click();
  await expect(incTab).toHaveAttribute('aria-selected', 'true');
  await expect(allTab).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('button', { name: '미완료된 질문 검토 (I)' })).toBeVisible();
  await expect(page.locator('#abe-reviewTable-Incomplete')).toBeVisible();
  await expect(page.locator('#abe-reviewTable-All')).toBeHidden();
  await expect(page.locator('#IncompleteTbodyContent tr')).toHaveCount(8);

  await flgTab.click();
  await expect(flgTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '플래그가 지정된 부분 검토 (V)' })).toBeVisible();
  await expect(page.locator('#abe-reviewTable-Flagged')).toBeVisible();
  await expect(page.locator('#abe-reviewTable-Incomplete')).toBeHidden();
  await expect(page.locator('#FlaggedTbodyContent tr')).toHaveCount(1);
});

test('[M2-02] 플래그가 0개면 지정된 플래그 탭을 숨긴다', async ({ page }) => {
  await openReview(page, { answers: { q1: ['A'] }, flags: {} });

  await expect(page.getByRole('tab', { name: /모두/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /미완료/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /지정된 플래그/ })).toHaveCount(0);
  await expect(page.locator('#tabFlagged')).toBeHidden();
});
