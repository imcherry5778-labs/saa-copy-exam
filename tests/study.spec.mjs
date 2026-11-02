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

test('[M3-02] 해설 창이 5가지 문항 유형(single, multiple, ordering, matching, caseStudy) 모두에서 정답·내 답·해설을 정확히 표시한다', async ({ page }) => {
  await page.goto(URL);

  // 1) single (q1): 오답 선택 시 '오답입니다', 정답 D, 내 답 A, 한국어 해설 표시
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 0,
      answers: { q1: ['A'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  const dialog = page.locator('#abe-explanation-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#abe-exp-title')).toHaveText('해설');
  await expect(dialog.locator('#abe-exp-result')).toHaveText('오답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toHaveText('D. AWS Network Firewall');
  await expect(dialog.locator('#abe-exp-user')).toHaveText('A. Amazon GuardDuty');
  await expect(dialog.locator('#abe-exp-ko')).toContainText('AWS Network Firewall은 도메인/URL 필터링과 침입 방지(IPS) 규칙으로');

  // 2) multiple (q2): 정답 선택(역순 ['B', 'A'] 입력도 정렬 표기) 시 '정답입니다', 정답 A/B, 내 답 A/B 표시
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 1,
      answers: { q2: ['B', 'A'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('#abe-exp-result')).toHaveText('정답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('A. 비즈니스 속도 향상');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('B. 법적 난제 감소');
  await expect(dialog.locator('#abe-exp-user')).toContainText('A. 비즈니스 속도 향상');
  await expect(dialog.locator('#abe-exp-user')).toContainText('B. 법적 난제 감소');
  await expect(dialog.locator('#abe-exp-ko')).toContainText('Marketplace는 조달 절차를 간소화해');

  // 3) ordering (q4: 슬롯 라벨 있음, q5: null 라벨 슬롯 포함): 슬롯별 정답·내 답 나열
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 3,
      answers: { q4: ['c1', 'c2', 'c5'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('#abe-exp-result')).toHaveText('오답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('단계 1: 기존 DB 인스턴스의 스냅샷을 생성한다.');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('단계 2: 암호화된 스냅샷의 복제본을 생성한다.');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('단계 3: 암호화된 스냅샷에서 DB 인스턴스를 복원한다.');
  await expect(dialog.locator('#abe-exp-user')).toContainText('단계 3: 암호화된 읽기 전용 복제본에서 DB 인스턴스를 복원한다.');

  // q5 (label이 null인 2번째 슬롯은 '슬롯 2'로 표기)
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 4,
      answers: { q5: ['c2', 'c1', 'c3'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('#abe-exp-result')).toHaveText('정답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('가장 큰 범위: AWS 리전');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('슬롯 2: 가용 영역');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('가장 작은 범위: 서브넷');

  // 4) matching (q6): prompt별로 정답과 내 답을 나열
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 5,
      answers: {
        q6: { p1: 'c1', p2: 'c1', p3: 'c2', p4: 'c2', p5: 'c1' },
      },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('#abe-exp-result')).toHaveText('오답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('Amazon Forecast: 기계 학습');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('AWS Glue: 분석');
  await expect(dialog.locator('#abe-exp-user')).toContainText('Amazon Forecast: 분석');
  await expect(dialog.locator('#abe-exp-ko')).toContainText('Glue(ETL)와 QuickSight(BI)는 분석');

  // 5) caseStudy (q8 multiple, q9 single): 사례 연구 문항에서도 정답·내 답·해설 표시
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 7,
      answers: { q8: ['A', 'C'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('#abe-exp-result')).toHaveText('정답입니다');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('A. 여러 가용 영역에서 Amazon EC2 인스턴스의 자동 스케일링 그룹을 구성한다.');
  await expect(dialog.locator('#abe-exp-correct')).toContainText('C. Amazon EC2 인스턴스에 대한 로드 밸런싱을 구현한다.');
  await expect(dialog.locator('#abe-exp-ko')).toContainText('다중 AZ Auto Scaling 그룹과 로드 밸런서를 함께 쓰면');
});

test('[M3-02] 해설 창에서 AI 해설·정답 논란 배지와 English 해설 토글 및 닫기 버튼이 동작한다', async ({ page }) => {
  const sampleUrl = 'file://' + resolve('dist/sample.html') + '?test=1';
  await page.goto(sampleUrl);

  // sample.json의 s6(index 5)은 explanationSource: "ai" 및 disputed: true를 모두 가진다
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 5,
      answers: { s6: ['B'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();

  const dialog = page.locator('#abe-explanation-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.abe-exp-badge-ai')).toHaveText('AI 해설');
  await expect(dialog.locator('.abe-exp-badge-disputed')).toHaveText('정답 논란');

  // English 토글로 영어 해설 펼침/접힘 확인
  const enToggle = dialog.locator('#abe-exp-en-toggle');
  await expect(enToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog.locator('#abe-exp-en')).toHaveCount(0);

  await enToggle.click();
  await expect(dialog.locator('#abe-exp-en-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(dialog.locator('#abe-exp-en')).toBeVisible();
  await expect(dialog.locator('#abe-exp-en')).toContainText('CloudFront caches content at edge locations');

  await dialog.locator('#abe-exp-en-toggle').click();
  await expect(dialog.locator('#abe-exp-en-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog.locator('#abe-exp-en')).toHaveCount(0);

  // explanationSource가 "dump"이고 disputed가 없으면 두 배지 모두 표시되지 않는다
  await page.evaluate(() => {
    window.__EXAM__.items[0].explanationSource = 'dump';
    delete window.__EXAM__.items[0].disputed;
    window.__exam.load({
      mode: 'study',
      phase: 'item',
      index: 0,
      answers: { s1: ['B'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await page.getByRole('button', { name: '정답 확인 (K)' }).click();
  await expect(dialog.locator('.abe-exp-badge-ai')).toHaveCount(0);
  await expect(dialog.locator('.abe-exp-badge-disputed')).toHaveCount(0);

  // 닫기 X 버튼(#abe-exp-close)으로 닫힘
  await dialog.locator('#abe-exp-close').click();
  await expect(dialog).toHaveCount(0);
});
