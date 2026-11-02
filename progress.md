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
