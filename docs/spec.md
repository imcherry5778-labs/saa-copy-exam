# SAA 모의고사 단일 HTML 템플릿 — 스펙

작성: Opus 5.5 (planner) · 2026-11-02 · 상태: M1 착수 전 확정본

## 1. 목표

Pearson VUE의 **AWS 시험 데모(한국어판)** 화면을 픽셀 단위로 복제한 단일 HTML 모의고사 템플릿을 만든다.
나중에 덤프를 넣으면 AI가 `exams/mock-NN.json`으로 변환하고, `build.mjs`가 `dist/mock-NN.html` 한 파일로 굽는다.

### 범위
- 복제할 화면: 문항 화면, Review 화면, 대화상자(설명, English, 지침, 검토 종료 확인)
- 새로 만들 화면: 시작(모드 선택) 화면, 결과 화면, 해설 창. **모두 Pearson과 같은 디자인 언어**로 만든다.
- 문항 유형 5가지: `single`, `multiple`, `ordering`, `matching`, 그리고 문항 묶음인 case study(`caseStudy` 필드)

### 범위 밖
- 데모의 안내, NDA, 튜토리얼 화면
- 색상 구성표 11종: 드롭다운 UI는 똑같이 만들되, 기본 테마만 동작한다.
- 화면 전체의 영어 전환: **영어는 문항별 `English` 팝업으로만 제공**하고 UI는 한국어로 고정한다.
- 서버, 네트워크 요청, 외부 라이브러리 런타임 의존성

## 2. 기준 자료 (로컬 전용, gitignore 대상)

| 경로 | 내용 |
|---|---|
| `capture/shots/ko-*.png` | **픽셀 기준 이미지**(1920×1080). 읽기 전용이며 절대 수정 금지 |
| `capture/shots/0*.png` | 영어판 같은 화면. 참고용 |
| `capture/styles/<name>.json` | 화면별 보이는 요소의 computed style과 bounding rect |
| `capture/dom/<name>.html` | 화면별 DOM 스냅샷 |
| `capture/aria/<name>.yml` | 화면별 접근성 트리(텍스트, 역할, 남은 시간) |
| `capture/raw/abe-prd-1.pearsonvue.com/st2/driver/resources/` | 원본 CSS(`base.css`, `screen.css`, `jquery-ui*`), 스프라이트(`languages/kor/default.png__*`, `sprites-compiled.css__*`), 아이콘(`warning.png`, `information.png`, `infoIcon.png`, `flag_flagged_2_0.png`, `exhibit.png`, `resize.png`, `contrastDownArrow.png`) |
| `capture/raw/.../st2/driver/getMessages` | **한국어** UI 문자열 1,608개(`driverProperties`) |
| `capture/raw/.../st1/driver/getMessages` | **영어** UI 문자열(같은 키) |
| `capture/network.jsonl` | 응답 목록 |

`capture/`가 없으면 `node scripts/capture/session.mjs https://www.pearsonvue.com/us/en/redirects/aws/demo-test-kor.html 1920 1080`로 다시 만든다(수동 조작 필요).

폰트는 Pearson CSS 그대로 영어 `Tahoma, Arial, Helvetica, sans-serif`, 한국어 `Batang`을 쓴다. 같은 PC에서 비교하므로 대체 폰트도 기준 이미지와 동일하게 나온다.

## 3. 구조

```
src/template.html     마크업 골격 (자리표시자 포함)
src/app.css           작성한 CSS (capture/styles 값을 근거로 작성)
src/app.js            상태, 렌더링, 이벤트 (vanilla JS, 의존성 없음)
scripts/extract-assets.mjs  capture/ → vendor/ (스프라이트, 아이콘, strings.ko.json, strings.en.json)
scripts/validate.mjs  exam JSON 검증 (사람이 읽을 수 있는 오류 메시지, 실패 시 exit 1)
scripts/build.mjs     template + css + js + vendor 자산(data URI) + exam JSON → dist/<id>.html
vendor/               추출 자산 (gitignore)
exams/sample.json     공개 가능한 샘플 (커밋)
exams/demo-fixture.json  데모 재현용 (gitignore, 픽셀 테스트 전용)
tests/*.spec.mjs      Playwright 테스트 (제목에 [M1-03] 같은 기능 ID 태그 필수)
```

- 빌드 결과물은 **파일 하나**다. 실행 중 네트워크 요청이 0건이어야 한다(`file://`로 열어도 동작).
- 원본 jQuery/jQuery UI는 쓰지 않는다. selectmenu 모양은 직접 구현한다.
- 원본 CSS 값, 스프라이트, 아이콘은 그대로 써도 된다(개인용). 단, `vendor/`와 `dist/`는 커밋하지 않는다.

