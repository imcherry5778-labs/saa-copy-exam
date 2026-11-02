import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

const ALL_CORRECT_ANSWERS = {
  q1: ['D'],
  q2: ['B', 'A'], // multiple은 선택 순서와 무관하게 정답 인정
  q3: ['C'],
  q4: ['c1', 'c2', 'c6'],
  q5: ['c2', 'c1', 'c3'],
  q6: { p1: 'c2', p2: 'c1', p3: 'c2', p4: 'c2', p5: 'c1' },
  q7: { p1: 'c2', p2: 'c1', p3: 'c1', p4: 'c2' },
  q8: ['A', 'C'],
  q9: ['B'],
};

test('[M2-09] demo-fixture 정답 전체 입력 시 1000점 합격이고 4개 영역 모두 100% 역량 충족이다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate((answers) => {
    window.__exam.load({
      mode: 'exam',
      phase: 'result',
      remainingSec: 1500, // 30분(1800초) 중 5분(300초) 소요
      answers,
      flags: {},
      comments: {},
      checked: {},
    });
  }, ALL_CORRECT_ANSWERS);

  await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible();
  await expect(page.locator('#abe-resultScore')).toHaveText('1000');
  await expect(page.locator('#abe-resultCard')).toContainText('1000 / 1000');
  await expect(page.locator('#abe-resultCard')).toContainText('720');
  await expect(page.locator('#abe-resultStatus')).toHaveText('합격');
  await expect(page.locator('#abe-resultStatus')).toHaveClass(/abe-reviewCompleteLabel/);
  await expect(page.locator('#abe-resultCorrect')).toHaveText('9 / 9');
  await expect(page.locator('#abe-resultElapsed')).toHaveText('05:00');

  const expectedDomains = [
    [1, '보안 아키텍처 설계', '30%', '100%', '역량 충족'],
    [2, '복원력을 갖춘 아키텍처 설계', '26%', '100%', '역량 충족'],
    [3, '고성능 아키텍처 설계', '24%', '100%', '역량 충족'],
    [4, '비용에 최적화된 아키텍처 설계', '20%', '100%', '역량 충족'],
  ];

  for (const [d, name, weight, acc, status] of expectedDomains) {
    const row = page.locator(`#abe-domainTable tr[data-domain="${d}"]`);
    await expect(row).toContainText(name);
    await expect(row).toContainText(weight);
    await expect(row.locator('.abe-domainAccuracy')).toHaveText(acc);
    await expect(row.locator('.abe-reviewItemStatus')).toHaveText(status);
    await expect(row.locator('.abe-reviewItemStatus')).toHaveClass(/abe-reviewCompleteLabel/);
  }

  // 하단 바 및 툴바 크롬 확인
  await expect(page.locator('#abe-toolbar-tools')).toBeEmpty();
  await expect(page.locator('#colorSchemes-button')).toBeVisible();
  await expect(page.getByRole('button', { name: '오답 해설 (I)' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 풀기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '처음으로' })).toBeVisible();
});

test('[M2-09] 무응답 시 100점 불합격이고 모든 영역이 0% 개선 필요이다', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'exam',
      phase: 'result',
      remainingSec: 1800,
      answers: {},
      flags: {},
      comments: {},
      checked: {},
    });
  });

  await expect(page.locator('#abe-resultScore')).toHaveText('100');
  await expect(page.locator('#abe-resultStatus')).toHaveText('불합격');
  await expect(page.locator('#abe-resultStatus')).toHaveClass(/abe-reviewIncompleteLabel/);
  await expect(page.locator('#abe-resultCorrect')).toHaveText('0 / 9');

  for (const d of [1, 2, 3, 4]) {
    const row = page.locator(`#abe-domainTable tr[data-domain="${d}"]`);
    await expect(row.locator('.abe-domainAccuracy')).toHaveText('0%');
    await expect(row.locator('.abe-reviewItemStatus')).toHaveText('개선 필요');
    await expect(row.locator('.abe-reviewItemStatus')).toHaveClass(/abe-reviewIncompleteLabel/);
  }
});

test('[M2-09] 영역별 정답률과 부분 점수 없음(문항 단위 채점) 및 학습 모드 소요 시간 숨김이 정확히 동작한다', async ({ page }) => {
  await page.goto(URL);
  // domain 1(q1, q4): q1 정답, q4 일부만 일치(오답) -> 1/2 = 50% (개선 필요)
  // domain 2(q5, q8, q9): q5, q8, q9 모두 정답 -> 3/3 = 100% (역량 충족)
  // domain 3(q3, q6): q3 정답, q6 일부만 일치(오답) -> 1/2 = 50% (개선 필요)
  // domain 4(q2, q7): q2 1개만 선택(오답), q7 정답 -> 1/2 = 50% (개선 필요)
  // 전체 6/9 정답 -> round(100 + 900 * 6 / 9) = 700점 (불합격)
  await page.evaluate(() => {
    window.__exam.load({
      mode: 'study',
      phase: 'result',
      answers: {
        q1: ['D'],
        q2: ['A'], // multiple에서 1개만 선택 -> 오답
        q3: ['C'],
        q4: ['c1', 'c2', 'c5'], // ordering 마지막 슬롯 오답 -> 오답
        q5: ['c2', 'c1', 'c3'],
        q6: { p1: 'c2', p2: 'c1', p3: 'c2', p4: 'c2', p5: 'c2' }, // p5 오답 -> 오답
        q7: { p1: 'c2', p2: 'c1', p3: 'c1', p4: 'c2' },
        q8: ['A', 'C'],
        q9: ['B'],
      },
      flags: {},
      comments: {},
      checked: {},
    });
  });

  await expect(page.locator('#abe-resultScore')).toHaveText('700');
  await expect(page.locator('#abe-resultStatus')).toHaveText('불합격');
  await expect(page.locator('#abe-resultCorrect')).toHaveText('6 / 9');
  // 학습 모드에서는 소요 시간을 표시하지 않는다
  await expect(page.locator('#abe-resultElapsed')).toHaveCount(0);

  await expect(page.locator('#abe-domainTable tr[data-domain="1"] .abe-domainAccuracy')).toHaveText('50%');
  await expect(page.locator('#abe-domainTable tr[data-domain="1"] .abe-reviewItemStatus')).toHaveText('개선 필요');

  await expect(page.locator('#abe-domainTable tr[data-domain="2"] .abe-domainAccuracy')).toHaveText('100%');
  await expect(page.locator('#abe-domainTable tr[data-domain="2"] .abe-reviewItemStatus')).toHaveText('역량 충족');

  await expect(page.locator('#abe-domainTable tr[data-domain="3"] .abe-domainAccuracy')).toHaveText('50%');
  await expect(page.locator('#abe-domainTable tr[data-domain="3"] .abe-reviewItemStatus')).toHaveText('개선 필요');

  await expect(page.locator('#abe-domainTable tr[data-domain="4"] .abe-domainAccuracy')).toHaveText('50%');
  await expect(page.locator('#abe-domainTable tr[data-domain="4"] .abe-reviewItemStatus')).toHaveText('개선 필요');
});
