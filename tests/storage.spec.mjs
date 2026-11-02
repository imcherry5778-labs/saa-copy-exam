import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';
const STORAGE_KEY = 'saa-mock:demo-fixture';

test('[M2-10] 상태 변경 및 5초 타이머마다 localStorage에 자동 저장되고 새로고침 후 이어하기 예 (Y)로 복구된다', async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);

  // 시작 화면 초기에는 저장된 값이 없고 대화상자도 없다
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // 다음 (N)으로 시험 시작 -> 즉시 저장
  await page.getByRole('button', { name: '다음 (N)' }).click();
  let saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved).toMatchObject({
    mode: 'exam',
    index: 0,
    answers: {},
    flags: {},
    comments: {},
    checked: {},
    remainingSec: 1800,
    phase: 'item',
  });
  expect(typeof saved.startedAt).toBe('number');

  // 1번 문항 응답 선택, 플래그 지정, 설명 저장 후 2번 문항으로 이동
  await page.locator('input[id="q1.R.D"]').check();
  await page.getByRole('button', { name: /플래그/ }).click();
  await page.getByRole('button', { name: /^설명/ }).click();
  await page.locator('#abe-commentTxt').fill('이어하기 메모');
  await page.getByRole('button', { name: '저장 (S)' }).click();
  await page.getByRole('button', { name: '다음 (N)' }).click();

  saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved).toMatchObject({
    mode: 'exam',
    index: 1,
    answers: { q1: ['D'] },
    flags: { q1: true },
    comments: { q1: '이어하기 메모' },
    checked: {},
    remainingSec: 1800,
    phase: 'item',
  });

  // 타이머는 5초마다 저장한다 (3초 경과 시 미갱신, 5초 경과 시 갱신)
  await page.clock.runFor(3000);
  await expect(page.locator('#timeRemaining')).toHaveText('29:57');
  saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved.remainingSec).toBe(1800);

  await page.clock.runFor(2000);
  await expect(page.locator('#timeRemaining')).toHaveText('29:55');
  saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved.remainingSec).toBe(1795);

  // 새로고침 후 경고 아이콘이 있는 이어하기 대화상자 표시 확인
  await page.reload();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.abe-WarningImage.alert-dialog')).toBeVisible();
  await expect(dialog).toContainText('진행 중인 시험이 있습니다. 이어서 진행하시겠습니까?');
  await expect(dialog.getByRole('button', { name: '예 (Y)' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '아니오 (N)' })).toBeVisible();

  // 예 (Y) 클릭 시 저장된 상태(2번 문항, 남은 시간, 답안, 플래그, 설명)로 복구
  await dialog.getByRole('button', { name: '예 (Y)' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('item');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(1);
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 2 / 9');
  await expect(page.locator('#timeRemaining')).toHaveText('29:55');

  // 이전 (P)으로 1번 문항에 돌아가 답안·플래그·설명 복구 확인
  await page.getByRole('button', { name: '이전 (P)' }).click();
  await expect(page.locator('input[id="q1.R.D"]')).toBeChecked();
  await expect(page.locator('#abe-FlagForReviewItemButton')).toHaveClass(/abe-FlagForReviewItemButtonSelected/);
  expect(await page.evaluate(() => window.__exam.state.comments.q1)).toBe('이어하기 메모');
});

test('[M2-10] 새로고침 후 이어하기 대화상자에서 아니오 (N)를 고르면 저장을 지우고 처음부터 시작한다', async ({ page }) => {
  await page.goto(URL);

  await page.getByRole('button', { name: '다음 (N)' }).click();
  await page.locator('input[id="q1.R.D"]').check();
  await page.getByRole('button', { name: /플래그/ }).click();
  await page.getByRole('button', { name: '다음 (N)' }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).not.toBeNull();

  // 새로고침 후 이어하기 대화상자에서 아니오 (N) 선택
  await page.reload();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('진행 중인 시험이 있습니다. 이어서 진행하시겠습니까?');
  await dialog.getByRole('button', { name: '아니오 (N)' }).click();

  // 저장이 삭제되고 시작 화면에 초기 상태로 남는다
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('start');

  // 시작 화면에서 다음 (N)을 누르면 1번 문항부터 깨끗한 상태로 시작한다
  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');
  await expect(page.locator('input[id="q1.R.D"]')).not.toBeChecked();
  await expect(page.locator('#abe-FlagForReviewItemButton')).toHaveClass(/abe-FlagForReviewItemButtonUnselected/);
});

test('[M2-10] 결과를 확정하면 phase를 result로 저장하고 이어하기 예 (Y)로 결과 화면에 복귀한다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'review',
      index: 8,
      remainingSec: 1200,
      answers: { q1: ['D'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });

  // 검토 종료 2단계 확인으로 결과 확정
  await page.getByRole('button', { name: '검토 종료 (E)' }).click();
  await page.getByRole('button', { name: '예 (Y)' }).click();
  await page.getByRole('button', { name: '예 (Y)' }).click();
  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();

  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved.phase).toBe('result');

  // 새로고침 후 이어하기 예 (Y) 클릭 시 결과 화면으로 복귀
  await page.reload();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('진행 중인 시험이 있습니다. 이어서 진행하시겠습니까?');
  await dialog.getByRole('button', { name: '예 (Y)' }).click();

  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('result');
  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();
  await expect(page.locator('#abe-resultCorrect')).toHaveText('1 / 9');
});
