# saa-copy-exam

Pearson VUE AWS 시험 데모(한국어판)를 픽셀 단위로 복제한 단일 HTML 모의고사 템플릿이다. 스펙은 `docs/spec.md`이고, 진행 상황은 `features.json`과 `progress.md`에 있다.

## 규칙
- 사용자와는 한국어로 대화한다.
- 런타임 의존성이 없는 vanilla JS로 작성한다. 빌드 결과물은 네트워크 요청이 없는 HTML 파일 하나다.
- `capture/`, `vendor/`, `dist/`, `exams/*.json`(sample 제외)은 Pearson 자산이나 덤프에서 나온 것이다. 커밋하지 않고, 어떤 공개 채널에도 올리지 않는다.
- `capture/`는 읽기 전용 기준 자료다. 기준 이미지는 절대 갱신하지 않는다.
- 하네스 소유 파일: `tests/visual.spec.mjs`, `playwright.config.mjs`, `scripts/check.sh`, `scripts/guard.mjs`, `loop.sh`, `prompts/`, `docs/spec.md`, `CLAUDE.md`. 구현 루프에서는 수정하지 않는다.
- `features.json`은 `passes` 값만 바꾼다. 테스트를 통과했을 때만 true로 바꾼다.
- 테스트 제목에는 기능 ID 태그(`[M1-04]`)를 붙인다.

## 명령
- `scripts/check.sh passing`: 통과한 기능의 회귀 검사
- `scripts/check.sh M1`: 마일스톤 게이트
- `./loop.sh M1 15`: Sonnet 구현 루프(Orca 터미널에서 실행)
- `npx playwright test --grep "\[M1-04\]"`: 기능 하나만 테스트
