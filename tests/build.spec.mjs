import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('[M1-03] build가 단일 HTML을 만들고 file://로 열면 네트워크 요청이 0건이다', async ({ page }) => {
  execFileSync('node', ['scripts/build.mjs', 'exams/demo-fixture.json'], { stdio: 'pipe' });
  expect(existsSync('dist/demo-fixture.html')).toBe(true);
  const html = readFileSync('dist/demo-fixture.html', 'utf8');
  expect(html).not.toMatch(/<(link|img|script)[^>]+(src|href)=["'](?!data:|#)/i);

  const requests = [];
  page.on('request', (r) => { if (!r.url().startsWith('data:')) requests.push(r.url()); });
  const url = pathToFileURL(resolve('dist/demo-fixture.html')).href;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([url]);
  expect(await page.evaluate(() => window.__EXAM__.id)).toBe('demo-fixture');
});

test('[M1-03] 존재하지 않거나 검증에 실패한 시험은 빌드가 실패한다', () => {
  expect(() => execFileSync('node', ['scripts/build.mjs', 'tests/__missing__.json'], { stdio: 'pipe' })).toThrow();
});
