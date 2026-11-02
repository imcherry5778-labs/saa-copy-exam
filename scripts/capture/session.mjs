// Long-lived capture session: opens headed Chrome on the demo, records every
// response under capture/raw/, and accepts JS snippets over localhost HTTP so
// the agent can drive the page step by step.
//   node scripts/capture/session.mjs <startUrl> [width] [height]
//   curl -s localhost:7777 --data-binary 'return await page.title()'
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const [startUrl, w = '1280', h = '800'] = process.argv.slice(2);
const OUT = 'capture';
mkdirSync(join(OUT, 'raw'), { recursive: true });
mkdirSync(join(OUT, 'shots'), { recursive: true });

const ctx = await chromium.launchPersistentContext('.tmp/chrome-profile', {
  channel: 'chrome',
  headless: false,
  viewport: { width: +w, height: +h },
});
ctx.setDefaultTimeout(10000);

function localPath(url) {
  const u = new URL(url);
  let p = u.pathname.endsWith('/') ? u.pathname + 'index' : u.pathname;
  if (u.search) p += '__' + createHash('sha1').update(u.search).digest('hex').slice(0, 8);
  return join(OUT, 'raw', u.host, p);
}

ctx.on('response', async (res) => {
  const url = res.url();
  if (!url.startsWith('http')) return;
  const entry = { t: Date.now(), status: res.status(), method: res.request().method(), type: res.request().resourceType(), url, ct: res.headers()['content-type'] || '' };
  try {
    const body = await res.body();
    const file = localPath(url);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    entry.file = file;
    entry.bytes = body.length;
  } catch { /* redirects / bodiless responses */ }
  appendFileSync(join(OUT, 'network.jsonl'), JSON.stringify(entry) + '\n');
});

const page = ctx.pages()[0] || (await ctx.newPage());
page.on('dialog', (d) => appendFileSync(join(OUT, 'dialogs.log'), `${d.type()}: ${d.message()}\n`));
if (startUrl) await page.goto(startUrl);

// Snapshot one UI state: screenshot, DOM, aria tree, computed styles of visible elements.
globalThis.snap = async (page, name) => {
  for (const d of ['shots', 'dom', 'styles', 'aria']) mkdirSync(join(OUT, d), { recursive: true });
  await page.screenshot({ path: join(OUT, 'shots', name + '.png') });
  writeFileSync(join(OUT, 'dom', name + '.html'), await page.content());
  writeFileSync(join(OUT, 'aria', name + '.yml'), await page.locator('body').ariaSnapshot());
  const styles = await page.evaluate(() => {
    const props = ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'padding', 'border', 'border-radius', 'background-color', 'background-image', 'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'text-decoration', 'box-shadow', 'outline', 'cursor', 'z-index', 'opacity', 'overflow', 'flex', 'gap', 'justify-content', 'align-items', 'white-space', 'letter-spacing'];
    const path = (el) => {
      const p = [];
      for (let e = el; e && e.nodeType === 1 && p.length < 6; e = e.parentElement) {
        let s = e.tagName.toLowerCase();
        if (e.id) { p.unshift(s + '#' + e.id); break; }
        if (e.classList.length) s += '.' + [...e.classList].join('.');
        p.unshift(s);
      }
      return p.join(' > ');
    };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const s = {};
      for (const p of props) s[p] = cs.getPropertyValue(p);
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      out.push({ sel: path(el), rect: [r.x, r.y, r.width, r.height].map(Math.round), text: ownText ? el.textContent.trim().slice(0, 60) : undefined, s });
    }
    return out;
  });
  writeFileSync(join(OUT, 'styles', name + '.json'), JSON.stringify(styles, null, 1));
  return name + ': ' + styles.length + ' elements';
};

const AsyncFunction =Object.getPrototypeOf(async () => {}).constructor;
createServer((req, res) => {
  let src = '';
  req.on('data', (c) => (src += c));
  req.on('end', async () => {
    try {
      const fn = new AsyncFunction('page', 'ctx', 'OUT', src);
      const out = await fn(ctx.pages().at(-1), ctx, OUT);
      res.end(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e && e.stack || e));
    }
  });
}).listen(7777, '127.0.0.1', () => console.log('capture session ready on :7777'));
