/**
 * 构建产物冒烟（puppeteer-core 连接系统 Chrome）：
 *   1. 首页 hero/统计/十二集阵
 *   2. /volumes 条文列表（子集 100 条/页，首条 1001）
 *   3. /v/2408 单条视图
 *   4. /search 全文（姻缘）与按岁（47 → 195 条）
 *   5. /tables 十四考渲染（14-14 共 2028 行）
 *   6. /annotated 29 卡、/method markdown
 * 全程收集 console error。用法：先 `npm run preview -- --port 5187`，再
 * `node scripts/smoke.mjs <截图输出目录>`
 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5187';
const OUT = process.argv[2] ?? '.';
const shot = (name) => path.join(OUT, name);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1; };
const errors = [];
try {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 1280, height: 900 });

  // 1. 首页
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  const home = await page.evaluate(() => ({
    h1: document.querySelector('.hero h1')?.textContent ?? '',
    stats: [...document.querySelectorAll('.stat b')].map((b) => b.textContent),
    vols: document.querySelectorAll('.vol-grid .vol-cell').length,
  }));
  console.log('home:', JSON.stringify(home));
  if (home.h1 !== '铁板神数') fail('首页标题异常');
  if (home.stats[0] !== '12000') fail('条文统计非 12000');
  if (home.vols !== 12) fail('十二集阵数量异常');
  await page.screenshot({ path: shot('smoke-home.png') });

  // 2. 条文库列表
  await page.goto(`${BASE}/volumes`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.verse-list li').length > 0, { timeout: 30000 });
  const vol = await page.evaluate(() => ({
    count: document.querySelectorAll('.verse-list li').length,
    first: document.querySelector('.verse-list .verse-n')?.textContent,
    firstText: document.querySelector('.verse-list .verse-text')?.textContent ?? '',
  }));
  console.log('volumes:', JSON.stringify(vol));
  if (vol.count !== 100) fail(`列表页应 100 条，得 ${vol.count}`);
  if (vol.first !== '1001' || !vol.firstText.includes('一树残花')) fail('子集首条异常');
  await page.screenshot({ path: shot('smoke-volumes.png') });

  // 3. 单条视图
  await page.goto(`${BASE}/v/2408`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => (document.querySelector('.verse-view .vtext')?.textContent ?? '').length > 3, { timeout: 30000 });
  const verse = await page.evaluate(() => ({
    text: document.querySelector('.verse-view .vtext')?.textContent ?? '',
    cite: document.querySelector('.verse-view .cite')?.textContent ?? '',
  }));
  console.log('verse 2408:', JSON.stringify(verse));
  if (!verse.cite.includes('丑集')) fail('2408 应属丑集');

  // 4. 检索：全文 + 按岁
  await page.goto(`${BASE}/search?q=${encodeURIComponent('姻缘')}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.results .verse-list li').length > 0, { timeout: 30000 });
  const textHits = await page.evaluate(() => document.querySelectorAll('.results .verse-list li').length);
  console.log('search 姻缘 hits:', textHits);
  if (textHits < 5) fail('全文检索命中过少');
  await page.goto(`${BASE}/search?mode=age&q=47`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.results .verse-list li').length > 0, { timeout: 30000 });
  const ageHits = await page.evaluate(() => document.querySelectorAll('.results .verse-list li').length);
  console.log('search age47 hits:', ageHits);
  if (ageHits !== 195) fail(`47 岁应 195 条，得 ${ageHits}`);
  await page.screenshot({ path: shot('smoke-search.png') });

  // 5. 取数表
  await page.goto(`${BASE}/tables?t=14-14`, { waitUntil: 'networkidle0', timeout: 60000 });
  const table = await page.evaluate(() => ({
    title: document.querySelector('.main-head h2')?.textContent ?? '',
    rows: document.querySelectorAll('.main .dtable tbody tr').length,
    sideItems: document.querySelectorAll('.side .entity-list li').length,
  }));
  console.log('tables:', JSON.stringify(table));
  if (table.sideItems !== 15) fail('侧栏应 15 张表');
  if (table.rows !== 2028) fail(`14-14 应 2028 行，得 ${table.rows}`);
  await page.screenshot({ path: shot('smoke-tables.png') });

  // 6. 注解精选 + 方法文献
  await page.goto(`${BASE}/annotated`, { waitUntil: 'networkidle0', timeout: 60000 });
  const annoCount = await page.evaluate(() => document.querySelectorAll('.anno-card').length);
  console.log('annotated cards:', annoCount);
  if (annoCount !== 29) fail(`注解应 29 条，得 ${annoCount}`);
  await page.goto(`${BASE}/method`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => (document.querySelector('.main .md')?.textContent ?? '').length > 100, { timeout: 30000 });
  const mdOk = await page.evaluate(() => document.querySelector('.main .md h1')?.textContent ?? '');
  console.log('method doc h1:', mdOk);
  if (!mdOk.includes('概述')) fail('方法文献默认篇异常');

  // 7. 排盘推演（黄金向量：男 1924-06-15 16:00 / 求测 2025-04-20 10:00）
  await page.goto(`${BASE}/paipan`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('.paipan-grid input[type="datetime-local"]', { timeout: 30000 });
  await page.evaluate(() => {
    const setVal = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const [birth, query] = document.querySelectorAll('.paipan-grid input[type="datetime-local"]');
    setVal(birth, '1924-06-15T16:00');
    setVal(query, '2025-04-20T10:00');
    document.querySelector('.btn-run').click();
  });
  await page.waitForFunction(() => document.querySelectorAll('.stat-row .stat').length >= 8, { timeout: 30000 });
  const paipan = await page.evaluate(() => ({
    stats: [...document.querySelectorAll('.stat-row .stat')].map((s) => s.textContent),
    bazi: document.querySelector('.formula b')?.textContent ?? '',
  }));
  console.log('paipan stats:', JSON.stringify(paipan.stats));
  if (paipan.bazi !== '甲子 庚午 乙丑 甲申') fail(`八字异常：${paipan.bazi}`);
  if (!paipan.stats.some((s) => s.includes('11') && s.includes('先天命数'))) fail('先天命数非 11');
  if (!paipan.stats.some((s) => s.includes('344') && s.includes('本命数'))) fail('本命数非 344');
  if (!paipan.stats.some((s) => s.includes('泰'))) fail('十二辟卦非泰');
  // 流年断语已随分包补齐（1 岁原条文 2408「吹落黄花弄笛声」）
  await page.waitForFunction(
    () => (document.body.textContent ?? '').includes('吹落黄花弄笛声'),
    { timeout: 30000 },
  );
  const liunianRow1 = await page.evaluate(() => {
    const tr = [...document.querySelectorAll('.dtable tbody tr')].find((r) => r.textContent.includes('吹落黄花'));
    return tr ? tr.textContent : '';
  });
  console.log('liunian age1:', liunianRow1.slice(0, 80));
  if (!liunianRow1.includes('2408')) fail('1 岁原条文非 2408');
  await page.screenshot({ path: shot('smoke-paipan.png') });

  // 8. 移动端首页快照
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/volumes`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.screenshot({ path: shot('smoke-mobile-volumes.png') });

  if (errors.length) fail(`console 错误 ${errors.length} 条：\n` + errors.slice(0, 5).join('\n'));
  console.log(process.exitCode ? 'SMOKE FAIL' : 'SMOKE OK');
} finally {
  await browser.close();
}
