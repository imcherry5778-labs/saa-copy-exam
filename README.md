# saa-copy-exam

Pearson VUE AWS 시험 데모(한국어판)를 픽셀 단위로 복제한 단일 HTML 모의고사 템플릿입니다.  
런타임 의존성이 없는 vanilla JS로 동작하며, 빌드 결과물은 외부 네트워크 요청이 전혀 없는 단일 HTML 파일(`dist/<id>.html`)로 생성됩니다.

---

## 목차
1. [프로젝트 소개](#프로젝트-소개)
2. [사전 준비](#사전-준비)
3. [1. 캡처 재생성 및 자산 추출](#1-캡처-재생성-및-자산-추출)
4. [2. 시험 데이터 검증 및 빌드](#2-시험-데이터-검증-및-빌드)
5. [3. 덤프 변환 스킬 사용법](#3-덤프-변환-스킬-사용법)
6. [4. 하네스 및 테스트 실행](#4-하네스-및-테스트-실행)
7. [5. 자산 관리 및 보안 주의사항](#5-자산-관리-및-보안-주의사항)

---

## 프로젝트 소개
- **Pearson VUE AWS 시험 데모 복제**: 문항 화면, Review 화면, 대화상자(설명, English 원문, 지침, 2단계 검토 종료 확인)를 픽셀 단위로 재현합니다.
- **신규 화면 추가**: Pearson의 디자인 언어를 계승한 시험 시작(모드 선택) 화면, 결과 화면(점수, 합격 여부, 영역별 성취도), 해설 창(정답·내 답, AI 해설 배지, English 토글)을 제공합니다.
- **5개 문항 유형 지원**: `single`, `multiple`, `ordering`, `matching`, 그리고 문항 묶음 시나리오인 `caseStudy`를 지원합니다.
- **단일 HTML 배포**: HTML, CSS, JavaScript, 스프라이트/아이콘 이미지가 하나의 파일에 번들링되어 오프라인 환경(`file://`)에서도 완벽하게 구동됩니다.

---

## 사전 준비
```bash
npm install
```

---

## 1. 캡처 재생성 및 자산 추출

Pearson VUE 데모 화면의 기준 캡처(`capture/`) 및 스프라이트·문자열 자산(`vendor/`)을 생성하거나 갱신할 때 사용합니다.

### 캡처 세션 실행
`capture/` 디렉터리가 없거나 데모 화면을 새로 캡처해야 하는 경우 실행합니다:
```bash
npm run capture
# 또는 직접 실행:
# node scripts/capture/session.mjs https://www.pearsonvue.com/us/en/redirects/aws/demo-test-kor.html 1920 1080
```
> [!NOTE]  
> 캡처 세션은 브라우저를 열어 수동 조작을 거치며 DOM 스냅샷, computed style, accessibility tree, 화면 스크린샷(`capture/shots/ko-*.png`)을 수집합니다.

### 자산 추출
캡처된 원본 리소스에서 스프라이트 이미지, 아이콘, 한국어/영어 UI 문자열을 추출하여 `vendor/` 디렉터리에 준비합니다:
```bash
node scripts/extract-assets.mjs
```
- 추출 산출물: `vendor/sprites.png`, `vendor/icons/`, `vendor/strings.ko.json`, `vendor/strings.en.json`

---

## 2. 시험 데이터 검증 및 빌드

시험 데이터는 `exams/*.json` 형식(JSON 스키마 정의)으로 작성됩니다.

### 시험 JSON 검증
작성한 모의고사 JSON이 스펙(필수 필드, 유효한 ID 참조, 유형별 정답 형식, 1~4 도메인 등)에 부합하는지 검증합니다:
```bash
# 기본 검증 (sample.json 및 demo-fixture.json)
npm run validate

# 특정 시험 파일 검증
node scripts/validate.mjs exams/mock-01.json
```

### 단일 파일 빌드
`src/template.html`, `src/app.css`, `src/app.js`, `vendor/` 자산, 시험 JSON을 결합하여 `dist/<id>.html` 단일 파일로 빌드합니다:
```bash
# 단일 시험 빌드
npm run build -- exams/sample.json
# 또는
node scripts/build.mjs exams/mock-01.json

# 여러 파일 지정 빌드
node scripts/build.mjs exams/mock-01.json exams/mock-02.json

# exams/*.json 전체 일괄 빌드
npm run build:all
# 또는
node scripts/build.mjs --all
```
빌드된 HTML 파일은 브라우저로 직접 더블클릭하거나 `file://` 경로로 열 수 있습니다. 네트워크 요청이 0건이므로 인터넷 연결 없이도 완전하게 동작합니다.

---

## 3. 덤프 변환 스킬 사용법

AWS SAA 덤프(텍스트, 마크다운, PDF 등)를 표준 모의고사 포맷(`exams/mock-NN.json`)으로 변환하기 위한 AI 에이전트 스킬이 포함되어 있습니다.

- **스킬 위치**:
  - Claude Code 프로젝트 스킬: `.claude/skills/dump-to-exam/SKILL.md`
  - 벤더 중립 에이전트 스킬: `.agents/skills/dump-to-exam/SKILL.md`
- **변환 8단계 프로세스**:
  1. **덤프 원문 읽기**: 문제 원문, 보기, 정답, 기존 해설 파싱
  2. **ko/en 번역 및 보존**: 원문(영어)을 `en`에 보존하고 자연스러운 한국어 `ko` 번역 작성
  3. **정답 기입 및 논란 표기**: 정답 필드 작성, 덤프 정답이 의심스러운 경우 `disputed: true` 설정
  4. **AI 해설 작성**: 오답 분석 및 정답 근거를 포함한 해설 작성, `explanationSource: "ai"` 명시
  5. **도메인 분류**: AWS SAA-C03 4개 도메인(1: 보안, 2: 복원력, 3: 고성능, 4: 비용 최적화) 중 하나로 분류
  6. **65문항 구성**: 65문항 단위로 `exams/mock-NN.json` 파일 생성
  7. **validate 수정 루프**: `node scripts/validate.mjs exams/mock-NN.json` 실행 후 오류 발생 시 JSON 수정 및 재검증 반복
  8. **빌드**: `node scripts/build.mjs exams/mock-NN.json` 실행하여 최종 HTML 생성

---

## 4. 하네스 및 테스트 실행

프로젝트는 Playwright 기반의 픽셀 비교 테스트와 기능 단위 테스트로 구성되어 있습니다.

### 회귀 검사 (통과 기능 전체 검증)
현재 `features.json`에서 `passes: true`로 마킹된 모든 기능의 회귀 여부를 검사합니다:
```bash
scripts/check.sh passing
# 또는
npm run check passing
```

### 마일스톤 게이트 검사
각 마일스톤(M1, M2, M3, M4) 완료 조건을 전체 검증합니다:
```bash
scripts/check.sh M1
scripts/check.sh M2
scripts/check.sh M3
scripts/check.sh M4
```

### 개별 기능 테스트
특정 기능 ID 태그를 지정하여 테스트를 실행할 수 있습니다:
```bash
npx playwright test --grep "\[M4-03\]"
```

### 픽셀 비교 시각 테스트
데모 화면 캡처와의 픽셀 일치(1920×1080)를 검증합니다:
```bash
npx playwright test tests/visual.spec.mjs
```

### 구현 자동화 루프 (Orca / 하네스)
지정된 마일스톤의 미통과 기능을 순차 구현하는 하네스 루프를 구동합니다:
```bash
./loop.sh M4 15
# 에이전트 및 모델 지정 예시:
# AGENT=claude MODEL=claude-3-7-sonnet ./loop.sh M4 15
# AGENT=agy MODEL=gemini-2.5-flash ./loop.sh M4 15
```

---

## 5. 자산 관리 및 보안 주의사항

- `capture/`, `vendor/`, `dist/`, `exams/*.json` (공개용 `exams/sample.json` 제외)은 Pearson VUE 자산 또는 덤프 데이터가 포함되어 있으므로 **절대 git에 커밋하거나 외부 공개 채널에 업로드하지 마십시오.** (`.gitignore`에 등록되어 있음)
- `capture/shots/ko-*.png`는 픽셀 테스트의 읽기 전용 기준 자료이므로 수동 변경이나 `--update-snapshots` 갱신을 금지합니다.
