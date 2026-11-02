import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

test('[M3-01] 학습 모드에서 타이머가 숨겨지고 문항 카운터와 플래그 앞 정답 확인 (K) 버튼이 표시된다', async ({ page }) => {
  await page.goto(URL);

  // 시험 모드에서는 타이머가 보이고 정답 확인 (K) 버튼이 없다
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });
  await expect(page.locator('#abe-timer')).toBeVisible();
  await expect(page.locator('#abe-checkAnswerButton')).toHaveCount(0);

  // 학습 모드에서는 타이머 영역을 숨기고 문항 카운터는 유지한다
  await page.evaluate(() => {
    window.__exam.load({ mode: 'study', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });
  await expect(page.locator('#abe-timer')).toHaveCount(0);
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');

  // 툴바 오른쪽(#abe-toolbar-flags)에서 플래그 버튼 앞에 정답 확인 (K) 버튼(#abe-checkAnswerButton)이 위치한다
  const checkBtn = page.getByRole('button', { name: '정답 확인 (K)' });
  await expect(checkBtn).toBeVisible();
  await expect(checkBtn).toHaveAttribute('id', 'abe-checkAnswerButton');
  await expect(checkBtn).toBeDisabled();

  const orderAndSprite = await page.evaluate(() => {
    const flagsDiv = document.getElementById('abe-toolbar-flags');
    const ids = Array.from(flagsDiv.querySelectorAll('button')).map((b) => b.id);
    const btn = document.getElementById('abe-checkAnswerButton');
    const cs = getComputedStyle(btn);
    return {
      ids,
      bgPos: cs.backgroundPosition,
      hasBgImg: cs.backgroundImage.includes('data:image/png'),
    };
  });
  expect(orderAndSprite.ids[0]).toBe('abe-checkAnswerButton');
  expect(orderAndSprite.ids[1]).toBe('abe-FlagForReviewItemButton');
  expect(orderAndSprite.hasBgImg).toBe(true);
  expect(orderAndSprite.bgPos).toBe('0% -170px');
});

test('[M3-01] 정답 확인 (K) 버튼은 문항이 완료 상태일 때만 활성화되고 누르면 해설 창이 뜨며 응답이 잠긴다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'study', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });

  const checkBtn = page.getByRole('button', { name: '정답 확인 (K)' });

  // 1) single 문항(q1): 미선택 시 비활성화 -> 1개 선택 시 활성화 -> 클릭 시 해설 창 열림 및 라디오 잠금
  await expect(checkBtn).toBeDisabled();
  await page.locator('input[id="q1.R.D"]').check();
  await expect(checkBtn).toBeEnabled();

  await checkBtn.click();
  const expDialog = page.locator('#abe-explanation-dialog');
  await expect(expDialog).toBeVisible();
  await expect(expDialog.locator('#abe-exp-title')).toContainText('해설');
  expect(await page.evaluate(() => window.__exam.state.checked.q1)).toBe(true);

  // q1의 모든 라디오 보기가 disabled 상태여야 한다
  const q1Radios = page.locator('input[name="response-q1"]');
  expect(await q1Radios.count()).toBe(4);
  for (let i = 0; i < 4; i++) {
    await expect(q1Radios.nth(i)).toBeDisabled();
  }
  await page.locator('#abe-exp-close').click();
  await expect(expDialog).toHaveCount(0);

  // 2) multiple 문항(q2, select=2): 1개 선택 시 비활성화 -> 2개 선택 시 활성화 -> 3개 초과 선택 시 비활성화
  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(checkBtn).toBeDisabled();
  await page.locator('input[id="q2.R.A"]').check();
  await expect(checkBtn).toBeDisabled();
  await page.locator('input[id="q2.R.B"]').check();
  await expect(checkBtn).toBeEnabled();
  await page.locator('input[id="q2.R.C"]').check();
  await expect(checkBtn).toBeDisabled();
  await page.locator('input[id="q2.R.C"]').uncheck();
  await expect(checkBtn).toBeEnabled();

  // Alt+K 단축키로 정답 확인 실행 -> 해설 창 열림 및 체크박스 잠금
  await page.keyboard.press('Alt+k');
  await expect(expDialog).toBeVisible();
  expect(await page.evaluate(() => window.__exam.state.checked.q2)).toBe(true);
  const q2Boxes = page.locator('input[name="response-q2"]');
  for (let i = 0; i < await q2Boxes.count(); i++) {
    await expect(q2Boxes.nth(i)).toBeDisabled();
  }

  // 3) ordering 문항(q4, index 3)과 matching 문항(q6, index 5)에서도 완료 시 활성화 및 확인 후 드롭다운 잠금
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 3,
      answers: { q1: ['D'], q2: ['A', 'B'] },
      flags: {},
      comments: {},
      checked: { q1: true, q2: true },
    });
  });
  const selects = page.locator('select.abe-drop_down');
  await expect(checkBtn).toBeDisabled();
  await selects.nth(0).selectOption('c1');
  await selects.nth(1).selectOption('c2');
  await expect(checkBtn).toBeDisabled();
  await selects.nth(2).selectOption('c3');
  await expect(checkBtn).toBeEnabled();

  await checkBtn.click();
  await expect(expDialog).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await expect(selects.nth(i)).toBeDisabled();
  }

  // 4) 이전 문항(q1)으로 돌아가도 이미 정답 확인한 문항의 응답은 계속 잠겨 있다
  await page.getByRole('button', { name: '이전 (P)' }).click(); // q3 (미확인 문항)
  await expect(page.locator('input[name="response-q3"]').first()).toBeEnabled();
  await page.getByRole('button', { name: '이전 (P)' }).click(); // q2 (확인된 문항)
  await expect(page.locator('input[name="response-q2"]').first()).toBeDisabled();
});

test('[M3-01] 학습 모드에서 마지막 문항 → Review → 검토 종료 → 결과 화면 흐름이 시험 모드와 동일하게 동작한다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 8,
      answers: { q1: ['D'] },
      flags: {},
      comments: {},
      checked: { q1: true },
    });
  });

  // 마지막 문항에서 다음 (N) 클릭 -> Review 화면
  await page.getByRole('button', { name: '다음 (N)' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('review');
  await expect(page.locator('#abe-timer')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /모두/ })).toBeVisible();

  // 검토 종료 (E) -> 2단계 예 (Y) 확인 -> 결과 화면
  await page.getByRole('button', { name: '검토 종료 (E)' }).click();
  await page.getByRole('button', { name: '예 (Y)' }).click();
  await page.getByRole('button', { name: '예 (Y)' }).click();

  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('result');
  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();
  await expect(page.locator('#abe-resultCorrect')).toHaveText('1 / 9');
  await expect(page.locator('#abe-resultElapsed')).toHaveCount(0);
});
