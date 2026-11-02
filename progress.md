# Progress

## 2026-11-02 M0 — 캡처와 스펙 (Opus)
- AWS 데모(영어 `demo-test-enu`, 한국어 `demo-test-kor`)를 1920×1080으로 캡처했다. 결과는 `capture/`에 있으며 shots 61장, DOM, styles, aria, raw 리소스, getMessages(ko/en)를 포함한다.
- 데모에는 결과 화면이 없다. 종료하면 Pearson 홈으로 나간다. 그래서 결과 화면, 해설 창, 시작 화면은 새로 디자인한다(spec 5.4–5.7).
- 한국어판의 영어 보기는 문항별 `English` 팝업이다. UI는 한국어로 고정한다.
- 폰트 스택은 Tahoma(en)와 Batang(ko)이다. 이 PC에서는 대체 폰트로 렌더링되지만, 기준 이미지도 같은 PC에서 찍었으므로 비교에는 문제가 없다.
- 하네스를 구성했다: spec, features.json(28개), visual.spec.mjs(18개 기준 이미지), check.sh, guard.mjs, loop.sh.
- 다음 할 일: `./loop.sh M1`부터 시작한다. 첫 기능은 M1-01(자산 추출)이다.
- 확인한 사항: 캡처 DOM을 헤드리스 Chrome으로 다시 렌더링한 결과 `ko-04-q1`이 허용 오차 안에서 일치했다. 픽셀 비교 방식을 쓸 수 있다. 이 PC에서 `Batang`과 `Tahoma`는 fontconfig를 거쳐 `Noto Sans CJK KR`로 렌더링된다. CSS의 font-family는 캡처의 computed 값 그대로 둔다.

## 2026-11-02 M1-01
- `scripts/extract-assets.mjs`를 작성했다. capture/raw의 CSS, 한국어/영어 스프라이트·아이콘을 해시 접미사를 떼고 vendor/로 복사하고, getMessages의 driverProperties를 `strings.ko.json`/`strings.en.json`으로 키 그대로 저장한다.
- `tests/assets.spec.mjs`에 `[M1-01]` 테스트를 추가했고 통과했다. 회귀 검사(passing)도 통과했다.
- 남은 문제: 없음.
- 다음 할 일: M1-02(`scripts/validate.mjs`). exams/sample.json과 demo-fixture.json이 통과해야 한다.

## 2026-11-02 M1-02
- `scripts/validate.mjs`를 작성했다. `validateExam()`을 export하고 CLI로도 쓴다. spec 4절 규칙(필드, id 유일성, answer 참조, select 길이, domain, caseStudy 참조·연속성, ko/en 비어 있지 않음)을 검사하고 `items[3].answer: ...` 형식으로 오류를 모두 출력하며 실패 시 exit 1이다.
- `tests/validate.spec.mjs`에 `[M1-02]` 테스트 2개를 추가했고 통과했다. 회귀 검사(passing)도 통과했다.
- 남은 문제: 없음.
- 다음 할 일: M1-03(`scripts/build.mjs`). template + css + js + vendor 자산(data URI)을 합쳐 dist/demo-fixture.html을 만들고, 빌드 전에 validate를 호출한다.

