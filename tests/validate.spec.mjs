import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (...files) => spawnSync('node', ['scripts/validate.mjs', ...files], { encoding: 'utf8' });
const broken = (mutate) => {
  const exam = JSON.parse(readFileSync('exams/demo-fixture.json', 'utf8'));
  mutate(exam);
  const f = join(mkdtempSync(join(tmpdir(), 'val-')), 'bad.json');
  writeFileSync(f, JSON.stringify(exam));
  return run(f);
};

test('[M1-02] sample.json과 demo-fixture.json이 검증을 통과한다', () => {
  const r = run('exams/sample.json', 'exams/demo-fixture.json');
  expect(r.status, r.stderr).toBe(0);
});

test('[M1-02] 깨진 입력은 경로가 포함된 오류와 exit 1을 낸다', () => {
  let r = broken((e) => { e.items[0].answer = ['Z']; });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('items[0].answer[0]');

  r = broken((e) => { e.items[1].select = 3; });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('items[1].answer');

  r = broken((e) => { e.items[5].answer.p1 = 'zz'; e.items[2].id = 'q1'; });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('items[5].answer.p1');
  expect(r.stderr).toContain('items[2].id');

  r = broken((e) => { e.items[0].caseStudy = 'cs1'; });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('items[7].caseStudy');

  r = broken((e) => { e.items[0].stem.ko = ''; e.items[0].domain = 9; });
  expect(r.stderr).toContain('items[0].stem.ko');
  expect(r.stderr).toContain('items[0].domain');
});
