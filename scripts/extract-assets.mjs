// capture/ → vendor/ (스프라이트, 아이콘, CSS 원본, strings.ko.json, strings.en.json)
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const host = join(root, 'capture/raw/abe-prd-1.pearsonvue.com');
const out = join(root, 'vendor');

if (!existsSync(host)) {
  console.error('extract-assets: capture/ 가 없습니다 (docs/spec.md 2절 참고)');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

// 문자열: getMessages의 driverProperties를 키 그대로 저장
for (const [lang, st] of [['ko', 'st2'], ['en', 'st1']]) {
  const src = JSON.parse(readFileSync(join(host, st, 'driver/getMessages'), 'utf8'));
  writeFileSync(join(out, `strings.${lang}.json`), JSON.stringify(src.driverProperties, null, 1));
}

// 리소스: 해시 접미사(`name.ext__abcd1234`)를 떼고 복사
const res = join(host, 'st2/driver/resources');
const stripHash = (n) => n.replace(/__[0-9a-f]{8}$/, '');
const copy = (rel, dest) => {
  const dir = join(res, rel);
  if (!existsSync(dir)) return;
  mkdirSync(join(out, dest), { recursive: true });
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile()) cpSync(join(dir, e.name), join(out, dest, stripHash(e.name)));
  }
};
copy('', 'css');
copy('languages/kor', 'kor');
copy('languages/enu', 'enu');
copy('jquery-ui-1.13.3.custom/images', 'jquery-ui-images');
console.log('extract-assets: vendor/ 생성 완료');
