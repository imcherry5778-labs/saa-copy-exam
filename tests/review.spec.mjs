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

test('[M2-03] 5유형(single, multiple, ordering, matching, caseStudy) 완료/미완료 경계값과 미완료 수가 정확히 계산된다', async ({ page }) => {
  const statusOf = (num) => page.locator('#AllTbodyContent tr').nth(num - 1).locator('.abe-reviewItemStatus');
  const incCount = page.locator('#IncompleteCount');

  // 1) 초기 무응답: 9문항 모두 미완료
  await openReview(page, { answers: {} });
  await expect(incCount).toHaveText('9');
  for (let i = 1; i <= 9; i++) {
    await expect(statusOf(i)).toHaveText(/^\s*미완료\s*$/);
  }

  // 2) 미완료 경계값:
  // - q1(single): 빈 배열 [] -> 미완료
  // - q2(multiple, select=2): 1개 선택(부족) -> 미완료
  // - q3(single): 1개 선택 -> 완료
  // - q4(ordering, 3슬롯): 2슬롯만 선택 ['c1', null, 'c6'] -> 미완료
  // - q5(ordering, 3슬롯): 길이 부족 ['c2', 'c1'] -> 미완료
  // - q6(matching, 5프롬프트): 4개만 선택 -> 미완료
  // - q7(matching, 4프롬프트): 빈 값 포함 { p1: 'c2', p2: 'c1', p3: 'c1', p4: '' } -> 미완료
  // - q8(caseStudy + multiple, select=2): 3개 초과 선택 ['A', 'B', 'C'] -> 미완료
  // - q9(caseStudy + single): 미응답 -> 미완료
  await openReview(page, {
    answers: {
      q1: [],
      q2: ['A'],
      q3: ['C'],
      q4: ['c1', null, 'c6'],
      q5: ['c2', 'c1'],
      q6: { p1: 'c2', p2: 'c1', p3: 'c2', p4: 'c2' },
      q7: { p1: 'c2', p2: 'c1', p3: 'c1', p4: '' },
      q8: ['A', 'B', 'C'],
    },
  });
  await expect(incCount).toHaveText('8');
  await expect(statusOf(1)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(2)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(3)).toHaveText(/^\s*완료\s*$/);
  await expect(statusOf(4)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(5)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(6)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(7)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(8)).toHaveText(/^\s*미완료\s*$/);
  await expect(statusOf(9)).toHaveText(/^\s*미완료\s*$/);

  // 3) 5유형 모두 정확히 완료 조건을 만족할 때 (caseStudy 내 문항별 독립 판정 확인 포함)
  // 먼저 q8만 완료(2개 선택)하고 q9는 비워 두어 caseStudy 문항이 개별 판정되는지 확인
  await openReview(page, {
    answers: {
      q1: ['D'],
      q2: ['A', 'B'],
      q3: ['C'],
      q4: ['c1', 'c2', 'c6'],
      q5: ['c2', 'c1', 'c3'],
      q6: { p1: 'c2', p2: 'c1', p3: 'c2', p4: 'c2', p5: 'c1' },
      q7: { p1: 'c2', p2: 'c1', p3: 'c1', p4: 'c2' },
      q8: ['A', 'C'],
    },
  });
  await expect(incCount).toHaveText('1');
  for (let i = 1; i <= 8; i++) {
    await expect(statusOf(i)).toHaveText(/^\s*완료\s*$/);
  }
  await expect(statusOf(9)).toHaveText(/^\s*미완료\s*$/);

  // q9까지 완료하면 미완료 0개, 미완료 탭에는 "레코드가 없습니다." 행이 표시됨
  await openReview(page, {
    answers: {
      q1: ['D'],
      q2: ['A', 'B'],
      q3: ['C'],
      q4: ['c1', 'c2', 'c6'],
      q5: ['c2', 'c1', 'c3'],
      q6: { p1: 'c2', p2: 'c1', p3: 'c2', p4: 'c2', p5: 'c1' },
      q7: { p1: 'c2', p2: 'c1', p3: 'c1', p4: 'c2' },
      q8: ['A', 'C'],
      q9: ['B'],
    },
  });
  await expect(incCount).toHaveText('0');
  for (let i = 1; i <= 9; i++) {
    await expect(statusOf(i)).toHaveText(/^\s*완료\s*$/);
  }
  await page.getByRole('tab', { name: /미완료/ }).click();
  await expect(page.locator('#IncompleteTbodyContent')).toContainText('레코드를 찾을 수 없습니다.');
});

test('[M2-04] 검토 버튼으로 해당 문항으로 이동하고 검토 화면 (S)로 복귀하며 모두 검토 (A)로 1번부터 차례로 본다', async ({ page }) => {
  await openReview(page, { answers: { q1: ['A'] }, flags: { q1: true } });

  // 1) 특정 문항(4번)의 검토 버튼 클릭 -> 4번 문항으로 이동, 하단에 검토 화면 (S) 표시
  await page.getByRole('button', { name: /Review Question 4/ }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 4 / 9');
  const revScreenBtn = page.getByRole('button', { name: '검토 화면 (S)' });
  await expect(revScreenBtn).toBeVisible();

  // 2) 검토 화면 (S) 클릭 -> Review 화면으로 복귀
  await revScreenBtn.click();
  await expect(page.locator('.abe-reviewScreen-2-0')).toBeVisible();

  // 3) 모두 검토 (A) 클릭 -> 1번 문항부터 차례로 이동, 마지막 문항 다음에서 Review 복귀
  await page.getByRole('button', { name: '모두 검토 (A)' }).click();
  for (let i = 1; i <= 9; i++) {
    await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText(`문제 ${i} / 9`);
    await expect(page.getByRole('button', { name: '검토 화면 (S)' })).toBeVisible();
    await page.getByRole('button', { name: '다음 (N)' }).click();
  }
  await expect(page.locator('.abe-reviewScreen-2-0')).toBeVisible();
});


