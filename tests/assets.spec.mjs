import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

test('[M1-01] extract-assets가 vendor/를 만들고 driverProperties 키를 그대로 보존한다', () => {
  execFileSync('node', ['scripts/extract-assets.mjs'], { stdio: 'pipe' });
  for (const f of ['strings.ko.json', 'strings.en.json', 'kor/default.png', 'kor/sprites-compiled.css', 'css/base.css', 'css/screen.css']) {
    expect(existsSync(`vendor/${f}`), f).toBe(true);
  }
  for (const [lang, st] of [['ko', 'st2'], ['en', 'st1']]) {
    const raw = JSON.parse(readFileSync(`capture/raw/abe-prd-1.pearsonvue.com/${st}/driver/getMessages`, 'utf8')).driverProperties;
    const out = JSON.parse(readFileSync(`vendor/strings.${lang}.json`, 'utf8'));
    expect(Object.keys(out).length).toBeGreaterThan(1000);
    expect(out).toEqual(raw);
  }
});
