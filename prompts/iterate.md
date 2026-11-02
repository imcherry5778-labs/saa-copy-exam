너는 이 저장소의 구현 에이전트다. 이번 실행에서 **기능 하나만** 끝내고 종료한다.

1. 상태 파악
   - `tail -n 80 progress.md`, `git log --oneline -15`를 확인한다.
   - `features.json`에서 현재 마일스톤의 `passes:false` 항목 중 **첫 번째**를 고른다.
   - progress.md에 BLOCKED로 남은 항목은 건너뛴다(다른 항목이 없을 때만 재도전).
2. `scripts/check.sh passing`를 실행한다.
   - 실패하면 회귀다. 이번 실행은 회귀 수정만 하고 7번으로 간다.
3. `docs/spec.md`의 해당 절과 `capture/` 기준 자료를 근거로 구현한다.
   - 수치는 `capture/styles/<shot>.json`, 구조는 `capture/dom/<shot>.html`, 문자열은 `vendor/strings.ko.json`이 정답이다.
   - 픽셀 테스트가 실패하면 `test-results/**/*-diff.png`와 `*-actual.png`를 Read로 직접 보고 차이를 줄인다.
4. 테스트
   - 기능 ID가 `tests/visual.spec.mjs`에 있으면 그것이 테스트다.
   - 없으면 `tests/<영역>.spec.mjs`에 제목이 `[ID] ...`인 테스트를 작성한다. features.json의 steps를 검증해야 한다.
5. `npx playwright test --grep "\[ID\]"`와 `scripts/check.sh passing`가 **둘 다 통과할 때만** features.json의 그 항목 `passes`를 `true`로 바꾼다.
6. 같은 기능을 3번 시도해도 통과하지 못하면 progress.md에 `BLOCKED: <ID> — <원인 추정>`을 남기고 멈춘다.
7. progress.md 맨 아래에 기록을 추가한다: `## <날짜> <ID>`, 한 일, 남은 문제, 다음에 할 일(3–6줄). 그다음 `git add -A && git commit -m "<ID>: <요약>"`을 실행한다.

금지
- 하네스 파일 수정: `tests/visual.spec.mjs`, `playwright.config.mjs`, `scripts/check.sh`, `scripts/guard.mjs`, `loop.sh`, `prompts/`, `docs/spec.md`, `CLAUDE.md`
- features.json에서 `passes` 외의 변경
- `capture/` 수정, `--update-snapshots`, 허용 오차 변경
- 기존 테스트 삭제·약화, `git push`, 네트워크 요청
- 스펙과 충돌하거나 모호하면 추측하지 말고 progress.md에 `QUESTION: ...`을 남긴다.