## 4. 시험 데이터 스키마 (`exams/*.json`)

```jsonc
{
  "id": "mock-01",                       // 파일명·저장 키에 사용, [a-z0-9-]+
  "title": "AWS Certified Solutions Architect - Associate",  // 타이틀 바 " - " 앞부분
  "candidate": "수험자",                  // 타이틀 바 " - " 뒷부분
  "durationMinutes": 130,
  "caseStudies": { "cs1": { "scenario": { "ko": "...", "en": "..." } } },   // 선택
  "items": [ /* 아래 유형 */ ]
}
```
공통 필드: `id`(시험 안에서 유일), `type`, `domain`(1–4), `stem{ko,en}`, `explanation{ko,en}`, `explanationSource`(`"dump"`|`"ai"`), `disputed`(선택, bool), `caseStudy`(선택, caseStudies 키).
`stem`의 문단 구분은 `\n\n`이다. 텍스트는 일반 텍스트로 렌더링하며 HTML을 해석하지 않는다.

| type | 추가 필드 | answer | 완료 조건 |
|---|---|---|---|
| `single` | `options[{id,ko,en}]` (A–F) | `["B"]` | 1개 선택 |
| `multiple` | `options`, `select`(정답 개수) | `["A","C"]` (길이 = select) | 정확히 `select`개 선택 |
| `ordering` | `choices[{id,ko,en}]`, `slots[{label:{ko,en}\|null, side:"left"\|"right"}]` | 슬롯 순서대로 choice id 배열 | 모든 슬롯 선택 |
| `matching` | `choices[{id,ko,en}]`(범주), `prompts[{id,ko,en}]` | `{promptId: choiceId}` | 모든 prompt 선택 |

- `options[].compact`(선택, bool, 기본 false)는 **데모 재현 전용 표시 힌트**다. 기본 보기 행은 보기 글자 셀 안에 빈 문단이 하나 더 있는 원본 구조(행 높이 48px, `ko-04-q1`)를 따른다. `compact: true`인 보기는 빈 문단이 없다(24px, `ko-05-q8`의 모든 보기, `ko-05-q9`의 A·B·D). 덤프 변환에서는 이 필드를 쓰지 않는다. 2026-11-02 사용자 결정.
- 같은 `caseStudy` 값을 가진 문항은 서로 연속해야 한다.
- 채점은 **문항 단위 전부 맞아야 정답**이고 부분 점수는 없다.
- 검증 규칙: 위 필드 존재, id 유일성, answer가 실제 id를 가리킴, `multiple`은 answer 길이와 select가 같음, domain 범위, caseStudy 참조와 연속성, ko·en이 빈 문자열이 아님. 오류는 `items[3].answer: ...`처럼 경로와 함께 모두 출력한다.

## 5. 화면과 동작

모든 수치는 `capture/styles/*.json`이 정답이다. 아래는 동작 명세다.

### 5.1 공통 크롬 (기준: `ko-04-q1.png`)
- **타이틀 바**: 왼쪽에 `{title} - {candidate}`가 있다. 오른쪽 위에는 시계 아이콘과 `남은 시간 MM:SS`가 있고, 클릭하면 숫자를 숨기거나 보여 준다(아이콘은 유지). 그 아래에는 `문제 n / N`이 있으며 역시 클릭하면 숨긴다.
- **툴바**: 왼쪽에 `설명 (M)`(= Comment)이 있다. 오른쪽에는 `검토용으로 플래그 지정 (F)`와 `색상 구성표` 드롭다운이 있다.
- **하단 바**: `이전 (P)`, `다음 (N)`이 있다. 첫 문항에서는 이전 버튼이 없다. 검토 중에 들어온 문항에서는 `검토 화면 (S)`와 `다음 (N)`이 나온다.
- 밑줄 친 글자는 `accesskey`로 동작한다(Alt+글자).
- 시험 모드에서 남은 시간이 0이 되면 바로 결과 화면으로 간다.

