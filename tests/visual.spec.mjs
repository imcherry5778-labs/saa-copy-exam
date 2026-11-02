// Pixel contract against the Korean demo captures (docs/spec.md §6.2).
// Harness-owned: implementers must not edit this file. Each case replays the
// last click the capture made so hover/focus state matches the reference.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

function remainingSec(shot) {
  const aria = readFileSync(`capture/aria/${shot}.yml`, 'utf8');
  const m = aria.match(/남은 시간 (\d+) 분, (\d+) 초/);
  return m ? +m[1] * 60 + +m[2] : null;
}

// Answers on Q1 at the time most Korean captures were taken.
const Q1_DONE = { answers: { q1: ['A'] }, flags: { q1: true } };

async function open(page, shot, state) {
  await page.goto(URL);
  await page.evaluate(([s, sec]) => {
    window.__exam.load({ mode: 'exam', answers: {}, flags: {}, comments: {}, checked: {}, ...s });
    if (sec != null) window.__exam.setRemaining(sec);
  }, [state, remainingSec(shot)]);
}

const btn = (page, re) => page.getByRole('button', { name: re });
const next = (page) => btn(page, /^다음/);

const cases = [
  ['M1-04', 'ko-04-q1', { phase: 'item', index: 0 }, (p) => next(p).hover()],
  ['M1-05', 'ko-04-q1-selected-flagged', { phase: 'item', index: 0, ...Q1_DONE }, (p) => btn(p, /플래그/).hover()],
  ['M1-06', 'ko-05-q2', { phase: 'item', index: 1, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-07', 'ko-05-q4', { phase: 'item', index: 3, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-07', 'ko-05-q5', { phase: 'item', index: 4, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-08', 'ko-05-q6', { phase: 'item', index: 5, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-08', 'ko-05-q7', { phase: 'item', index: 6, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-09', 'ko-05-q8', { phase: 'item', index: 7, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-09', 'ko-05-q9', { phase: 'item', index: 8, ...Q1_DONE }, (p) => next(p).hover()],
  ['M1-10', 'ko-04-q1-english', { phase: 'item', index: 0 }, (p) => p.getByRole('button').filter({ hasText: 'English' }).click()],
  ['M1-11', 'ko-04-q1-comment', { phase: 'item', index: 0, ...Q1_DONE }, (p) => btn(p, /^설명/).click()],
  // Review: arrive the way the capture did, by pressing 다음 on the last item.
  ['M2-02', 'ko-06-review', { phase: 'item', index: 8, ...Q1_DONE }, (p) => next(p).click()],
  ['M2-02', 'ko-06-review-incomplete-tab', { phase: 'review', ...Q1_DONE }, (p) => p.getByRole('tab', { name: /미완료/ }).click()],
  ['M2-02', 'ko-06-review-flagged-tab', { phase: 'review', ...Q1_DONE }, (p) => p.getByRole('tab', { name: /플래그/ }).click()],
  ['M2-04', 'ko-06-reviewing-q1', { phase: 'review', ...Q1_DONE }, (p) => p.getByRole('button', { name: /^검토$|Review Question 1/ }).first().click()],
  ['M2-05', 'ko-06-instructions', { phase: 'review', ...Q1_DONE }, (p) => btn(p, /^지침/).click()],
  ['M2-06', 'ko-07-end-review-confirm', { phase: 'review', ...Q1_DONE }, (p) => btn(p, /^검토 종료/).click()],
  ['M2-06', 'ko-07-end-review-confirm2', { phase: 'review', ...Q1_DONE }, async (p) => {
    await btn(p, /^검토 종료/).click();
    await btn(p, /^예/).click();
  }],
];

for (const [id, shot, state, act] of cases) {
  test(`[${id}] visual ${shot}`, async ({ page }) => {
    await open(page, shot, state);
    await act(page);
    await expect(page).toHaveScreenshot(`${shot}.png`);
  });
}
