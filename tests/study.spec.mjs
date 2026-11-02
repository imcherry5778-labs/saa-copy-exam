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

test('[M3-03] 오답 해설(채점 후 검토) 화면에서 모두·잘못된·지정된 플래그 탭과 정답/잘못된 상태 알약이 동작한다', async ({ page }) => {
  await page.goto(URL);
  // q1(정답 D), q2(정답 A,B), q3(오답 A 선택), 나머지 미응답 -> 정답 2개, 잘못된 7개, 플래그 2개(q1, q3)
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'answerReview',
      answers: {
        q1: ['D'],
        q2: ['A', 'B'],
        q3: ['A'],
      },
      flags: { q1: true, q3: true },
      comments: {},
      checked: {},
    });
  });

  const allTab = page.getByRole('tab', { name: /모두/ });
  const incTab = page.getByRole('tab', { name: /잘못된/ });
  const flgTab = page.getByRole('tab', { name: /지정된 플래그/ });

  await expect(allTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#AllCount')).toHaveText('9');
  await expect(page.locator('#IncorrectCount')).toHaveText('7');
  await expect(page.locator('#FlaggedCount')).toHaveText('2');
  await expect(page.getByRole('button', { name: '모두 검토 (A)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 화면' })).toBeVisible();

  // 상태 알약: q1·q2는 '정답' 초록, q3~q9는 '잘못된' 빨강
  const allRows = page.locator('#AllTbodyContent tr');
  await expect(allRows).toHaveCount(9);
  for (let i = 0; i < 9; i++) {
    const status = allRows.nth(i).locator('.abe-reviewItemStatus');
    if (i === 0 || i === 1) {
      await expect(status).toHaveText(/^\s*정답\s*$/);
      await expect(status).toHaveClass(/abe-reviewCompleteLabel/);
    } else {
      await expect(status).toHaveText(/^\s*잘못된\s*$/);
      await expect(status).toHaveClass(/abe-reviewIncompleteLabel/);
    }
  }

  // '잘못된 ( 7 )' 탭 클릭 -> 틀린 7문항만 표시, 상단 버튼은 '틀린 질문 검토 (I)'
  await incTab.click();
  await expect(incTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '틀린 질문 검토 (I)' })).toBeVisible();
  await expect(page.locator('#abe-reviewTable-Incorrect')).toBeVisible();
  await expect(page.locator('#abe-reviewTable-All')).toBeHidden();
  await expect(page.locator('#IncorrectTbodyContent tr')).toHaveCount(7);

  // '지정된 플래그 ( 2 )' 탭 클릭 -> 플래그 지정된 2문항만 표시
  await flgTab.click();
  await expect(flgTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '플래그가 지정된 부분 검토 (V)' })).toBeVisible();
  await expect(page.locator('#abe-reviewTable-Flagged')).toBeVisible();
  await expect(page.locator('#FlaggedTbodyContent tr')).toHaveCount(2);

  // 플래그가 0개면 지정된 플래그 탭을 숨긴다
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'answerReview',
      answers: { q1: ['D'] },
      flags: {},
      comments: {},
      checked: {},
    });
  });
  await expect(page.getByRole('tab', { name: /지정된 플래그/ })).toHaveCount(0);
  await expect(page.locator('#tabFlagged')).toBeHidden();
});

