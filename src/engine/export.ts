/**
 * 盘面导出：Markdown 完整报告（仿上游 save_to_md 版式并扩充）与
 * TOON（Token-Oriented Object Notation，官方 @toon-format/toon 编码）——
 * 后者面向 LLM 批断场景：同一盘面比 JSON 省约三成 token，流年百岁走表格化数组。
 * 纯函数：断语文本经 resolver 注入（页面已批量加载），缺文以「-」占位。
 */
import { encode } from '@toon-format/toon';
import { computeQuarterCandidates, type Chart } from './engine';

export interface VerseLike { text: string; ages: number[] }
export type VerseResolver = (n: number) => VerseLike | undefined;

const APP = 'react-tieban';
const SOURCE = 'tbss-ts-lib（Nanphy/TiebanshenshuOS ← xaminxan/tiebanshenshu；注解 wangdwn/mingli-lab）';
const CALIBER =
  '引擎为上游开源实现移植：八刻计分按上游「偶数小时为时辰首小时」约定；' +
  '卦象/本命条文/流年字母统一按八刻归并刻查表，14-7 考刻作先验参考；' +
  '流年三口径 = 原条文（字母×岁查 14-14）/ 岁段校正 / 终局（+刻干数×48）。';
const DISCLAIMER_LINE =
  '铁板神数为历史术数文献，条文为社区数字化转录未经校勘；本盘面仅供文献研究，不构成任何命运预测依据。';

const ages = (v: VerseLike | undefined) => (v && v.ages.length ? v.ages.join('/') : '-');
const text = (v: VerseLike | undefined) => (v ? v.text : '-');

/** 断语单元格：`2408 断语（年龄）` / `-` */
function verseCell(n: number, resolve: VerseResolver): string {
  if (!n) return '—';
  const v = resolve(n);
  if (!v) return `${n}（未收录）`;
  return `${n} ${v.text}${v.ages.length ? `（${v.ages.join('，')}岁）` : ''}`;
}

const mdEscape = (s: string) => s.replace(/\|/g, '｜').replace(/\n/g, ' ');

/** Markdown 完整报告（基础排盘/考刻对比/本命条文/流年百岁/口径出处） */
export function chartToMarkdown(chart: Chart, resolve: VerseResolver, opts?: { now?: string }): string {
  const b = chart.birth;
  const q = chart.query;
  const candidates = computeQuarterCandidates(chart);
  const L: string[] = [];

  L.push('# 铁板神数排盘', '');
  if (opts?.now) L.push(`**导出时间**：${opts.now}`, '');
  L.push('## 基础信息', '', '```');
  L.push(`性别:${chart.gender}, 农历:${b.lunarStr}，闰月${b.isLeap ? '是' : '否'}，出生八字：${b.bazi.year} ${b.bazi.month} ${b.bazi.day} ${b.bazi.time}`);
  L.push(`求测日期：阳历：${q.dateStr}     八字：${q.bazi.year} ${q.bazi.month} ${q.bazi.day} ${q.bazi.time}`);
  L.push('```', '');

  L.push('## 基础排盘', '');
  L.push(`- 先天命数：${chart.congNum}`);
  L.push(`- 五音命数：${chart.toneNum}（${chart.tone}）`);
  L.push(`- 日命 / 时运：${chart.dayLife} / ${chart.timeLuck}`);
  L.push(`- 考刻（14-7）：${chart.kaokeMoment}（${chart.kaokeGroup}）`);
  L.push(`- 八刻：${chart.quarter} · 刻干数 ${chart.keGanNum}${chart.quarterManual ? '（手动定刻）' : ''} · 归并 ${chart.legacyMoment}`);
  L.push(`- 本命数：${chart.mainNum}`);
  L.push(`- 终局条文数：${chart.mainNum} + ${chart.keGanNum} × 48 = ${chart.finalFortuneNum} —— ${mdEscape(verseCell(chart.finalFortuneNum, resolve))}`);
  L.push(`- 十二辟卦：${chart.hexName}`);
  L.push(`- 后天命数：${chart.pnNum}${chart.wuShuJiGong ? `（五数寄宫 → ${chart.wuShuJiGong.gua}，${chart.wuShuJiGong.basis}）` : ''}`);
  L.push(`- 三元：${chart.sanYuan}`, '');

  L.push('## 考刻对比（八刻）', '');
  L.push('| 刻别 | 刻干数 | 归并 | 卦 | 终局条文与断语 |');
  L.push('|------|--------|------|----|----------------|');
  for (const c of candidates) {
    const mark = c.keGanNum === chart.keGanNum ? ' ●' : '';
    L.push(`| ${c.quarter}${mark} | ${c.keGanNum} | ${c.legacyMoment} | ${c.hexName} | ${mdEscape(verseCell(c.finalFortuneNum, resolve))} |`);
  }
  L.push('');

  L.push('## 本命条文', '');
  if (!chart.destiny) {
    L.push(`14-10 表无匹配行（卦 ${chart.hexName} × ${chart.legacyMoment} × 先天命数 ${chart.congNum}）。`, '');
  } else {
    L.push(`卦 ${chart.hexName} × ${chart.legacyMoment} × 先天命数 ${chart.congNum}（基数 ${chart.destiny.base}，序数 ${chart.destiny.seq}）`, '');
    L.push('| 类目 | 公式 | 条文与断语 |');
    L.push('|------|------|------------|');
    for (const cat of chart.destiny.categories) {
      if (!cat.entries.length) {
        L.push(`| ${cat.category} | 底本为 × | — |`);
        continue;
      }
      for (const e of cat.entries) {
        L.push(`| ${cat.category} | ${chart.destiny.base}+${chart.destiny.seq}+${e.offset}=${e.fortune} | ${mdEscape(verseCell(e.fortune, resolve))} |`);
      }
    }
    L.push('');
  }

  L.push('## 流年条文（1–100 岁）', '');
  L.push('| 岁 | 干支 | 四声 | 标记 | 字母 | 校正 | 公式 | 原条文断语 | 校正后断语 | 终局断语 |');
  L.push('|----|------|------|------|------|------|------|------------|------------|----------|');
  for (const r of chart.liunian.slice(0, 100)) {
    L.push(`| ${r.age} | ${r.ganzhi} | ${r.sound} | ${r.marker} | ${r.letter === '?' ? '—' : r.letter} | ` +
      `${r.correction ? `${r.correction}→${r.correctedCorrection}` : '—'} | ${r.formula || '—'} | ` +
      `${mdEscape(verseCell(r.fortune, resolve))} | ${mdEscape(verseCell(r.correctedFortune, resolve))} | ` +
      `${mdEscape(verseCell(r.tiebanFortune, resolve))} |`);
  }
  L.push('');

  L.push('## 口径与出处', '');
  L.push(`- 语料：${SOURCE}`);
  L.push(`- ${CALIBER}`);
  L.push(`- ${DISCLAIMER_LINE}`);
  L.push('');
  return L.join('\n');
}

