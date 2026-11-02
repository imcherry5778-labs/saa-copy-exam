import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

test('[M2-08] 시작 화면에서 시험 제목·문항 수·시간과 두 모드 라디오를 표시하고 시험 모드 선택 후 1번 문항으로 진입한다', async ({ page }) => {
  await page.goto(URL);

  // 초기 화면은 start 단계이며 타이머와 문항 카운터는 표시되지 않는다
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('start');
  await expect(page.locator('#abe-timer')).toHaveCount(0);
  await expect(page.locator('#abe-itemCounter')).toBeHidden();

  // 본문: 시험 제목, 문항 수, 시간 표시 확인
  const content = page.locator('#abe-startScreen');
  await expect(content).toContainText('AWS Demo Exam');
  await expect(content).toContainText('9문항');
  await expect(content).toContainText('30분');

  // 모드 라디오 2개 표시 확인 (기본값: 시험 모드)
  const examRadio = page.getByRole('radio', { name: '시험 모드 (30분, 타이머)' });
  const studyRadio = page.getByRole('radio', { name: '학습 모드 (타이머 없음, 문항별 정답 확인)' });
  await expect(examRadio).toBeChecked();
  await expect(studyRadio).not.toBeChecked();

  // 하단 바 오른쪽 다음 (N) 클릭 -> 시험 모드로 1번 문항 진입
  await page.getByRole('button', { name: '다음 (N)' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('item');
  expect(await page.evaluate(() => window.__exam.state.mode)).toBe('exam');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(0);
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');
  await expect(page.locator('#timeRemaining')).toBeVisible();
});

test('[M2-08] 시작 화면에서 학습 모드 선택 후 다음 (N)으로 1번 문항에 진입하면 타이머가 숨겨진다', async ({ page }) => {
  await page.goto(URL);

  const studyRadio = page.getByRole('radio', { name: '학습 모드 (타이머 없음, 문항별 정답 확인)' });
  await studyRadio.check();
  await expect(studyRadio).toBeChecked();

  await page.getByRole('button', { name: '다음 (N)' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('item');
  expect(await page.evaluate(() => window.__exam.state.mode)).toBe('study');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(0);
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');
  await expect(page.locator('#abe-timer')).toHaveCount(0);
});