### 5.2 문항 렌더링
- 문항 위에 `English` 버튼이 있다(기준: `ko-04-q1.png`). 누르면 영어 원문 팝업이 뜬다(기준: `ko-04-q1-english.png`). 팝업 내용은 stem과 보기 `A. ...`이고, 닫기 X가 있다.
- `single`은 라디오, `multiple`은 체크박스로 보여 준다(기준: `ko-05-q2.png`, `ko-05-q8.png`).
- `ordering`은 보기 목록(글머리표)과 슬롯별 드롭다운으로 이루어진다(`선택…`). 라벨 위치는 `side`를 따른다(기준: `ko-05-q4.png` 왼쪽, `ko-05-q5.png` 오른쪽).
- `matching`은 범주 목록과 prompt별 드롭다운으로 이루어진다(기준: `ko-05-q6.png`, `ko-05-q7.png`).
- 드롭다운 목록의 첫 항목은 `선택…`(선택 해제)이다. 같은 choice를 여러 슬롯에서 고를 수 있다(데모 동작과 동일).
- case study 문항은 위에 `사례 연구 - k 문항`, 시나리오, `문항 (i/k)`를 표시한다(기준: `ko-05-q8.png`, `ko-05-q9.png`).
- **설명(Comment) 대화상자**(기준: `ko-04-q1-comment.png`): 여러 줄 입력 칸과 `저장 (S)`, `취소 (C)`가 있다. 저장하면 문항별로 보관된다.
- **플래그**: 토글 방식이고 아이콘 상태가 바뀐다(기준: `ko-04-q1-selected-flagged.png`).

### 5.3 Review 화면 (기준: `ko-06-review.png`)
- 마지막 문항에서 `다음`을 누르면 이 화면이 나온다.
- 툴바에는 `지침 (R)`만 있다. 누르면 지침 대화상자가 뜬다(기준: `ko-06-instructions.png`).
- 탭은 `모두 (N)`, `미완료 (n)`, `지정된 플래그 (n)` 세 개다. 플래그가 0개면 플래그 탭을 숨긴다(영어판 `06-review.png` 참고). 탭을 누르면 목록이 걸러진다(기준: `ko-06-review-incomplete-tab.png`, `ko-06-review-flagged-tab.png`).
- 표의 열은 문항, 제목(`질문`), 상태 알약(`완료` 초록/`미완료` 빨강), 지정된 플래그(`예`+깃발/`아니요`), `검토` 링크다.
- `검토`를 누르면 해당 문항으로 가고, 하단에 `검토 화면 (S)`가 나온다(기준: `ko-06-reviewing-q1.png`). `모두 검토 (A)`는 1번부터 차례로 보여 준다.
- `검토 종료 (E)`를 누르면 확인창이 2단계로 뜬다(기준: `ko-07-end-review-confirm.png`, `ko-07-end-review-confirm2.png`). 메시지는 미완료 수에 따라 getMessages의 `EndReviewPreScore*` 문구를 쓴다. 최종 `예`를 누르면 채점 후 결과 화면으로 간다.

### 5.4 시작 화면 (신규, 데모 안내 화면 `ko-01-welcome.png`의 레이아웃을 따름)
- 본문: 시험 제목, 문항 수, 시간, 그리고 모드 2개(라디오): `시험 모드 (N분, 타이머)`와 `학습 모드 (타이머 없음, 문항별 정답 확인)`. 하단 바 오른쪽에 `다음 (N)`이 있다.
- 저장된 진행 상태가 있으면 Pearson 대화상자(경고 아이콘, `예 (Y)`/`아니오 (N)`)로 "진행 중인 시험이 있습니다. 이어서 진행하시겠습니까?"를 묻는다. `아니오`를 고르면 저장을 지우고 처음부터 시작한다.

### 5.5 학습 모드
- 타이머 영역을 숨긴다(문항 카운터는 유지한다).
- 툴바 오른쪽 플래그 버튼 앞에 `정답 확인 (K)` 버튼이 있다. 아이콘은 스프라이트 `#abe-checkAnswerButton` 위치를 쓴다.
- 문항이 완료 상태일 때만 활성화된다. 누르면 **해설 창**(5.7)이 뜨고, 그 문항의 응답은 잠긴다.
- 흐름은 시험 모드와 같다: 마지막 문항 → Review → 검토 종료 → 결과.

### 5.6 결과 화면 (신규, Review 화면의 디자인 언어를 따름)
- 툴바는 비우고 색상 구성표만 남긴다. 제목은 `시험 결과`다.
- 카드 안에 다음을 보여 준다.
  - 환산 점수 `round(100 + 900 × 정답 수 / 전체)` / 1000
  - 합격 기준 720
  - 결과 알약: `합격` 초록 / `불합격` 빨강(상태 알약과 같은 스타일)
  - 정답 수 `n / N`
  - 소요 시간(시험 모드만)
- 영역별 표:

  | domain | 이름 | 비중 |
  |---|---|---|
  | 1 | 보안 아키텍처 설계 | 30% |
  | 2 | 복원력을 갖춘 아키텍처 설계 | 26% |
  | 3 | 고성능 아키텍처 설계 | 24% |
  | 4 | 비용에 최적화된 아키텍처 설계 | 20% |

  각 영역의 정답률을 보여 주고, 70% 이상이면 `역량 충족`, 미만이면 `개선 필요` 알약을 붙인다.
