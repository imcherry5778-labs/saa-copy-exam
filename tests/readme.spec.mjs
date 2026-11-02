import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readmePath = resolve('README.md');

test('[M4-03] README.md 파일이 루트에 존재하고 프로젝트 개요 및 무의존성 단일 HTML 특성을 설명한다', () => {
  expect(existsSync(readmePath)).toBe(true);
  const content = readFileSync(readmePath, 'utf8');

  // 프로젝트 개요 및 Pearson VUE AWS 데모 복제 설명
  expect(content).toMatch(/saa-copy-exam/);
  expect(content).toMatch(/Pearson VUE/i);
  expect(content).toMatch(/vanilla JS|의존성 없는/);
  expect(content).toMatch(/단일 HTML|dist\/<id>\.html/);
  expect(content).toMatch(/네트워크 요청.*0건|오프라인/);
});

test('[M4-03] README는 캡처 재생성과 자산 추출 방법을 설명한다', () => {
  const content = readFileSync(readmePath, 'utf8');

  // 캡처 세션 실행 방법
  expect(content).toMatch(/scripts\/capture\/session\.mjs|npm run capture/);
  expect(content).toMatch(/1920\s+1080/);

  // 자산 추출 방법
  expect(content).toMatch(/scripts\/extract-assets\.mjs/);
  expect(content).toMatch(/vendor\//);

  // 기준 자료 및 보안 주의사항
  expect(content).toMatch(/capture\/|기준/);
});

test('[M4-03] README는 exam JSON 검증과 단일·다중·전체 빌드 방법을 설명한다', () => {
  const content = readFileSync(readmePath, 'utf8');

  // 검증 명령
  expect(content).toMatch(/scripts\/validate\.mjs|npm run validate/);

  // 빌드 명령 (단일 파일, 다중 파일, 전체 빌드)
  expect(content).toMatch(/scripts\/build\.mjs|npm run build/);
  expect(content).toMatch(/build:all|--all/);
  expect(content).toMatch(/dist\//);
});

test('[M4-03] README는 덤프 변환 스킬의 8단계 절차와 validate 수정 루프를 설명한다', () => {
  const content = readFileSync(readmePath, 'utf8');

  // 스킬 위치
  expect(content).toMatch(/\.claude\/skills\/dump-to-exam|\.agents\/skills\/dump-to-exam/);

  // 8단계 절차 주요 키워드
  expect(content).toMatch(/덤프 원문/);
  expect(content).toMatch(/ko.*en|번역/);
  expect(content).toMatch(/disputed|정답 논란/);
  expect(content).toMatch(/explanationSource|AI 해설/);
  expect(content).toMatch(/도메인|domain/i);
  expect(content).toMatch(/65문항/);
  expect(content).toMatch(/validate|검증/);
  expect(content).toMatch(/수정 루프|재검증|반복/);
});

test('[M4-03] README는 하네스 및 테스트(회귀 검사, 마일스톤 게이트, 개별 테스트, loop.sh) 실행 방법을 설명한다', () => {
  const content = readFileSync(readmePath, 'utf8');

  // 회귀 검사
  expect(content).toMatch(/scripts\/check\.sh passing|npm run check passing/);

  // 마일스톤 게이트
  expect(content).toMatch(/scripts\/check\.sh M[1-4]/);

  // 개별 테스트 (playwright grep)
  expect(content).toMatch(/npx playwright test/);

  // 구현 루프 (loop.sh)
  expect(content).toMatch(/loop\.sh/);
});
