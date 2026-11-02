// exam JSON 검증기. 사용법: node scripts/validate.mjs <exam.json>...
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validateExam(exam) {
  const errs = [];
  const err = (path, msg) => errs.push(`${path}: ${msg}`);
  const bilingual = (v, path) => {
    if (!isObj(v)) return err(path, '{ko, en} 객체여야 한다');
    for (const k of ['ko', 'en']) if (!isStr(v[k])) err(`${path}.${k}`, '비어 있지 않은 문자열이어야 한다');
  };
  const idList = (list, path, pattern) => {
    const ids = new Set();
    if (!Array.isArray(list) || list.length === 0) { err(path, '비어 있지 않은 배열이어야 한다'); return ids; }
    list.forEach((o, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(o)) return err(p, '객체여야 한다');
      if (o.compact !== undefined && typeof o.compact !== 'boolean') err(`${p}.compact`, 'bool이어야 한다');
      if (!isStr(o.id)) err(`${p}.id`, '비어 있지 않은 문자열이어야 한다');
      else if (ids.has(o.id)) err(`${p}.id`, `중복된 id '${o.id}'`);
      else if (pattern && !pattern.test(o.id)) err(`${p}.id`, `'${o.id}'는 허용되지 않는 id다`);
      else ids.add(o.id);
      bilingual({ ko: o.ko, en: o.en }, p);
    });
    return ids;
  };

  if (!isObj(exam)) return ['(root): 객체여야 한다'];
  if (!isStr(exam.id) || !/^[a-z0-9-]+$/.test(exam.id)) err('id', '[a-z0-9-]+ 형식의 문자열이어야 한다');
  if (!isStr(exam.title)) err('title', '비어 있지 않은 문자열이어야 한다');
  if (!isStr(exam.candidate)) err('candidate', '비어 있지 않은 문자열이어야 한다');
  if (!Number.isInteger(exam.durationMinutes) || exam.durationMinutes <= 0) err('durationMinutes', '양의 정수여야 한다');

  const cs = exam.caseStudies ?? {};
  if (!isObj(cs)) err('caseStudies', '객체여야 한다');
  else for (const [k, v] of Object.entries(cs)) bilingual(v?.scenario, `caseStudies.${k}.scenario`);

  if (!Array.isArray(exam.items) || exam.items.length === 0) {
    err('items', '비어 있지 않은 배열이어야 한다');
    return errs;
  }

  const seen = new Set();
  const closedCs = new Set();
  let prevCs = null;
  exam.items.forEach((it, i) => {
    const p = `items[${i}]`;
    if (!isObj(it)) return err(p, '객체여야 한다');
    if (!isStr(it.id)) err(`${p}.id`, '비어 있지 않은 문자열이어야 한다');
    else if (seen.has(it.id)) err(`${p}.id`, `중복된 id '${it.id}'`);
    else seen.add(it.id);
    if (!Number.isInteger(it.domain) || it.domain < 1 || it.domain > 4) err(`${p}.domain`, '1–4 정수여야 한다');
    bilingual(it.stem, `${p}.stem`);
    bilingual(it.explanation, `${p}.explanation`);
    if (!['dump', 'ai'].includes(it.explanationSource)) err(`${p}.explanationSource`, "'dump' 또는 'ai'여야 한다");
    if (it.disputed !== undefined && typeof it.disputed !== 'boolean') err(`${p}.disputed`, 'boolean이어야 한다');

    const cur = it.caseStudy ?? null;
    if (cur !== null) {
      if (!isObj(cs) || !(cur in cs)) err(`${p}.caseStudy`, `caseStudies에 없는 키 '${cur}'`);
      if (closedCs.has(cur)) err(`${p}.caseStudy`, `'${cur}' 문항이 연속되지 않는다`);
    }
    if (prevCs !== null && prevCs !== cur) closedCs.add(prevCs);
    prevCs = cur;

    const ans = it.answer;
    switch (it.type) {
      case 'single':
      case 'multiple': {
        const ids = idList(it.options, `${p}.options`, /^[A-F]$/);
        if (!Array.isArray(ans) || !ans.every(isStr)) { err(`${p}.answer`, '문자열 배열이어야 한다'); break; }
        ans.forEach((a, j) => { if (!ids.has(a)) err(`${p}.answer[${j}]`, `존재하지 않는 보기 id '${a}'`); });
        if (new Set(ans).size !== ans.length) err(`${p}.answer`, '중복된 id가 있다');
        if (it.type === 'single') {
          if (ans.length !== 1) err(`${p}.answer`, '정확히 1개여야 한다');
        } else if (!Number.isInteger(it.select) || it.select < 1) err(`${p}.select`, '양의 정수여야 한다');
        else if (ans.length !== it.select) err(`${p}.answer`, `길이(${ans.length})가 select(${it.select})와 같아야 한다`);
        break;
      }
      case 'ordering': {
        const ids = idList(it.choices, `${p}.choices`);
        if (!Array.isArray(it.slots) || it.slots.length === 0) { err(`${p}.slots`, '비어 있지 않은 배열이어야 한다'); break; }
        it.slots.forEach((s, j) => {
          const sp = `${p}.slots[${j}]`;
          if (!isObj(s)) return err(sp, '객체여야 한다');
          if (!['left', 'right'].includes(s.side)) err(`${sp}.side`, "'left' 또는 'right'여야 한다");
          if (s.label !== null && s.label !== undefined) bilingual(s.label, `${sp}.label`);
        });
        if (!Array.isArray(ans)) { err(`${p}.answer`, '배열이어야 한다'); break; }
        if (ans.length !== it.slots.length) err(`${p}.answer`, `길이(${ans.length})가 슬롯 수(${it.slots.length})와 같아야 한다`);
        ans.forEach((a, j) => { if (!ids.has(a)) err(`${p}.answer[${j}]`, `존재하지 않는 choice id '${a}'`); });
        break;
      }
      case 'matching': {
        const cids = idList(it.choices, `${p}.choices`);
        const pids = idList(it.prompts, `${p}.prompts`);
        if (!isObj(ans)) { err(`${p}.answer`, '{promptId: choiceId} 객체여야 한다'); break; }
        for (const pid of pids) if (!(pid in ans)) err(`${p}.answer.${pid}`, '정답이 없다');
        for (const [k, v] of Object.entries(ans)) {
          if (!pids.has(k)) err(`${p}.answer.${k}`, `존재하지 않는 prompt id '${k}'`);
          else if (!cids.has(v)) err(`${p}.answer.${k}`, `존재하지 않는 choice id '${v}'`);
        }
        break;
      }
      default:
        err(`${p}.type`, `알 수 없는 유형 '${it.type}'`);
    }
  });
  return errs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('사용법: node scripts/validate.mjs <exam.json>...'); process.exit(1); }
  let failed = false;
  for (const f of files) {
    let errs;
    try { errs = validateExam(JSON.parse(readFileSync(f, 'utf8'))); }
    catch (e) { errs = [`(file): ${e.message}`]; }
    if (errs.length) { failed = true; console.error(`${f}: 오류 ${errs.length}개`); errs.forEach((e) => console.error(`  ${e}`)); }
    else console.log(`${f}: OK`);
  }
  process.exit(failed ? 1 : 0);
}
