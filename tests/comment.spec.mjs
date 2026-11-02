import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });
}

const openComment = (page) => page.getByRole('button', { name: /^설명/ }).click();

test('[M1-11] 저장하면 문항별로 보관되고 다시 열면 보인다', async ({ page }) => {
  await open(page);
  await openComment(page);
  await page.locator('#abe-commentTxt').fill('첫 문항 메모');
  await page.locator('#SAVE').click();
  await expect(page.locator('#abe-commentTxt')).toHaveCount(0);
  await page.locator('#abe-NextButton').click();
  await openComment(page);
  await expect(page.locator('#abe-commentTxt')).toHaveValue('');
  await page.locator('#CANCEL').click();
  await page.locator('#abe-PreviousButton').click();
  await openComment(page);
  await expect(page.locator('#abe-commentTxt')).toHaveValue('첫 문항 메모');
});

test('[M1-11] 취소하면 변경이 폐기된다', async ({ page }) => {
  await open(page);
  await openComment(page);
  await page.locator('#abe-commentTxt').fill('저장함');
  await page.locator('#SAVE').click();
  await openComment(page);
  await page.locator('#abe-commentTxt').fill('버릴 내용');
  await page.locator('#CANCEL').click();
  await expect(page.locator('#abe-commentTxt')).toHaveCount(0);
  await openComment(page);
  await expect(page.locator('#abe-commentTxt')).toHaveValue('저장함');
});
