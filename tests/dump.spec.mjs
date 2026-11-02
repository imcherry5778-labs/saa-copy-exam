import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

test('[M4-02] 덤프 변환 스킬이 프로젝트 scope의 .claude 및 .agents 경로에 존재하고 내용이 동기화된다', () => {
  const claudeSkillPath = resolve('.claude/skills/dump-to-exam/SKILL.md');
  const agentsSkillPath = resolve('.agents/skills/dump-to-exam/SKILL.md');

  // 프로젝트 scope 내부 존재 검증
  expect(existsSync(claudeSkillPath)).toBe(true);
  expect(existsSync(agentsSkillPath)).toBe(true);

  // .agents 스킬 경로가 유효한 심볼릭 링크이거나 동일한 내용이어야 함
  const claudeContent = readFileSync(claudeSkillPath, 'utf8');
  const agentsContent = readFileSync(agentsSkillPath, 'utf8');
  expect(agentsContent).toBe(claudeContent);

  const agentsStat = lstatSync(agentsSkillPath);
  if (agentsStat.isSymbolicLink()) {
    expect(realpathSync(agentsSkillPath)).toBe(realpathSync(claudeSkillPath));
  }
});

test('[M4-02] 덤프 변환 스킬은 스펙 7절의 8단계 변환 절차를 모두 포함한다', () => {
  const content = readFileSync('.claude/skills/dump-to-exam/SKILL.md', 'utf8');

  // 스펙 7절 8단계 절차 포함 여부 검증
  expect(content).toMatch(/1단계|1\./);
  expect(content).toMatch(/덤프 원문|원문/);
  expect(content).toMatch(/2단계|2\./);
  expect(content).toMatch(/en.*보존.*ko.*번역|번역/);
  expect(content).toMatch(/3단계|3\./);
  expect(content).toMatch(/disputed|정답 논란/);
  expect(content).toMatch(/4단계|4\./);
  expect(content).toMatch(/explanationSource.*ai|AI 해설/);
  expect(content).toMatch(/5단계|5\./);
  expect(content).toMatch(/도메인 1.*4|domain/i);
  expect(content).toMatch(/6단계|6\./);
  expect(content).toMatch(/65문항/);
  expect(content).toMatch(/exams\/mock-NN\.json|exams\/mock-[0-9a-zA-Z-]+\.json/);
  expect(content).toMatch(/7단계|7\./);
  expect(content).toMatch(/validate|검증/);
  expect(content).toMatch(/8단계|8\./);
  expect(content).toMatch(/build|빌드/);
});

test('[M4-02] 덤프 변환 스킬은 validate 실패 시 수정 루프(에러 분석, JSON 수정, 재검증)를 명시한다', () => {
  const content = readFileSync('.claude/skills/dump-to-exam/SKILL.md', 'utf8');

  // validate 스크립트 실행 명령 명시
  expect(content).toMatch(/scripts\/validate\.mjs/);

  // 오류 발생 시 원인 분석 및 수정 루프 명시
  expect(content).toMatch(/수정 루프|피드백 루프|반복/);
  expect(content).toMatch(/오류|에러/);
  expect(content).toMatch(/재검증|다시.*validate/);

  // 최종 빌드 연결 명시
  expect(content).toMatch(/scripts\/build\.mjs/);
});
