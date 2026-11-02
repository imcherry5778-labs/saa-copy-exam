// Loop guard (harness-owned). Run by loop.sh after each iteration.
//   node scripts/guard.mjs <baseRef> [--revert-new-passes <prevFeaturesFile>]
// Fails (exit 1) if the agent touched harness-owned files or changed
// features.json beyond the `passes` flags. With --revert-new-passes it resets
// passes flipped in this iteration (used when the regression gate fails).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [base, flag, prevFile] = process.argv.slice(2);
const PROTECTED = ['tests/visual.spec.mjs', 'playwright.config.mjs', 'scripts/check.sh', 'scripts/guard.mjs', 'loop.sh', 'prompts/', 'docs/spec.md', 'AGENTS.md', 'CLAUDE.md'];

if (flag === '--revert-new-passes') {
  const prev = Object.fromEntries(JSON.parse(readFileSync(prevFile, 'utf8')).map((f) => [f.id, f.passes]));
  const cur = JSON.parse(readFileSync('features.json', 'utf8'));
  const reverted = cur.filter((f) => f.passes && !prev[f.id]).map((f) => f.id);
  for (const f of cur) if (reverted.includes(f.id)) f.passes = false;
  writeFileSync('features.json', JSON.stringify(cur, null, 2) + '\n');
  console.log('guard: reverted passes for', reverted.join(', ') || '(none)');
  process.exit(0);
}

const problems = [];
const changed = execFileSync('git', ['diff', '--name-only', base, '--', ...PROTECTED], { encoding: 'utf8' }).trim();
if (changed) problems.push('protected files changed:\n  ' + changed.split('\n').join('\n  '));

const strip = (list) => JSON.stringify(list.map(({ passes, ...rest }) => rest));
const before = JSON.parse(execFileSync('git', ['show', `${base}:features.json`], { encoding: 'utf8' }));
const after = JSON.parse(readFileSync('features.json', 'utf8'));
if (strip(before) !== strip(after)) problems.push('features.json changed beyond `passes` flags');

if (problems.length) {
  console.error('guard: VIOLATION\n' + problems.join('\n'));
  process.exit(1);
}
console.log('guard: ok');
