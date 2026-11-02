#!/usr/bin/env bash
# Deterministic gate (harness-owned). Usage:
#   scripts/check.sh passing   regression gate: tests of features with passes:true
#   scripts/check.sh M2        milestone gate: every feature in M1..M2 must have a test, and all must pass
set -euo pipefail
cd "$(dirname "$0")/.."
mode=${1:-passing}

if [ "$mode" = passing ]; then
  ids=$(node -e 'console.log(require("./features.json").filter(f=>f.passes).map(f=>f.id).join("|"))')
  if [ -z "$ids" ]; then echo "check: no passing features yet"; exit 0; fi
  grep="\[($ids)\]"
else
  n=${mode#M}
  ids=$(node -e "console.log(require('./features.json').filter(f=>+f.milestone.slice(1)<=$n).map(f=>f.id).join(' '))")
  grep="\[M[1-$n]-[0-9]+\]"
fi

[ -f scripts/extract-assets.mjs ] && node scripts/extract-assets.mjs
if [ -f scripts/build.mjs ]; then
  for f in exams/sample.json exams/demo-fixture.json; do
    [ -f scripts/validate.mjs ] && node scripts/validate.mjs "$f"
    node scripts/build.mjs "$f"
  done
fi

if [ "$mode" != passing ]; then
  listed=$(npx playwright test --list --grep "$grep" 2>/dev/null || true)
  missing=""
  for id in $ids; do grep -q "\[$id\]" <<<"$listed" || missing="$missing $id"; done
  if [ -n "$missing" ]; then echo "check: features without tests:$missing"; exit 1; fi
fi

npx playwright test --grep "$grep"
