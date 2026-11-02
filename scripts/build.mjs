// 단일 HTML 빌드. 사용법: node scripts/build.mjs <exam.json>
// src/app.css 안의 url(@vendor/<경로>)는 vendor/ 파일의 data URI로 치환한다.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, basename } from 'node:path';
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

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/build.mjs <exam.json>'); process.exit(2); }

const exam = JSON.parse(readFileSync(path, 'utf8'));
const errs = validateExam(exam);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const parts = {
  __TITLE__: () => escHtml(`${exam.title} - ${exam.candidate}`),
  __CSS__: () => inlineVendor(pearsonCss() + readFileSync('src/app.css', 'utf8')),
  __EXAM__: () => safeJson(exam),
  __STRINGS__: () => safeJson(JSON.parse(readFileSync('vendor/strings.ko.json', 'utf8'))),
  __JS__: () => readFileSync('src/app.js', 'utf8').replace(/<\/script/gi, '<\\/script'),
};
let html = readFileSync('src/template.html', 'utf8');
for (const [key, fn] of Object.entries(parts)) html = html.replace(key, fn);

mkdirSync('dist', { recursive: true });
const out = `dist/${basename(path, '.json')}.html`;
writeFileSync(out, html);
console.log(`build: ${out} (${html.length} bytes)`);
