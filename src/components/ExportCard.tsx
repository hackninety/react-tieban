import { useMemo, useState } from 'react';
import type { Chart } from '../engine/engine';
import { chartToMarkdown, chartToToon, exportFileName, type VerseLike } from '../engine/export';
import { generateAIPrompt } from '../engine/prompt';

/** 预估文件大小（UTF-8 字节数，与下载落盘一致） */
function formatSize(text: string): string {
  const kb = new TextEncoder().encode(text).length / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
}

function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function downloadText(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  // 需挂载到 DOM：部分 Chromium 对游离锚点不认 download 属性文件名
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* 内联小图标（lucide 线稿风，stroke 随 currentColor 走主题色） */
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconBot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
  </svg>
);
const IconSpark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

/**
 * 数据导出 · AI 分析卡片（版式参照 react-8char 的 JsonExport，配色沿用铁系令牌）：
 * 标题徽标 → 文件下载（MD/TOON，标注体积）→ AI Prompt 一键复制（角色/框架/纪律内嵌）→ TOON 预览。
 */
export default function ExportCard({ chart, verses }: { chart: Chart; verses: ReadonlyMap<number, VerseLike> }) {
  const versesReady = verses.size > 0;
  const [copied, setCopied] = useState<'toon' | 'md' | null>(null);

  // 断语载荷就绪后构建导出内容；verses 引用不变时（如表单输入）不重编码
  const toonText = useMemo(
    () => (versesReady ? chartToToon(chart, (n) => verses.get(n)) : ''),
    [chart, verses, versesReady],
  );
  const markdown = useMemo(
    () => (versesReady ? chartToMarkdown(chart, (n) => verses.get(n)) : ''),
    [chart, verses, versesReady],
  );
  const toonSize = useMemo(() => formatSize(toonText), [toonText]);
  const mdSize = useMemo(() => formatSize(markdown), [markdown]);

  const exportMd = () => {
    downloadText(exportFileName(chart, 'md'), chartToMarkdown(chart, (n) => verses.get(n), { now: nowLocal() }), 'text/markdown');
  };
  const exportToon = () => downloadText(exportFileName(chart, 'toon'), toonText, 'text/plain');
  const copyPrompt = async (fmt: 'toon' | 'md') => {
    await navigator.clipboard.writeText(generateAIPrompt(fmt === 'toon' ? toonText : markdown, fmt));
    setCopied(fmt);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <section className="export-card">
      <div className="export-head"><IconBot />数据导出 · AI 分析</div>
      <div className="export-meta">
        <span className={`export-badge${versesReady ? '' : ' pending'}`}>
          <IconSpark />{versesReady ? '已准备好喂 AI' : '断语加载中…'}
        </span>
        <span className="hint">含基础排盘、考刻对比与流年百岁三口径断语；MD 报告最完整，TOON 为紧凑等价表示、更省 token</span>
      </div>
      <div className="export-grid">
        <button className="btn" disabled={!versesReady} onClick={exportMd}>
          <IconDownload />导出 MD 文件{versesReady ? `（${mdSize}）` : ''}
        </button>
        <button className="btn" disabled={!versesReady} onClick={exportToon}>
          <IconDownload />导出 TOON 文件{versesReady ? `（${toonSize}）` : ''}
        </button>
      </div>
      <div className="export-grid">
        <button className="btn btn-seal" disabled={!versesReady} onClick={() => copyPrompt('toon')}>
          <IconBot />{copied === 'toon' ? '已复制 ✓' : '复制 AI Prompt（TOON）'}
        </button>
        <button className="btn btn-seal" disabled={!versesReady} onClick={() => copyPrompt('md')}>
          <IconBot />{copied === 'md' ? '已复制 ✓' : '复制 AI 分析（Markdown）'}
        </button>
      </div>
      {versesReady && (
        <div className="export-preview">
          <pre>{toonText.slice(0, 2000)}{toonText.length > 2000 ? '…' : ''}</pre>
        </div>
      )}
    </section>
  );
}