## 2026-11-02 M1-03
- `scripts/build.mjs`와 `src/{template.html,app.css,app.js}` 골격을 만들었다. 빌드 전에 validate를 호출하고, CSS의 `url(@vendor/경로)`를 data URI로 치환하며, exam JSON과 ko 문자열을 `<script type="application/json">`으로 넣는다.
- `tests/build.spec.mjs`에 `[M1-03]` 테스트 2개를 추가했다(file:// 요청 0건, 잘못된 입력 시 빌드 실패). 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: app.css/app.js는 아직 골격뿐이다.
- 다음 할 일: M1-04(공통 크롬 + single 렌더링, `ko-04-q1` 픽셀 일치). 스프라이트는 `url(@vendor/kor/default.png)`로 참조한다.

## 2026-11-02 M1-04
- `src/app.js`에 상태, 공통 크롬(타이틀 바·타이머·카운터·툴바·하단 바)과 single 렌더링, 테스트 훅(`__exam.load/setRemaining`)을 구현했다. 타이머·카운터 클릭 시 숨김/표시가 동작한다.
- `build.mjs`가 원본 `base.css`/`screen.css`/한국어 스프라이트 CSS를 앞에 붙인다. 스프라이트는 CSS 변수 하나로 data URI를 공유하고(빌드 크기 ~300KB), 나머지 상대 `url()`은 빈 이미지로 바꾼다. 색상 구성표 드롭다운은 jQuery UI 없이 `app.css`에 직접 작성했다.
- 폰트: 이 PC에서 `Batang`만 쓰면 라틴 글자가 serif로 나와 기준과 달랐다. 그래서 `font-family`를 `Batang, "Noto Sans CJK KR", sans-serif`로 지정했다(기준 이미지와 일치).
- `ko-04-q1` 픽셀 테스트와 `tests/chrome.spec.mjs`의 `[M1-04]` 테스트 3개가 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 선택·플래그 상태 반영은 아직 없다(옵션 클릭 이벤트 없음). 플래그 버튼의 선택 상태 아이콘은 M1-05에서 확인한다.
- 다음 할 일: M1-05(응답 선택과 플래그 토글, `ko-04-q1-selected-flagged` 픽셀 일치).

## 2026-11-02 M1-05
- `src/app.js`에 응답 선택(change 이벤트 → `state.answers`, radio는 단일 값, checkbox는 추가/제거)과 플래그 토글(클릭 → `state.flags`, 재렌더)을 구현했다.
- `tests/response.spec.mjs`에 `[M1-05]` 테스트 2개를 추가했다. `ko-04-q1-selected-flagged` 픽셀 테스트는 M1-04 크롬만으로 이미 일치했다. 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: checkbox는 초과 선택을 제한 없이 허용한다(데모와 같은지는 M1-06에서 확인).
- 다음 할 일: M1-06(multiple 문항, `ko-05-q2` 픽셀 일치).

## 2026-11-02 M1-06
- multiple 문항은 M1-04/05에서 만든 렌더링(checkbox)만으로 `ko-05-q2` 픽셀 테스트가 이미 일치했다. 앱 코드는 바꾸지 않았다.
- `tests/multiple.spec.mjs`에 `[M1-06]` 테스트를 추가했다(select개 초과 선택 허용, 해제 시 제거). 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 완료 조건(정확히 select개)은 M2-03에서 구현한다.
- 다음 할 일: M1-07(ordering 문항, `ko-05-q4`, `ko-05-q5` 픽셀 일치, 드롭다운 선택 저장).

## 2026-11-02 M1-07
- `src/app.js`에 ordering 렌더링(보기 글머리표, 슬롯별 드롭다운, `side`에 따른 라벨 위치)과 드롭다운 선택 저장(`state.answers[id]`는 슬롯 순서 배열, 빈 슬롯은 `null`)을 구현했다.
- 드롭다운은 jQuery UI selectmenu 모양의 span 버튼 위에 투명한 `<select>`를 덮는 방식이다. 너비는 숨긴 ghost 텍스트로 가장 긴 보기에 맞춘다. 화살표는 CSS 삼각형이다.
- `ko-05-q4`, `ko-05-q5` 픽셀 테스트와 `tests/ordering.spec.mjs`의 `[M1-07]` 테스트 2개가 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 네이티브 `<select>` 목록이 열린 모양은 기준(jQuery UI 메뉴)과 다르다. 기준 이미지가 없어 픽셀 비교 대상은 아니다.
- 다음 할 일: M1-08(matching 문항, `ko-05-q6`, `ko-05-q7` 픽셀 일치). 드롭다운 컴포넌트(`slotSelect`)를 재사용할 수 있다.

## 2026-11-02 M1-08
- `src/app.js`에 matching 렌더링(범주 글머리표 + prompt 라벨 + 드롭다운)과 선택 저장(`state.answers[id]`는 `{promptId: choiceId}`, 빈 값 선택 시 키 삭제)을 구현했다. `slotSelect`는 aria 라벨을 인자로 받게 바꿔 재사용한다.
- 기준 DOM에 맞추려고 첫 행 위 여백을 없애고 라벨–드롭다운 간격을 `&nbsp;&nbsp; `로 했다. `ko-05-q6`, `ko-05-q7` 픽셀 테스트와 `tests/matching.spec.mjs`의 `[M1-08]` 테스트 2개가 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 없음. 개별 `playwright test`는 dist를 미리 빌드해야 한다(check.sh는 자동 빌드).
- 다음 할 일: M1-09(case study 머리말, `ko-05-q8`, `ko-05-q9` 픽셀 일치).

## 2026-11-02 M1-09
- `src/app.js`의 `itemBody`에 case study 머리말을 추가했다. `caseStudy`가 있는 문항은 `사례 연구 - k 문항`(h1), 시나리오, `문항 (i/k)`(h2)를 문항 본문 위에 표시한다. k와 i는 같은 caseStudy 문항 묶음에서 계산한다.
- CSS는 바꾸지 않았다. 원본 base.css의 h1/h2 스타일로 `ko-05-q8`, `ko-05-q9` 픽셀 테스트가 바로 일치했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 없음. features.json steps가 픽셀 비교뿐이라 별도 spec 파일은 만들지 않았다.
- 다음 할 일: M1-10(English 팝업, `ko-04-q1-english` 픽셀 일치, 닫기 X로 닫힘).

## 2026-11-02 M1-10
- `src/app.js`에 English 팝업을 구현했다. `English` 버튼이 `state.english`를 켜고, jQuery UI dialog 마크업(제목 `English`, 닫기 X, 영어 stem과 `A. ...` 보기)을 앱 위에 띄운다. 닫기 X를 누르거나 다른 문항으로 이동하면 닫힌다.
- `app.css`에 팝업 스타일(960px 폭, 가운데 정렬, 제목줄 44px, 본문 488px)을 추가했다. 기준 DOM의 좌표(`capture/styles`)와 diff 이미지를 보며 간격을 맞췄다.
- `ko-04-q1-english` 픽셀 테스트와 `tests/english.spec.mjs`의 `[M1-10]` 테스트 2개가 통과했고 회귀 검사(passing)도 통과했다.
- 남은 문제: 팝업을 드래그/크기 조절하는 기능은 없다(스펙에 없음).
- 다음 할 일: M1-11(설명 대화상자, `ko-04-q1-comment` 픽셀 일치, 저장 시 문항별 보관, 취소 시 변경 폐기). 팝업 CSS를 참고할 수 있다.

## 2026-11-02 M1-11
- `src/app.js`에 설명(Comment) 대화상자를 구현했다. 툴바 `설명 (M)`이 `state.commentOpen`을 켜고, 제목줄(아이콘+`설명`), textarea, `저장 (S)`/`취소 (C)` 버튼을 앱 위에 띄운다. 저장하면 `state.comments[id]`에 보관(빈 값이면 삭제)하고, 취소하면 폐기한다. 다른 문항으로 이동하면 닫힌다.
- TinyMCE 대신 textarea를 같은 테두리(1px #ccc, 반경 10px)의 상자에 넣었다. `app.css`에 대화상자 스타일(폭 633.6px, 내용 높이 227.85px)을 추가했다.
- `ko-04-q1-comment` 픽셀 테스트가 처음부터 일치했고, `tests/comment.spec.mjs`의 `[M1-11]` 테스트 2개도 통과했다. 회귀 검사(passing)도 통과했다.
- 남은 문제: Esc로 닫기와 드래그/크기 조절은 없다(스펙에 없음).
- 다음 할 일: M1-12(색상 구성표 드롭다운 12항목, Alt+N/P/F/M accesskey, `[M1-12]` 테스트 작성).

## 2026-11-02 M1-12
- `src/app.js`에 색상 구성표 드롭다운을 구현했다. 버튼을 누르면 12항목 목록(라벨은 `strings.ko.json`)이 열리고, 항목을 고르거나 바깥을 누르면 닫힌다. 기본 테마만 동작하므로 버튼 글자는 `색상 구성표`로 유지된다.
- Playwright 합성 키 입력으로는 브라우저 기본 accesskey가 발동하지 않았다. 그래서 keydown에서 Alt+글자를 직접 처리해 `button[accesskey]`를 클릭하고 기본 동작은 막았다(이중 실행 방지).
- `tests/scheme.spec.mjs`의 `[M1-12]` 테스트 2개와 회귀 검사(passing)가 통과했다. 기존 픽셀 테스트에는 영향이 없었다.
- 남은 문제: 목록의 키보드 탐색(화살표)은 없다. 실제 브라우저에서 Alt+글자를 직접 눌러 본 검증은 못 했다.
- 다음 할 일: M1 게이트(`scripts/check.sh M1`) 확인 후 M2-01(이전/다음 탐색, 마지막 문항 다음 → Review).

## 2026-11-02 M1 검증 (Opus) — 픽셀 기준 강화, M1-04~M1-11 재오픈
- `check.sh M1`은 32/32 통과했고 guard도 이상 없었다. 하지만 허용 오차 0으로 측정하면 화면마다 구조적 차이가 남아 있었다. 원본과 일치하는 영역(타이틀 바, 지문)은 차이가 0이다. 즉 번짐 노이즈는 없고 남은 차이는 모두 구조 문제다.
- 사용자 승인을 받아 허용 오차를 `maxDiffPixelRatio 0.005`에서 **화면당 `maxDiffPixels 300`**으로 바꿨다. 이에 따라 M1-04~M1-11을 다시 `passes:false`로 돌렸다.
- 측정 당시 차이(px): q1 1463, q1-selected-flagged 1479, q2 2321, q4 6098, q5 3283, q6 5605, q7 9227, q8 7618, q9 6275, english 8530, comment 5771
- 확인된 원인. 모든 화면에서 `test-results/**/*-diff.png`로 확인할 것.
  1. 하단 바 `이전 (P)`, `다음 (N)` 버튼의 폭과 x 위치가 다르다. 원본 이전 버튼은 약 98px이고 현재는 93px이다. 원본 다음 버튼은 약 104px이고 현재는 97px이다. padding과 아이콘 간격은 `capture/styles/ko-05-q7.json`을 기준으로 맞춘다.
  2. 라디오 버튼의 모양과 크기가 다르다. 원본 DOM(`capture/dom/ko-04-q1.html`)의 input 마크업과 스타일을 확인한다.
  3. 마지막 보기(D) 줄이 1px 정도 아래로 밀렸다. 보기 사이 간격이 누적되면서 생긴 오차다.
  4. 드롭다운(ordering, matching): `선택…` 글자의 기준선이 원본보다 높고, ▼ 화살표가 원본보다 작고 가늘다(원본은 굵은 화살표). 행 간격은 맞다.
  5. English 팝업: 본문 글자 전체가 1px 어긋나 있다. 제목 아이콘과 닫기 X도 다르다.
  6. 설명 대화상자: textarea 테두리, `저장`/`취소` 버튼 위치, 대화상자 아래쪽 경계가 1–2px 다르다.
  7. 색상 구성표 드롭다운의 ▼ 화살표 몇 픽셀이 다르다.
- 다음 할 일: 위 1·4번은 공통 요소라 고치면 여러 화면이 함께 좋아진다. M1-04부터 순서대로 진행한다.

## 2026-11-02 M1-04 (재오픈 후 수정)
- 옵션 행 CSS를 원본 좌표에 맞췄다. 라디오 컨테이너를 2px 올리고 label에 margin-top 2px, input 상단 마진을 4.5px로 조정했다. 마지막 보기(D)의 글자와 텍스트는 원본처럼 2px 위로 올렸다. `#abe-navigation-jump`에 padding-right 10px을 줘서 다음 버튼 x 위치를 원본(1821)과 맞췄다.
- `ko-04-q1`은 1463px에서 허용 오차 이내로 줄었고, `[M1-04]` 테스트 4개와 회귀 검사(passing)가 통과했다.
- 남은 문제: M1-05~M1-11 픽셀 테스트는 아직 실패한다(ko-05-q2~q9 등). 같은 크롬을 쓰는 M1-05는 이번 수정으로 통과하는 것을 확인했다. ordering/matching 드롭다운(▼ 화살표, 글자 기준선), English 팝업, 설명 대화상자는 위 검증 기록의 4~6번 원인이 남아 있다.
- 다음 할 일: M1-05를 확인하고 passes를 true로 바꾼다. 그다음 M1-06부터 진행한다.

## 2026-11-02 M1-05 (재검증)
- M1-04 수정(옵션 행·하단 바 좌표)으로 `ko-04-q1-selected-flagged` 픽셀 테스트가 허용 오차(300px) 이내로 들어왔다. 코드 변경 없음.
- `[M1-05]` 테스트 3개와 회귀 검사(passing)가 통과해 passes를 true로 바꿨다.
- 남은 문제: M1-06~M1-11 픽셀 테스트는 재오픈 상태다(드롭다운, English 팝업, 설명 대화상자 원인 남음).
- 다음 할 일: M1-06(`ko-05-q2` 픽셀 일치)부터 진행한다.

## 2026-11-02 M1-06 (재오픈 후 수정)
- `ko-05-q2` 차이는 하단 바의 이전/다음 버튼 x 위치(약 1.67px)가 원인이었다. 이전 버튼 래퍼에 원본처럼 `padding-left:5px`를 주고, 이전 버튼이 있을 때만 `#abe-navigation-jump.abe-has-prev`의 padding-right를 8.33px로 줄였다(원본 prev 1720, next 1823).
- `[M1-06]` 테스트 2개와 회귀 검사(passing)가 통과해 passes를 true로 바꿨다.
- 남은 문제: 체크박스 모양(diff에서 빨간 표시)은 허용 오차 이내라 그대로 뒀다. M1-07~M1-11 픽셀 테스트는 재오픈 상태다.
- 다음 할 일: M1-07(ordering, `ko-05-q4`, `ko-05-q5`). 이전 버튼 위치는 이번 수정으로 개선됐을 것이다.

## 2026-11-02 M1-07 (재오픈 후 수정)
- 드롭다운을 원본에 맞췄다. ▼를 `contrastDownArrow.png`로 바꾸고, ghost를 텍스트 앞에 둬서 baseline을 원본처럼 맞췄다(라벨 위치 해결). 슬롯 버튼은 `top: 2.3px`로 내려 테두리 행(435~459)을 맞췄고, 버튼 너비는 render 후 올림(ceil)한다.
- `ko-05-q4`, `ko-05-q5` 픽셀 테스트와 `[M1-07]` 테스트 4개, 회귀 검사(passing)가 통과해 passes를 true로 바꿨다.
- 남은 문제: M1-08(`ko-05-q6`, `ko-05-q7`)은 같은 드롭다운을 쓰므로 많이 줄었을 것이다. 확인 필요. M1-09~M1-11은 재오픈 상태다.
- 다음 할 일: M1-08. 개별 playwright 실행 전에 `node scripts/build.mjs exams/demo-fixture.json`으로 dist를 다시 빌드한다.

## 2026-11-02 M1-08 (재오픈, 실패)
- 시도 전 상태: `ko-05-q6` 714px, `ko-05-q7` 546px로 허용 오차(300px)를 넘는다. diff 원인은 (a) 드롭다운 4·5행의 버튼 테두리가 기준보다 1px 아래, (b) 마지막 행 라벨 글자 1px 차이, (c) 하단 이전/다음 버튼 글자 미세 차이다.
- 기준 `capture/styles/05-q6.json`에서 버튼 top은 220/271/321/372/423(간격 51,50,51,51)이고 라벨 span은 222/273/324/375/426(간격 51)이다. 즉 버튼만 약 50.75px 간격이다.
- 시도 3회, 모두 악화해서 되돌렸고 코드는 변경 없다. matching gap을 23.75px로 줄이기(q6 942px), 23.55px로 줄이기(q6 2365px), 3행 이후 버튼 `top`을 1px 올리기(q6 1397px, q7 1691px).
- BLOCKED: M1-08 — 버튼과 라벨이 서로 다른 소수 간격으로 배치된 것으로 보이며, 행 단위 CSS 보정으로는 반올림이 맞지 않는다. 원본 문단(`p`)/span 구조와 line-height를 `capture/dom/05-q6.html`에서 그대로 따라야 할 가능성이 크다.
- 다음 할 일: M1-09 이후를 먼저 진행한다. M1-08은 DOM 구조를 원본 그대로 복제하는 방식으로 재도전한다.

## 2026-11-02 M1-09 (재오픈, 중단)
- 시도 전 상태: `ko-05-q8` 6603px, `ko-05-q9` 5228px로 허용 오차(300px)를 넘는다. 머리말(h1/h2)과 지문은 일치하고, 차이는 보기 행 간격이다(기준 46px, 현재 70px).
- 원인: 기준 DOM에서 보기 글자 셀의 두 번째 `<p>`(탭 줄)는 보기마다 있기도 하고 없기도 하다. `ko-04-q1`, `ko-05-q2`는 모든 보기에 있고(행 높이 48px), `ko-05-q8`은 모든 보기에 없으며(24px), `ko-05-q9`는 C에만 있다. 현재 `optionRow`는 항상 탭 줄을 넣고 `.abe-opt-letter`의 높이를 48px로 고정한다.
- QUESTION: 탭 줄 유무는 원본 데이터의 특성이라 fixture에 표현할 필드가 없다. `caseStudy` 문항은 탭 줄을 빼는 규칙으로 q8은 맞출 수 있지만, q9의 C 하나는 맞지 않는다. 보기별 선택 필드(예: `options[].tab: true`)를 스펙에 추가할지, `caseStudy` 규칙만 쓰고 q9 허용 오차를 따로 정할지 결정이 필요하다. 스펙(`docs/spec.md`) 변경은 하네스 소유라 이번 실행에서 하지 않았다.
- 코드 변경 없음. 다음 할 일: 위 QUESTION이 정해지면 M1-09를 이어서 진행한다. M1-08은 BLOCKED 상태라 M1-10, M1-11도 같은 방식으로 상태를 확인한다.

## 2026-11-02 M1-10 (재오픈 후 수정)
- English 팝업을 원본 좌표에 맞췄다. 대화상자 padding을 3px로(내용 x=480), 본문 상단 padding 35px, 첫 보기 margin-top 23px(p 마진 16px과 겹침 주의)로 stem/보기 글자가 원본 y(353/501)와 일치한다. 제목줄에 하단 1px 흰 선을 넣고 제목을 1.6px 내렸다.
- 닫기 버튼은 "Close" 글자가 새어 보이고 아이콘이 없었다. 버튼 글자를 숨기고(`font-size:0`) `ui-icon`을 스프라이트(`.ui-widget-header .ui-icon`)로 원본 위치에 그렸다.
- `[M1-10]` 테스트 3개(픽셀 1 + english.spec 2)와 회귀 검사(passing)가 통과해 passes를 true로 바꿨다.
- 남은 문제: M1-08은 BLOCKED, M1-09는 QUESTION 대기(탭 줄 유무 결정 필요), M1-11은 재오픈 상태.
- 다음 할 일: M1-11(`ko-04-q1-comment` 픽셀, textarea 테두리·저장/취소 버튼 위치·아래 경계 1–2px 차이).

## 2026-11-02 M1-11 (재오픈 후 수정)
- `ko-04-q1-comment` 차이 4297px를 허용 오차 이내로 줄였다. 제목줄에 하단 1px 흰 선을 넣어 textarea 상단 y를 423으로 맞췄고, 버튼 아래 마진을 없애 버튼 영역 높이(43.59px)와 대화상자 높이(324px)를 기준과 맞췄다.
- 저장/취소 버튼은 높이를 27.6px로 고정하고 padding을 `0 10px 3px 12px`로 줘서 상자 테두리와 글자 위치를 맞췄다(버튼 내용은 세로 중앙 정렬이라 위쪽 padding만으로는 글자가 거의 안 움직인다).
- `[M1-11]` 테스트 3개(픽셀 1 + comment.spec 2)와 회귀 검사(passing)가 통과해 passes를 true로 바꿨다.
- 남은 문제: M1-08은 BLOCKED, M1-09는 QUESTION 대기. 기준 하단 오른쪽의 리사이즈 그립 아이콘은 아직 그리지 않았다(허용 오차 이내).
- 다음 할 일: M1-08/M1-09 결정 대기. 둘이 풀리면 `scripts/check.sh M1` 게이트를 확인하고 M2-01로 간다.

## 2026-11-02 M1 (진행 불가 확인)
- `scripts/check.sh passing` 26/26 통과(회귀 없음). M1에서 `passes:false`로 남은 항목은 M1-08, M1-09 둘뿐이다.
- M1-08은 3회 시도 후 BLOCKED 상태라 재도전하지 않았다. M1-09는 탭 줄 유무에 대한 QUESTION이 아직 답변되지 않아 추측으로 구현하지 않았다. 코드 변경 없음.
- 다음 할 일: 사람이 M1-09 QUESTION(보기별 `tab` 필드 추가 vs `caseStudy` 규칙 + q9 허용 오차)을 결정한다. M1-08은 `capture/dom/05-q6.html`의 p/span 구조를 그대로 복제하는 방식으로 재도전한다.

## 2026-11-02 M1-08 (재도전, 중단)
- 원본 DOM(`capture/dom/ko-05-q6.html`)을 확인했다. 각 행은 `<p><span style="font-family:batang;font-size:12pt">라벨&nbsp;&nbsp;&nbsp;<드롭다운></span></p>`이고 행 사이에 `<p><span>&nbsp;</span></p>` 빈 행이 있다. 현재는 div(`.abe-slot`)와 24px 고정 gap이다.
- `.abe-slot` min-height를 26.75px로 바꿔 행 pitch를 50.75px에 맞춰 봤으나 q6 942px, q7 1650px로 악화해 되돌렸다(기준선 q6 714, q7 546). 코드 변경 없음.
- BLOCKED: M1-08 — CSS 수치 조정만으로는 안 된다. 원본처럼 p/span 구조와 글꼴·line-height 상속까지 맞춰야 하는데, 이는 통과 중인 ordering(M1-07) 레이아웃에도 영향을 준다. 회귀 검사와 함께 별도 실행에서 진행해야 한다.
- 남은 항목: M1-08(BLOCKED), M1-09(QUESTION 대기). 다음 할 일: 사람이 M1-09 결정을 내리거나 M1-08 구조 변경 방침을 승인한다.

## 2026-11-02 M1 (진행 불가 재확인)
- `scripts/check.sh passing` 26/26 통과(회귀 없음). M1의 `passes:false`는 M1-08(BLOCKED)과 M1-09(QUESTION 대기)뿐이다.
- M1-08은 직전 실행에서 재도전해 중단했고, M1-09는 사람의 결정이 없어 추측 구현하지 않았다. 코드 변경 없음.
- 다음 할 일: 사람이 M1-09 QUESTION(보기별 `tab` 필드 vs `caseStudy` 규칙 + q9 허용 오차)과 M1-08의 p/span 구조 변경 방침을 결정한다. 그 뒤 `scripts/check.sh M1` 게이트 확인 후 M2-01로 간다.

## 2026-11-02 M1 결정 (Opus) — M1-08, M1-09 재개
- RESOLVED: M1-09 — 사용자 결정에 따라 보기별 표시 힌트 `options[].compact`(기본 false)를 스펙 4절에 추가했다. 기본 보기 행은 보기 글자 셀 안에 빈 문단이 하나 더 있는 원본 구조(48px)다. `compact:true`면 빈 문단을 넣지 않는다(24px). `exams/demo-fixture.json`에는 이미 반영했다(q8은 모든 보기, q9는 A·B·D). `scripts/validate.mjs`는 이 필드를 받아들이고, 값이 있으면 bool인지 검사하게 고친다(`[M1-02]` 테스트 유지).
- RESOLVED: M1-08 — 플래너 승인. ordering과 matching 행을 원본 DOM(`capture/dom/ko-05-q6.html`, `ko-05-q4.html`)처럼 `<p><span style="font-family:batang;font-size:12pt">라벨&nbsp;&nbsp;&nbsp;<드롭다운></span></p>` 구조로 바꾸고, 행 사이에는 `<p><span>&nbsp;</span></p>` 빈 행을 넣는다. 고정 gap과 min-height 보정은 버린다. M1-07(`ko-05-q4`, `ko-05-q5`)이 회귀 검사에서 계속 통과해야 한다. M1-07의 원본 구조도 같다면 함께 옮긴다.
- 하네스 변경: 남은 항목이 모두 BLOCKED 또는 QUESTION이면 에이전트가 `NO-ACTIONABLE-FEATURE`를 출력하고, 루프는 그 자리에서 대기 상태로 멈춘다(지난 실행에서는 반복 4회를 이 확인에만 썼다).

## 2026-11-02 M1-08 (RESOLVED 방침대로 p/span 구조 복제)
- ordering/matching 행을 원본처럼 `<p><span>라벨&nbsp;…<드롭다운></span></p>` + `<p><span>&nbsp;</span></p>` 빈 행으로 바꿨다(`slotP`). 고정 gap/min-height는 버렸다. 라벨 글꼴은 상속(Batang → Noto Sans CJK KR)이어야 원본 글자 폭과 맞는다(`font-family:batang` 단독이면 폭이 틀어진다).
- 행 pitch 50.75px는 p line-height(행 27.375, 빈 행 23.45)로, 시작 소수 위치는 choice-list margin과 첫 행 `top` 보정으로 맞췄다. 소수 보정값은 0.1px 단위 스윕으로 찾았다.
- `[M1-08]` 4개, M1-07 픽셀(q4, q5) 포함 `scripts/check.sh passing` 26/26 통과 후 passes=true.
- 남은 문제: M1-09(q8, q9)는 RESOLVED된 `options[].compact` 구현이 남았다.
- 다음 할 일: M1-09. `compact:true`면 보기 글자 셀의 빈 문단을 빼고, validate.mjs가 bool 검사를 하게 한다.

## 2026-11-02 M1-09 (compact 구현)
- `options[].compact:true`면 보기 글자 셀의 빈 탭 문단을 빼고 `.abe-compact`(높이 24px)를 붙인다(`optionRow`). `validate.mjs`는 `compact`가 있으면 bool인지 검사한다.
- 체크박스는 원본 마진(`3.5px 3px 3px 4px`)으로 맞췄다(q8 461px 해결). 탭 줄 보기 바로 뒤에 compact 보기가 오면 행 간격이 10px 줄어드는 원본 동작(q9의 C→D)을 CSS `:has` 규칙으로 재현했다. 이 규칙은 캡처에서 추정한 것이다.
- `[M1-09]` 2개, `[M1-02]`, 회귀 검사(passing) 30/30 통과 후 passes=true. M1 항목이 모두 끝났다.
- 다음 할 일: `scripts/check.sh M1` 게이트 확인 후 M2-01로 진행한다.

## 2026-11-02 M2-01
- 마지막 문항에서 `다음 (N)` 클릭 시 `state.phase`를 `'review'`로 전환하고 Review 화면 기본 크롬(검토 제목, `지침 (R)`, `검토 종료 (E)`, 문제 카운터 숨김)을 렌더링하게 구현했다.
- `tests/navigation.spec.mjs`에 `[M2-01]` 테스트 2개(이전/다음 이동, 마지막 문항 다음 → Review)를 추가하고 회귀 검사(34/34) 통과 후 `passes: true`로 변경했다.
- 남은 문제: Review 화면의 본문 표·탭 필터 및 픽셀 일치는 M2-02에서 구현해야 한다.
- 다음 할 일: M2-02(`Review 화면과 탭 필터`, `ko-06-review`, `ko-06-review-incomplete-tab`, `ko-06-review-flagged-tab` 픽셀 일치)를 진행한다.

## 2026-11-02 M2-02
- `capture/dom/ko-06-review*.html`과 `startDelivery` 테마 CSS를 근거로 `.abe-reviewScreen-2-0`의 3개 탭(모든 질문/미완료 질문/지정된 플래그), 상단 검토 버튼, 2열 표(Flag/Name/Status), 툴팁 포커스/호버 표시, 플래그 0개일 때 플래그 탭 숨김(`style="display:none"`)을 구현했다.
- `src/app.css`에 Review용 CJK 글꼴 폴백(`"Noto Sans CJK KR"`), `.abe-reviewItemEntry { border-color: #C0C0C0; }`, `button:where(.abe-reviewScreen-2-0 .ui-button)` 기본 스타일을 추가하여 `ko-06-review`, `ko-06-review-incomplete-tab`, `ko-06-review-flagged-tab` 픽셀 테스트 3개와 `tests/review.spec.mjs` 테스트 2개 및 회귀 검사(39/39)를 모두 통과했다.
- 남은 문제: Review 화면에서 문항이나 상단 검토 버튼을 클릭했을 때의 검토 대기열 이동 동작은 M2-04~M2-06에서 구현해야 한다.
- 다음 할 일: M2-03(`유형별 완료 판정(미완료 수)` 경계값 테스트)을 진행한다.

## 2026-11-02 M2-03
- `src/app.js`의 `isComplete(item)`에서 `single`·`multiple` 배열 원소가 비어 있지 않은지 함께 검사하도록 보강했다.
- `tests/review.spec.mjs`에 `[M2-03]` 테스트를 추가해 5가지 유형(`single`, `multiple`, `ordering`, `matching`, `caseStudy`)의 무응답·부분 응답·초과 선택·정확한 완료 조건과 미완료 수(`#IncompleteCount`) 및 미완료 0개일 때 빈 목록 문구를 검증했고 회귀 검사(40/40)를 통과했다.
- 남은 문제: Review 화면에서 `검토` 버튼·`모두 검토 (A)` 클릭 시 문항 이동 및 `검토 화면 (S)` 복귀 동작은 아직 없다.
- 다음 할 일: M2-04(`검토로 문항 이동, 검토 화면 복귀, 모두 검토`, `ko-06-reviewing-q1` 픽셀 일치)를 진행한다.

## 2026-11-02 M2-04
- Review 화면에서 행의 `검토` 버튼(`.abe-reviewItemBtn`), `모두 검토 (A)`(`#abe-ReviewAllButton`), `미완료된 질문 검토 (I)`, `플래그가 지정된 부분 검토 (V)` 클릭 시 `state.fromReview = true`로 해당 문항 화면으로 이동하고 하단 바 왼쪽에 `검토 화면 (S)`(`#abe-ReviewScreenButton`)를 렌더링하도록 구현했다.
- `검토 화면 (S)` 클릭 시 Review 화면으로 복귀하고, `[M2-04]` 픽셀 테스트(`ko-06-reviewing-q1`)와 기능 테스트(`tests/review.spec.mjs`) 및 회귀 검사(42/42)를 통과해 `passes: true`로 변경했다.
- 남은 문제: Review 툴바의 `지침 (R)` 대화상자와 `검토 종료 (E)` 2단계 확인 대화상자는 아직 구현되지 않았다.
- 다음 할 일: M2-05(`지침 대화상자`, `ko-06-instructions` 픽셀 일치)를 진행한다.

## 2026-11-02 M2-05
- Review 툴바의 `지침 (R)`(`#abe-ReviewInstructionsButton`) 클릭 시 `capture/dom/ko-06-instructions.html` 마크업과 `strings.ko.json`의 `ReviewScreenInstructions2.0` 문자열로 지침 대화상자(`.abe-ReviewInstructionsDialog`)를 띄우고 `닫기 (C)`(`#Close`)로 닫히게 구현했다.
- `src/app.css`에 `.abe-ReviewInstructionsDialog`의 패딩·테두리, 제목줄 하단 1px 흰 테두리·제목 폰트(`22.38px`, `700`), 버튼 여백 스타일을 추가해 `[M2-05]` 픽셀 테스트(`ko-06-instructions`)와 기능 테스트(`tests/review.spec.mjs`) 및 회귀 검사(44/44)를 통과하고 `passes: true`로 변경했다.
- 남은 문제: Review 하단 바의 `검토 종료 (E)` 2단계 확인 대화상자는 아직 구현되지 않았다.
- 다음 할 일: M2-06(`검토 종료 2단계 확인`, `ko-07-end-review-confirm`, `ko-07-end-review-confirm2` 픽셀 일치, 미완료 0개일 때 문구 변형)을 진행한다.

## 2026-11-02 M2-06
- Review 하단 바의 `검토 종료 (E)`(`#abe-EndReviewButton`) 클릭 시 미완료 문항 수에 따라 `EndReviewPreScoreIncompleteItems1/2`, `EndReviewPreScoreIncompleteItem1/2`, `EndReviewPreScoreCompleteItems1/2` 문자열로 2단계 확인 대화상자(`.abe-end-review-dialog`)와 투명 모달 오버레이(`.ui-widget-overlay`)를 렌더링하고 최종 `예 (Y)` 클릭 시 `phase = 'result'`로 전환하게 구현했다.
- 원본 `DialogFactory.buildDialogMessageHtml`과 동일하게 `<p class="abe-messageText">` 생성 후 내부에 `<div><p>…</p></div>`를 주입하여 `p:not(:empty)` 및 빈 문단 여백 규칙이 그대로 적용되게 했고, `[M2-06]` 픽셀 테스트 2개(`ko-07-end-review-confirm`, `ko-07-end-review-confirm2`)와 기능 테스트(`tests/review.spec.mjs`) 및 회귀 검사(47/47)를 통과해 `passes: true`로 변경했다.
- 남은 문제: 타이머 카운트다운 만료 시 자동 결과 전환과 채점/결과 화면 본문은 아직 구현되지 않았다.
- 다음 할 일: M2-07(`타이머 카운트다운과 시간 종료 시 결과 화면`)을 진행한다.




## 2026-11-02 M2-07
- 시험 모드(`mode === 'exam'`)의 문항(`item`)·검토(`review`) 화면에서 매초 `remainingSec`이 감소할 때 `#timeRemaining`과 `#accessibleTimerText`를 함께 갱신하고, 남은 시간이 0이 되면 열린 대화상자를 닫고 즉시 `phase = 'result'` 결과 화면으로 전환하도록 `tick()`을 보강했다.
- `tests/timer.spec.mjs`에 `[M2-07]` 테스트 2개를 작성해 문항 화면과 Review/대화상자 열림 상태에서 매초 카운트다운 및 0초 도달 시 결과 화면 자동 전환을 검증했고 회귀 검사(49/49)를 통과해 `passes: true`로 변경했다.
- 남은 문제: 시작 화면(모드 선택)과 채점/결과 화면 상세 UI, localStorage 자동 저장/이어하기가 아직 구현되지 않았다.
- 다음 할 일: M2-08(`시작 화면(모드 선택)`)을 진행한다.

## 2026-11-02 M2-08
- 초기 화면(`phase = 'start'`)에서 데모 안내 화면(`ko-01-welcome`) 레이아웃을 따라 시험 제목, 문항 수, 시험 시간과 2가지 모드 라디오(`시험 모드 (N분, 타이머)`, `학습 모드 (타이머 없음, 문항별 정답 확인)`) 및 하단 `다음 (N)` 버튼을 렌더링하고, `다음 (N)` 클릭 시 선택한 모드로 1번 문항에 진입하도록 구현했다.
- `tests/start.spec.mjs`에 `[M2-08]` 테스트 2개를 작성해 시험/학습 모드 선택 후 1번 문항 진입 및 타이머 표시/숨김 동작을 검증했고, 회귀 검사(51/51)를 통과해 `passes: true`로 변경했다.
- 남은 문제: 채점 및 결과 화면 상세 UI(환산 점수, 합격 여부, 영역별 표)와 localStorage 자동 저장/이어하기 대화상자가 아직 구현되지 않았다.
- 다음 할 일: M2-09(`채점과 결과 화면(환산 점수, 합격 여부, 영역별 표)`)을 진행한다.

## 2026-11-03 M2-09
- 문항 유형별(single, multiple, ordering, matching) 부분 점수 없는 채점 함수(`isCorrect`)와 결과 화면(`resultBody`)을 구현하여 환산 점수(`round(100 + 900 × 정답 수 / 전체)` / 1000), 합격 기준(720), 합격/불합격 상태 알약, 정답 수, 소요 시간(시험 모드만), 4개 영역별 비중·정답률·70% 기준 역량 충족/개선 필요 알약 표, 하단 바(`오답 해설 (I)`, `다시 풀기`, `처음으로`)를 렌더링하도록 했다.
- `tests/result.spec.mjs`에 `[M2-09]` 테스트 3개(정답 전체 입력 시 1000점 합격, 무응답 시 100점 불합격, 문항 단위 채점 및 영역별 정답률·학습 모드 소요 시간 숨김)를 작성해 검증했고 회귀 검사(54/54)를 통과해 `passes: true`로 변경했다.
- 남은 문제: localStorage 자동 저장과 시작 화면 이어하기 대화상자가 아직 구현되지 않았다.
- 다음 할 일: M2-10(`localStorage 자동 저장과 이어하기 대화상자`)을 진행한다.