/** TOON 紧凑盘面（meta/input/core/destiny/candidates/liunian，LLM 上下文就绪） */
export function chartToToon(chart: Chart, resolve: VerseResolver): string {
  const b = chart.birth;
  const q = chart.query;
  const candidates = computeQuarterCandidates(chart);
  const finalVerse = resolve(chart.finalFortuneNum);

  const payload = {
    meta: {
      format: 'tbss-chart',
      version: 1,
      generator: APP,
      agesFormat: '斜杠分隔应验岁数，- 为无',
      note: `${CALIBER}${DISCLAIMER_LINE}`,
    },
    input: {
      gender: chart.gender,
      birthSolar: b.dateStr,
      birthLunar: `${b.lunarStr}${b.isLeap ? '（闰）' : ''}`,
      birthBazi: `${b.bazi.year} ${b.bazi.month} ${b.bazi.day} ${b.bazi.time}`,
      querySolar: q.dateStr,
      queryBazi: `${q.bazi.year} ${q.bazi.month} ${q.bazi.day} ${q.bazi.time}`,
    },
    core: {
      congNum: chart.congNum,
      tone: chart.tone,
      toneNum: chart.toneNum,
      dayLife: chart.dayLife,
      timeLuck: chart.timeLuck,
      kaoke147: chart.kaokeMoment,
      kaokeGroup: chart.kaokeGroup,
      quarter: chart.quarter,
      keGanNum: chart.keGanNum,
      quarterManual: chart.quarterManual,
      legacyMoment: chart.legacyMoment,
      mainNum: chart.mainNum,
      finalFortuneNum: chart.finalFortuneNum,
      finalVerse: text(finalVerse),
      hexName: chart.hexName,
      pnNum: chart.pnNum,
      wuShuJiGong: chart.wuShuJiGong?.gua ?? '-',
      sanYuan: chart.sanYuan,
    },
    destiny: chart.destiny
      ? {
          base: chart.destiny.base,
          seq: chart.destiny.seq,
          rows: chart.destiny.categories.flatMap((c) =>
            c.entries.map((e) => ({
              category: c.category,
              offset: e.offset,
              n: e.fortune,
              text: text(resolve(e.fortune)),
              ages: ages(resolve(e.fortune)),
            })),
          ),
        }
      : '-',
    candidates: candidates.map((c) => ({
      quarter: c.quarter,
      keGan: c.keGanNum,
      moment: c.legacyMoment,
      hex: c.hexName,
      finalN: c.finalFortuneNum,
      finalText: text(resolve(c.finalFortuneNum)),
    })),
    liunian: chart.liunian.slice(0, 100).map((r) => ({
      age: r.age,
      ganzhi: r.ganzhi,
      sound: r.sound,
      marker: r.marker,
      letter: r.letter,
      corr: r.correction,
      corrected: r.correctedCorrection,
      formula: r.formula || '-',
      n: r.fortune,
      text: text(resolve(r.fortune)),
      ages: ages(resolve(r.fortune)),
      corrN: r.correctedFortune,
      corrText: text(resolve(r.correctedFortune)),
      corrAges: ages(resolve(r.correctedFortune)),
      tbN: r.tiebanFortune,
      tbText: text(resolve(r.tiebanFortune)),
      tbAges: ages(resolve(r.tiebanFortune)),
    })),
  };
  return encode(payload);
}

/** 导出文件名（出生日期 + 刻干数） */
export function exportFileName(chart: Chart, ext: 'md' | 'toon'): string {
  const d = chart.birth.dateStr.slice(0, 10);
  return `铁板排盘_${d}_刻${chart.keGanNum}.${ext}`;
}
