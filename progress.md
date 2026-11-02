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