test('[M3-03] 오답 해설에서 검토 진입 시 문항이 읽기 전용으로 열리고 해설 창이 자동으로 열리며 해설 (X) 및 하단 탐색이 동작한다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'answerReview',
      answers: {
        q1: ['A'], // 오답 선택 유지 확인용
        q2: ['A', 'B'], // 정답 선택 유지 확인용
        q4: ['c1', 'c2', 'c5'], // ordering 선택 유지 확인용
      },
      flags: {},
      comments: {},
      checked: {},
    });
  });

  // 1) 1번 문항의 '검토' 클릭 -> 문항 화면이 읽기 전용으로 열리고 해설 창이 자동으로 열린다
  await page.getByRole('button', { name: /Review Question 1/ }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');

  const expDialog = page.locator('#abe-explanation-dialog');
  await expect(expDialog).toBeVisible();
  await expect(expDialog.locator('#abe-exp-result')).toHaveText('오답입니다');
  await expect(expDialog.locator('#abe-exp-correct')).toHaveText('D. AWS Network Firewall');
  await expect(expDialog.locator('#abe-exp-user')).toHaveText('A. Amazon GuardDuty');

  // 선택한 답(A)은 유지되고 모든 라디오 입력은 비활성화(disabled)되어 있다
  await expect(page.locator('input[id="q1.R.A"]')).toBeChecked();
  const q1Radios = page.locator('input[name="response-q1"]');
  for (let i = 0; i < 4; i++) {
    await expect(q1Radios.nth(i)).toBeDisabled();
  }

  // 해설 창을 닫은 뒤 툴바의 '해설 (X)' 클릭 및 Alt+X로 다시 열린다
  await page.locator('#abe-exp-close').click();
  await expect(expDialog).toHaveCount(0);

  const solBtn = page.getByRole('button', { name: '해설 (X)' });
  await expect(solBtn).toBeVisible();
  await solBtn.click();
  await expect(expDialog).toBeVisible();

  await page.locator('#abe-exp-close').click();
  await expect(expDialog).toHaveCount(0);
  await page.keyboard.press('Alt+x');
  await expect(expDialog).toBeVisible();

  // 2) 하단 바에 '결과 화면'과 '이전'/'다음'이 있고 다음 (N) 이동 시 해설 창이 다시 자동으로 열린다
  await page.locator('#abe-exp-close').click();
  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 2 / 9');
  await expect(page.getByRole('button', { name: '결과 화면' })).toBeVisible();
  await expect(page.getByRole('button', { name: '이전 (P)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다음 (N)' })).toBeVisible();

  // 2번 문항 진입 시 해설 창이 자동으로 열리고 체크박스가 읽기 전용으로 잠겨 있다
  await expect(expDialog).toBeVisible();
  await expect(expDialog.locator('#abe-exp-result')).toHaveText('정답입니다');
  await expect(page.locator('input[id="q2.R.A"]')).toBeChecked();
  await expect(page.locator('input[id="q2.R.B"]')).toBeChecked();
  const q2Boxes = page.locator('input[name="response-q2"]');
  for (let i = 0; i < await q2Boxes.count(); i++) {
    await expect(q2Boxes.nth(i)).toBeDisabled();
  }

  // 3) '검토 화면 (S)'로 오답 해설 목록에 돌아간 뒤 '틀린 질문 검토 (I)'로 틀린 문항만 순회
  await page.getByRole('button', { name: '검토 화면 (S)' }).click();
  await expect(page.locator('.abe-reviewScreen-2-0')).toBeVisible();
  await page.getByRole('tab', { name: /잘못된/ }).click();
  await page.getByRole('button', { name: '틀린 질문 검토 (I)' }).click();

  // 첫 번째 틀린 문항(q1) -> 다음 (N) 클릭 시 정답인 q2를 건너뛰고 q3(index 2)로 이동
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');
  await expect(expDialog).toBeVisible();
  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 3 / 9');
  await expect(expDialog).toBeVisible();

  // 다음 (N)으로 q4(ordering)로 이동 시 드롭다운도 선택한 답이 유지되고 disabled 상태다
  await page.getByRole('button', { name: '다음 (N)' }).click();
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 4 / 9');
  const q4Selects = page.locator('select.abe-drop_down');
  await expect(q4Selects.nth(0)).toHaveValue('c1');
  await expect(q4Selects.nth(1)).toHaveValue('c2');
  await expect(q4Selects.nth(2)).toHaveValue('c5');
  for (let i = 0; i < 3; i++) {
    await expect(q4Selects.nth(i)).toBeDisabled();
  }

  // 4) 하단 바의 '결과 화면' 버튼을 누르면 결과 화면으로 복귀한다
  await page.getByRole('button', { name: '결과 화면' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('result');
  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();
});

test('[M3-04] 결과 화면의 오답 해설 (I), 다시 풀기, 처음으로 버튼이 상태 및 저장소를 올바르게 전환한다', async ({ page }) => {
  await page.goto(URL);
  const STORAGE_KEY = 'saa-mock:demo-fixture';

  // 1) 결과 화면에서 '오답 해설 (I)' 클릭 및 Alt+I 단축키 -> 오답 해설(answerReview) 화면 전환 및 '결과 화면' 버튼 복귀
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'result',
      remainingSec: 1200,
      answers: { q1: ['D'], q2: ['A'] },
      flags: { q1: true },
      comments: { q1: '메모' },
      checked: {},
    });
  });

  const answerReviewBtn = page.getByRole('button', { name: '오답 해설 (I)' });
  await expect(answerReviewBtn).toBeVisible();
  await answerReviewBtn.click();

  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('answerReview');
  await expect(page.getByRole('tab', { name: /잘못된/ })).toBeVisible();
  await expect(page.locator('#IncorrectCount')).toHaveText('8');

  // 오답 해설 목록 하단의 '결과 화면' 버튼으로 다시 결과 화면 복귀
  await page.getByRole('button', { name: '결과 화면' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('result');
  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();

  // Alt+I 단축키로도 오답 해설 진입 확인 후 복귀
  await page.keyboard.press('Alt+i');
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('answerReview');
  await page.getByRole('button', { name: '결과 화면' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('result');

  // 2) '다시 풀기' 클릭 -> 현재 모드(exam)를 유지한 채 답안·플래그·설명·남은 시간 초기화 후 1번 문항으로 진입
  await page.getByRole('button', { name: '다시 풀기' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('item');
  expect(await page.evaluate(() => window.__exam.state.mode)).toBe('exam');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(0);
  expect(await page.evaluate(() => window.__exam.state.remainingSec)).toBe(1800);
  expect(await page.evaluate(() => window.__exam.state.answers)).toEqual({});
  expect(await page.evaluate(() => window.__exam.state.flags)).toEqual({});
  expect(await page.evaluate(() => window.__exam.state.comments)).toEqual({});
  await expect(page.locator('#abe-ItemOrdinalKnown')).toHaveText('문제 1 / 9');
  await expect(page.locator('#timeRemaining')).toHaveText('30:00');
  await expect(page.locator('input[id="q1.R.D"]')).not.toBeChecked();
  await expect(page.locator('#abe-FlagForReviewItemButton')).toHaveClass(/abe-FlagForReviewItemButtonUnselected/);

  // 학습 모드(study) 결과 화면에서 '다시 풀기' 클릭 -> study 모드 유지 및 checked 잠금 초기화 후 1번 문항 진입
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'result',
      answers: { q1: ['D'] },
      flags: { q1: true },
      comments: { q1: '학습 메모' },
      checked: { q1: true },
    });
  });
  await page.getByRole('button', { name: '다시 풀기' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('item');
  expect(await page.evaluate(() => window.__exam.state.mode)).toBe('study');
  expect(await page.evaluate(() => window.__exam.state.index)).toBe(0);
  expect(await page.evaluate(() => window.__exam.state.checked)).toEqual({});
  await expect(page.locator('#abe-timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '정답 확인 (K)' })).toBeDisabled();
  await expect(page.locator('input[id="q1.R.D"]')).toBeEnabled();
  await expect(page.locator('input[id="q1.R.D"]')).not.toBeChecked();

  // 3) '처음으로' 클릭 -> 저장된 진행 상태(localStorage)를 지우고 시작(모드 선택) 화면으로 복귀
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'result',
      answers: { q1: ['D'] },
      flags: { q1: true },
      comments: {},
      checked: { q1: true },
    });
  });
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).not.toBeNull();

  await page.getByRole('button', { name: '처음으로' }).click();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('start');
  expect(await page.evaluate(() => window.__exam.state.mode)).toBe('exam');
  expect(await page.evaluate(() => window.__exam.state.answers)).toEqual({});
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
  await expect(page.locator('#abe-startScreen')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // 새로고침해도 이어하기 대화상자가 뜨지 않고 깨끗한 시작 화면이 유지된다
  await page.reload();
  expect(await page.evaluate(() => window.__exam.state.phase)).toBe('start');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});


