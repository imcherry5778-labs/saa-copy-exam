#!/usr/bin/env bash
# Sonnet implementation loop (harness-owned). Run it in an Orca terminal so it can be watched.
#   ./loop.sh M1 [maxIter]      MODEL=claude-sonnet-5-5 by default
# Stops when every feature of the milestone passes and `scripts/check.sh <M>` is green,
# on a guard violation, or after maxIter iterations.
set -uo pipefail
cd "$(dirname "$0")"
M=${1:?usage: ./loop.sh M1 [maxIter]}
MAX=${2:-15}
MODEL=${MODEL:-claude-sonnet-5-5}
TOOLS="Read Edit Write Glob Grep Bash(node:*) Bash(npx:*) Bash(npm:*) Bash(git:*) Bash(scripts/check.sh:*) Bash(./scripts/check.sh:*) Bash(ls:*) Bash(cat:*) Bash(head:*) Bash(tail:*) Bash(grep:*) Bash(wc:*) Bash(mkdir:*) Bash(cp:*) Bash(mv:*) Bash(rm:*) Bash(python3:*)"
mkdir -p .tmp/loop
base=$(git rev-parse HEAD)

status() { node -e "const f=require('./features.json').filter(x=>x.milestone==='$M');console.log(f.filter(x=>x.passes).length+'/'+f.length)"; }
milestone_done() { node -e "process.exit(require('./features.json').filter(x=>x.milestone==='$M').every(x=>x.passes)?0:1)"; }
# Only the Orca shim; a bare `orca` outside Orca terminals is the GNOME screen reader.
notify() { [ -n "${ORCA_CLI_COMMAND:-}" ] && "$ORCA_CLI_COMMAND" worktree set --worktree active --comment "$1" --json >/dev/null 2>&1 || true; }

for i in $(seq 1 "$MAX"); do
  echo "=== $M iteration $i/$MAX — $(status) passing"
  notify "$M iter $i · $(status) 통과 · Sonnet 작업 중"
  cp features.json .tmp/loop/features.before.json

  claude -p "$(cat prompts/iterate.md)

현재 마일스톤: $M" \
    --model "$MODEL" --permission-mode acceptEdits \
    --allowedTools "$TOOLS" --disallowedTools "Bash(git push:*)" \
    < /dev/null > ".tmp/loop/$M-$i.log" 2>&1
  tail -n 8 ".tmp/loop/$M-$i.log"

  if ! node scripts/guard.mjs "$base"; then
    notify "$M 중단 · 하네스 위반 (iter $i)"
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
