/* global process */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 4595;
const ROUTE = "/paipan?g=男&b=1990-01-01T12%3A00&q=2026-10-28T12%3A00";
const COPY_LABEL = "复制 AI Prompt（TOON）";
const STORAGE = {};

/** 按构建内容识别命例入口及其分块，不依赖每次构建变化的 hash。 */
async function corpusAssets() {
  const assets = path.resolve('dist/assets');
  const scripts = (await readdir(assets)).filter((file) => file.endsWith('.js'));
  const kinds = new Map();
  for (const file of scripts) {
    const code = await readFile(path.join(assets, file), 'utf8');
    if (code.includes('.ml-cases{')) kinds.set(file, 'ui');
    else if (code.includes('getCaseIndex') && code.includes('buildCasePrompt')) {
      kinds.set(file, 'index');
      for (const match of code.matchAll(/import\(["'`]\.\/([^"'`]+)["'`]\)/g)) {
        kinds.set(match[1], match[1].startsWith('answers-') ? 'answers'
          : match[1].startsWith('charts-') ? 'charts' : 'cases');
      }
    }
  }
  assert.equal([...kinds.values()].filter((kind) => kind === 'ui').length, 1, '应有独立 UI chunk');
  assert.equal([...kinds.values()].filter((kind) => kind === 'index').length, 1, '应有独立索引 chunk');
  for (const kind of ['cases', 'answers', 'charts']) {
    assert.ok([...kinds.values()].includes(kind), `必须识别 ${kind} 分块，避免漏记请求`);
  }
  return kinds;
}

async function startPreview() {
  if (process.env.E2E_BASE_URL) return { base: process.env.E2E_BASE_URL, stop: async () => {} };
  const base = `http://127.0.0.1:${PORT}`;
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const stop = async () => {
    if (child.exitCode !== null) return;
    const ended = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await ended;
  };
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`预览服务启动失败：${output}`);
      // Vite 在 Windows 上默认输出颜色码，会把地址里的端口拆开，先去掉再匹配。
      if (output.replace(/\x1b\[[0-9;]*m/g, '').includes(base)) {
        const response = await fetch(base);
        if (response.ok) return { base, stop };
      }
      await delay(100);
    }
    throw new Error(`预览服务启动超时：${output}`);
  } catch (error) { await stop(); throw error; }
}

test('真实浏览器：算命模式双重懒加载与 AI 复制引用隔离', { timeout: 90000 }, async (t) => {
  const assets = await corpusAssets();
  const preview = await startPreview();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROME
    || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const requests = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      const file = path.posix.basename(new URL(request.url()).pathname);
      if (assets.has(file)) requests.push({ file, kind: assets.get(file) });
    });
    await page.addInitScript((storage) => {
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      window.__mingliClipboard = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { window.__mingliClipboard.push(text); } },
      });
    }, STORAGE);
    await page.goto(preview.base + ROUTE, { waitUntil: 'networkidle' });
    const mode = page.getByRole('checkbox', { name: '算命模式', exact: true });
    await mode.waitFor();
    assert.equal(await mode.isChecked(), false);
    assert.equal(requests.length, 0, '默认普通占事不请求命例资源');

    async function copyPrompt() {
      const before = await page.evaluate(() => window.__mingliClipboard.length);
      await page.getByRole('button', { name: COPY_LABEL, exact: true }).click();
      await page.waitForFunction((count) => window.__mingliClipboard.length > count, before);
      return page.evaluate(() => window.__mingliClipboard.at(-1));
    }
    const baseline = await copyPrompt();
    assert.ok(baseline.length > 100, '实际按钮必须生成完整盘面文案');
    assert.ok(!baseline.includes('算命模式 · 独立命例参考'));
    assert.equal(requests.length, 0, '复制普通 Prompt 也不加载人生案例');

    await mode.check();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('button', { name: '展开命例库', exact: true }).count(), 1);
    assert.equal(requests.length, 0, '仅开启算命模式仍不加载命例资源');
    await page.getByRole('button', { name: '展开命例库', exact: true }).click();
    await page.getByLabel('命例年份', { exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    assert.ok(requests.some((item) => item.kind === 'ui'), '展开才加载 UI');
    assert.ok(requests.some((item) => item.kind === 'index'), '展开才加载索引');
    assert.equal(requests.filter((item) => ['cases', 'answers', 'charts'].includes(item.kind)).length, 0, '未选案例不加载正文或答案');

    await page.getByLabel('命例年份', { exact: true }).selectOption('2026');
    await page.locator('.ml-case').first().click();
    await page.locator('.ml-detail h3').waitFor();
    const selectedCase = await page.locator('.ml-detail h3').innerText();
    const referenceWithout = page.getByRole('button', { name: '用于 AI 参考（不含答案）', exact: true });
    const referenceWith = page.getByRole('button', { name: '用于 AI 参考（含已揭晓答案）', exact: true });
    assert.equal(await referenceWith.isDisabled(), true, '未揭晓答案时不能选含答案参考');
    await referenceWithout.click();
    await page.locator('.mingli-mode-selection').waitFor();
    const withReference = await copyPrompt();
    assert.ok(withReference.startsWith(baseline + '\n\n## 算命模式 · 独立命例参考'));
    assert.ok(withReference.includes(selectedCase));
    assert.ok(withReference.includes('不得把案例中的经历、结果或身份迁移到本盘'));
    assert.match(withReference, /来源：https:\/\//);
    assert.ok(!withReference.includes('显式揭晓的原资料答案'), '默认参考不含答案');
    await page.waitForLoadState('networkidle');
    assert.equal(requests.filter((item) => item.kind === 'answers').length, 0, '默认参考不加载答案');

    await page.getByRole('button', { name: '揭晓答案', exact: true }).click();
    await page.locator('.ml-answer').first().waitFor();
    assert.ok(requests.some((item) => item.kind === 'answers'), '揭晓答案后才加载答案');
    await referenceWith.click();
    const withAnswers = await copyPrompt();
    assert.ok(withAnswers.startsWith(baseline + '\n\n## 算命模式 · 独立命例参考'));
    assert.ok(withAnswers.includes('显式揭晓的原资料答案'), '明示选择含答案参考后才附答案');

    await mode.uncheck();
    assert.equal(await page.locator('.ml-cases').count(), 0);
    assert.equal(await page.locator('.mingli-mode-selection').count(), 0);
    const beforeOffCopy = requests.length;
    const afterDisable = await copyPrompt();
    assert.equal(afterDisable, baseline, '关闭后复制必须恢复原有文案，完全移除案例');
    assert.equal(requests.length, beforeOffCopy, '关闭后的复制不触发新命例请求');
    assert.deepEqual(errors, [], '浏览器不应出现未捕获错误');

    const evidence = {
      selectedCase, defaultCorpusRequests: 0, enabledOnlyCorpusRequests: 0,
      expandedResources: requests, onClipboardCharacters: withReference.length,
      offClipboardCharacters: afterDisable.length, disabledMatchesOriginal: true,
    };
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/mingli-mode.json', JSON.stringify(evidence, null, 2) + '\n');
    t.diagnostic(JSON.stringify(evidence));
  } finally {
    await browser?.close();
    await preview.stop();
  }
});
