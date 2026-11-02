# Progress

## 2026-11-02 M0 — 캡처와 스펙 (Opus)
- AWS 데모(영어 `demo-test-enu`, 한국어 `demo-test-kor`)를 1920×1080으로 캡처했다. 결과는 `capture/`에 있으며 shots 61장, DOM, styles, aria, raw 리소스, getMessages(ko/en)를 포함한다.
- 데모에는 결과 화면이 없다. 종료하면 Pearson 홈으로 나간다. 그래서 결과 화면, 해설 창, 시작 화면은 새로 디자인한다(spec 5.4–5.7).
- 한국어판의 영어 보기는 문항별 `English` 팝업이다. UI는 한국어로 고정한다.
- 폰트 스택은 Tahoma(en)와 Batang(ko)이다. 이 PC에서는 대체 폰트로 렌더링되지만, 기준 이미지도 같은 PC에서 찍었으므로 비교에는 문제가 없다.
- 하네스를 구성했다: spec, features.json(28개), visual.spec.mjs(18개 기준 이미지), check.sh, guard.mjs, loop.sh.
- 다음 할 일: `./loop.sh M1`부터 시작한다. 첫 기능은 M1-01(자산 추출)이다.
- 확인한 사항: 캡처 DOM을 헤드리스 Chrome으로 다시 렌더링한 결과 `ko-04-q1`이 허용 오차 안에서 일치했다. 픽셀 비교 방식을 쓸 수 있다. 이 PC에서 `Batang`과 `Tahoma`는 fontconfig를 거쳐 `Noto Sans CJK KR`로 렌더링된다. CSS의 font-family는 캡처의 computed 값 그대로 둔다.
