#!/usr/bin/env bash
# Vendor-neutral implementation loop (harness-owned). Run it in an Orca terminal so it can be watched.
#   ./loop.sh M2 [maxIter]
#   AGENT=codex ./loop.sh M2          # claude (default) | codex | agy
#   AGENT=agy MODEL=gemini-4-argon-high ./loop.sh M2
# All state lives in files (features.json, progress.md, git), so agents can be swapped
# between runs. Stops when every feature of the milestone passes and `scripts/check.sh <M>`
# is green, on a guard violation, a usage limit / CLI failure, or after maxIter iterations.
set -uo pipefail
cd "$(dirname "$0")"
M=${1:?usage: [AGENT=claude|codex|agy] ./loop.sh M1 [maxIter]}
MAX=${2:-15}
AGENT=${AGENT:-claude}
mkdir -p .tmp/loop
base=$(git rev-parse HEAD)

# Claude keeps a tool allowlist. Codex and agy run without a sandbox: Chrome (Playwright)
# cannot start inside Codex's workspace-write sandbox, and agy print mode cannot answer
# permission prompts. guard.mjs + git are the safety net for all three.
run_agent() { # $1 = prompt, $2 = log file
  case "$AGENT" in
    claude)
      claude -p "$1" --model "${MODEL:-claude-sonnet-5-5}" --permission-mode acceptEdits \
        --allowedTools "Read Edit Write Glob Grep Bash(node:*) Bash(npx:*) Bash(npm:*) Bash(git:*) Bash(scripts/check.sh:*) Bash(./scripts/check.sh:*) Bash(ls:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(grep:*) Bash(wc:*) Bash(mkdir:*) Bash(cp:*) Bash(mv:*) Bash(rm:*) Bash(python3:*)" \
        --disallowedTools "Bash(git push:*)" < /dev/null > "$2" 2>&1 ;;
    codex)
      codex exec ${MODEL:+-m "$MODEL"} -s danger-full-access -c approval_policy='"never"' \
        "$1" < /dev/null > "$2" 2>&1 ;;
    agy)
      agy -p "$1" --model "${MODEL:-claude-sonnet-5-5-medium}" \
        --dangerously-skip-permissions < /dev/null > "$2" 2>&1 ;;
    *) echo "unknown AGENT=$AGENT (claude|codex|agy)" >&2; exit 64 ;;
  esac
}

status() { node -e "const f=require('./features.json').filter(x=>x.milestone==='$M');console.log(f.filter(x=>x.passes).length+'/'+f.length)"; }
milestone_done() { node -e "process.exit(require('./features.json').filter(x=>x.milestone==='$M').every(x=>x.passes)?0:1)"; }
# Only the Orca shim; a bare `orca` outside Orca terminals is the GNOME screen reader.
notify() { [ -n "${ORCA_CLI_COMMAND:-}" ] && "$ORCA_CLI_COMMAND" worktree set --worktree active --comment "$1" --json >/dev/null 2>&1 || true; }

for i in $(seq 1 "$MAX"); do
  log=".tmp/loop/$M-$i.log"
  echo "=== $M iteration $i/$MAX [$AGENT] — $(status) passing"
  notify "$M iter $i · $(status) 통과 · $AGENT 작업 중"
  cp features.json .tmp/loop/features.before.json

  run_agent "$(cat prompts/iterate.md)

현재 마일스톤: $M" "$log"
  rc=$?
  tail -n 8 "$log"

  # Usage limits or CLI failures produce no work; stop instead of burning iterations.
  if grep -qiE "hit your .*limit" "$log" || [ "$rc" -ne 0 ]; then
    reason=$(grep -iE "limit|quota|exhausted|error" "$log" | tail -n 1 | cut -c1-80)
    notify "$M 일시 중지 · $AGENT · ${reason:-종료 코드 $rc}"
    echo "=== $M paused [$AGENT rc=$rc]: ${reason:-see $log} — rerun later or switch AGENT"
    exit 3
  fi
  # Remaining features all wait on a human decision (BLOCKED/QUESTION in progress.md).
  if grep -q "NO-ACTIONABLE-FEATURE" "$log"; then
    notify "$M 대기 · 사람 결정 필요 ($(status) 통과)"
    echo "=== $M waiting: remaining features need a decision — see BLOCKED/QUESTION in progress.md"
    exit 4
  fi

  if ! node scripts/guard.mjs "$base"; then
    notify "$M 중단 · 하네스 위반 · $AGENT (iter $i)"
    exit 2
  fi
  if ! scripts/check.sh passing > ".tmp/loop/$M-$i.check.log" 2>&1; then
    echo "regression gate failed — .tmp/loop/$M-$i.check.log"
    node scripts/guard.mjs "$base" --revert-new-passes .tmp/loop/features.before.json
    git commit -qam "harness: revert passes after failed regression gate ($M iter $i)" || true
  fi
  if milestone_done && scripts/check.sh "$M" > ".tmp/loop/$M-final.check.log" 2>&1; then
    notify "$M 완료 · 사용자 검토 대기"
    echo "=== $M complete — review the result, then run the next milestone"
    exit 0
  fi
done

notify "$M 반복 상한 도달 · $(status) 통과"
echo "=== $M stopped at iteration cap — $(status) passing; see progress.md"
exit 1
