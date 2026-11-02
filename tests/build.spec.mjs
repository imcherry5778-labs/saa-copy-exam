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

test('[M4-01] npm run build로 특정 시험을 빌드하고 npm run build:all로 exams의 모든 시험을 빌드한다', () => {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // npm run build -- exams/sample.json
  execFileSync(npmCmd, ['run', 'build', '--', 'exams/sample.json'], { stdio: 'pipe' });
  expect(existsSync('dist/sample.html')).toBe(true);
  const sampleHtml = readFileSync('dist/sample.html', 'utf8');
  expect(sampleHtml.length).toBeGreaterThan(100000);

  // npm run build:all
  execFileSync(npmCmd, ['run', 'build:all'], { stdio: 'pipe' });
  expect(existsSync('dist/sample.html')).toBe(true);
  expect(existsSync('dist/demo-fixture.html')).toBe(true);
});

test('[M4-01] build CLI는 여러 파일 경로를 받아 일괄 빌드하며 오류 시 실패한다', () => {
  // 여러 파일 일괄 빌드
  const out = execFileSync('node', ['scripts/build.mjs', 'exams/sample.json', 'exams/demo-fixture.json'], { encoding: 'utf8' });
  expect(out).toContain('dist/sample.html');
  expect(out).toContain('dist/demo-fixture.html');
  expect(existsSync('dist/sample.html')).toBe(true);
  expect(existsSync('dist/demo-fixture.html')).toBe(true);

  // 잘못된 파일이 포함된 경우 빌드 실패
  expect(() => execFileSync('node', ['scripts/build.mjs', 'exams/sample.json', 'tests/__missing__.json'], { stdio: 'pipe' })).toThrow();
});

