import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const URL = 'file://' + resolve('dist/demo-fixture.html') + '?test=1';

async function open(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    window.__exam.load({ mode: 'exam', phase: 'item', index: 0, answers: {}, flags: {}, comments: {}, checked: {} });
  });
}

test('[M1-12] 색상 구성표 목록은 12항목이고 선택하면 닫힌다', async ({ page }) => {
  await open(page);
  await page.locator('#colorSchemes-button').click();
  const items = page.locator('#colorSchemes-menu li');
  await expect(items).toHaveCount(12);
  await expect(items.nth(1)).toHaveText('검정 바탕에 노랑');
  await expect(items.nth(11)).toHaveText('하얀 바탕에 파랑');
  await items.nth(3).click();
  await expect(page.locator('#colorSchemes-menu')).toHaveCount(0);
  await expect(page.locator('#colorSchemes-button .ui-selectmenu-text')).toHaveText('색상 구성표');
});

async function accessKey(page, key) {
  await page.locator('#abe-contentPane').focus();
  await page.keyboard.down('Alt');
  await page.keyboard.press(key);
  await page.keyboard.up('Alt');
}

test('[M1-12] Alt+N/P/F/M accesskey가 동작한다', async ({ page }) => {
  await open(page);
  await accessKey(page, 'n');
  await expect(page.locator('#itemOrdinal')).toHaveText('2');
  await accessKey(page, 'p');
  await expect(page.locator('#itemOrdinal')).toHaveText('1');
  await accessKey(page, 'f');
  await expect(page.locator('#abe-FlagForReviewItemButton')).toHaveClass(/Selected/);
  await accessKey(page, 'm');
  await expect(page.locator('#abe-commentTxt')).toHaveCount(1);
});
