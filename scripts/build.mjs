// 단일 HTML 빌드. 사용법: node scripts/build.mjs [--all] <exam.json>...
// src/app.css 안의 url(@vendor/<경로>)는 vendor/ 파일의 data URI로 치환한다.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { extname, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateExam } from './validate.mjs';

const MIME = { '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function inlineVendor(css) {
  return css.replace(/url\(\s*['"]?@vendor\/([^'")\s]+)['"]?\s*\)/g, (_, rel) => {
    const file = `vendor/${rel}`;
    if (!existsSync(file)) throw new Error(`vendor 자산이 없다: ${file}`);
    const mime = MIME[extname(file)] ?? 'application/octet-stream';
    return `url(data:${mime};base64,${readFileSync(file).toString('base64')})`;
  });
}

// 원본 Pearson CSS(base/screen/스프라이트)를 앞에 붙인다. 스프라이트는 data URI로, 그 밖의 상대 url()은 빈 이미지로 바꾼다.
function pearsonCss() {
  const read = (f) => readFileSync(`vendor/${f}`, 'utf8');
  const base = [read('css/base.css'), read('css/screen.css')].join('\n').replace(/url\(\s*['"]?(?!data:)[^'")]*['"]?\s*\)/g, 'url(data:,)');
  const sprites = read('kor/sprites-compiled.css').replace(/url\(\s*['"]?([^'")?]*)[^)]*\)/g, (m, f) => (f === 'default.png' ? 'var(--sprite-kor)' : existsSync(`vendor/kor/${f}`) ? `url(@vendor/kor/${f})` : 'url(data:,)'));
  return ':root{--sprite-kor:url(@vendor/kor/default.png)}\n' + base + '\n' + sprites + '\n';
}

// <script> 안에 안전하게 넣기 위한 JSON 직렬화
const safeJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildExam(path, outDir = 'dist') {
  if (!existsSync(path)) {
    throw new Error(`파일이 존재하지 않는다: ${path}`);
  }
  let exam;
  try {
    exam = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${path} JSON 파싱 실패: ${e.message}`);
  }
  const errs = validateExam(exam);
  if (errs.length) {
    throw new Error(`${path} 검증 실패:\n${errs.join('\n')}`);
  }

  const parts = {
    __TITLE__: () => escHtml(`${exam.title} - ${exam.candidate}`),
    __CSS__: () => inlineVendor(pearsonCss() + readFileSync('src/app.css', 'utf8')),
    __EXAM__: () => safeJson(exam),
    __STRINGS__: () => safeJson(JSON.parse(readFileSync('vendor/strings.ko.json', 'utf8'))),
    __JS__: () => readFileSync('src/app.js', 'utf8').replace(/<\/script/gi, '<\\/script'),
  };
  let html = readFileSync('src/template.html', 'utf8');
  for (const [key, fn] of Object.entries(parts)) html = html.replace(key, fn);

  mkdirSync(outDir, { recursive: true });
  const out = `${outDir}/${basename(path, '.json')}.html`;
  writeFileSync(out, html);
  console.log(`build: ${out} (${html.length} bytes)`);
  return { out, bytes: html.length, exam };
}

export function listAllExamFiles(dir = 'exams') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f));
}

// CLI 실행
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const files = args.filter((a) => !a.startsWith('-'));

  let targets = [];
  if (isAll) {
    targets = listAllExamFiles('exams');
    if (!targets.length) {
      console.error('exams 디렉터리에 빌드할 .json 시험 파일이 없습니다.');
      process.exit(1);
    }
  } else if (files.length > 0) {
    targets = files;
  } else {
    console.error('사용법: node scripts/build.mjs [--all] <exam.json>...');
    process.exit(2);
  }

  let failed = false;
  for (const target of targets) {
    try {
      buildExam(target);
    } catch (e) {
      console.error(e.message);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}