- 하단 바: 왼쪽에 `오답 해설 (I)`, 오른쪽에 `다시 풀기`와 `처음으로`가 있다.

### 5.7 오답 해설 (채점 후 검토)
- Review 화면과 같은 레이아웃이다. 탭은 `모두`, `잘못된 (n)`(getMessages `IncorrectTab2.0`), `지정된 플래그`다. 상태 알약은 `정답` 초록 / `잘못된` 빨강이다.
- `검토`를 누르면 문항 화면이 읽기 전용으로 열린다. 선택한 답은 유지되고 입력은 막힌다. 툴바의 `해설 (X)`를 누르면 해설 창이 열리며, 문항에 들어갈 때 자동으로도 열린다.
- **해설 창**: English 팝업과 같은 창 스타일이다. 제목은 `해설`이고, 결과(`정답입니다`/`오답입니다`), `정답:`, `내 답:`, 해설(ko)을 보여 준다. 그 아래에 `English` 토글로 펼치는 en 해설이 있다.
  - `explanationSource: "ai"`면 `AI 해설` 배지를 붙인다.
  - `disputed: true`면 `정답 논란` 배지를 붙인다.
  - ordering과 matching은 슬롯이나 prompt별로 정답과 내 답을 나열한다.
- 하단 바에는 `결과 화면`과 `이전`/`다음`이 있다.

### 5.8 저장
- localStorage 키는 `saa-mock:<examId>`다.
- 저장 값: `{mode, index, answers, flags, comments, checked, remainingSec, startedAt, phase}`
- 상태가 바뀔 때마다 저장하고, 타이머는 5초마다 저장한다. 결과를 확정하면 phase를 `result`로 바꿔 저장한다(이어하기 대화상자에서는 결과 화면으로 복귀).

## 6. 테스트 계약

### 6.1 테스트 훅
URL에 `?test=1`이 있으면 `window.__exam`을 노출한다.
- `load(state)`: 저장 형식(5.8)과 같은 객체로 즉시 상태를 바꾸고 다시 그린다.
  - `phase`는 `'start'|'item'|'review'|'result'|'answerReview'` 중 하나다.
  - `index`는 문항 위치(0부터)다.
  - `fromReview: true`면 검토에서 들어온 문항 화면이다.
  - `answers`의 형식: single과 multiple은 `{q1:['A']}`, ordering은 슬롯 순서 배열(빈 슬롯은 `null`), matching은 `{p1:'c2'}`다.
  - `flags`는 `{q1:true}`, `comments`는 `{q1:'...'}`다.
- `setRemaining(sec)`: 남은 시간을 고정하고 카운트다운을 멈춘다.

**접근성 이름은 `capture/aria/ko-*.yml`과 같게 만든다.** 예: 버튼 `다음 (N)`, 탭 `미완료 ( 8 )`, 대화상자 `검토 종료`. 테스트가 역할과 이름으로 요소를 찾는다.

### 6.2 픽셀 비교
`tests/visual.spec.mjs`가 `dist/demo-fixture.html?test=1`을 1920×1080으로 열고, 상태를 맞춘 뒤 `capture/shots/ko-*.png`와 비교한다.
- 남은 시간은 기준 이미지의 `capture/aria/<name>.yml`에서 읽어 `setRemaining`으로 맞춘다.
- 허용 오차는 화면당 `maxDiffPixels 300`, `threshold 0.1`이다(2026-11-02 사용자 승인으로 0.5%에서 강화). 이 값은 사용자 승인 없이 바꾸지 않는다.
- 기준 이미지 갱신(`--update-snapshots`)은 금지한다.

### 6.3 기능 테스트
구현자가 기능마다 `tests/<area>.spec.mjs`를 작성한다. 테스트 제목에는 `[M2-04]` 같은 기능 ID를 넣는다.

### 6.4 실행
`scripts/check.sh M<n>`은 M1부터 M<n>까지 태그된 테스트 전체와 검증, 빌드를 실행한다.

## 7. 덤프 변환 (M4)
`.claude/skills/dump-to-exam/SKILL.md`에 다음 절차를 정의한다.
1. 덤프 원문을 읽는다.
2. 원문 언어를 en에 보존하고 ko로 번역한다.
3. 정답을 옮긴다. 원문 정답이 의심스러우면 `disputed`로 표시한다.
4. 해설을 생성하고 `explanationSource:"ai"`로 표시한다.
5. 도메인 1–4로 분류한다.
6. 65문항으로 `exams/mock-NN.json`을 만든다.
7. `validate` 통과까지 고친다.
8. `build`한다.
