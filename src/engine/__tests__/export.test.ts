import { beforeAll, describe, expect, it } from 'vitest';
import { decode } from '@toon-format/toon';
import { loadAllVerses, type Verse } from 'tbss-ts-lib/verses';
import { toBaziInfo } from '../calendar';
import { computeChart, type Chart } from '../engine';
import { chartToMarkdown, chartToToon, exportFileName } from '../export';

let chart: Chart;
let resolve: (n: number) => Verse | undefined;

beforeAll(async () => {
  chart = computeChart({
    gender: '男',
    birth: toBaziInfo({ year: 1924, month: 6, day: 15, hour: 16, minute: 0 }),
    query: toBaziInfo({ year: 2025, month: 4, day: 20, hour: 10, minute: 0 }),
  });
  const map = new Map((await loadAllVerses()).map((v) => [v.n, v]));
  resolve = (n) => map.get(n);
});

describe('Markdown 导出', () => {
  it('黄金向量报告：八字/命数链/考刻对比/本命/流年断语齐备', () => {
    const md = chartToMarkdown(chart, resolve, { now: '2026-07-13 12:00' });
    expect(md).toContain('# 铁板神数排盘');
    expect(md).toContain('出生八字：甲子 庚午 乙丑 甲申');
    expect(md).toContain('- 本命数：344');
    expect(md).toContain('- 十二辟卦：泰');
    expect(md).toContain('344 + 1 × 48 = 392');
    // 考刻对比八行 + 当前刻标记
    expect(md).toContain('| 初刻 ● | 1 | 初刻 | 泰 |');
    expect(md).toContain('| 正刻 | 8 | 正刻 | 否 |');
    // 本命条文（泰×初刻×11）
    expect(md).toContain('基数 430，序数 470');
    expect(md).toContain('430+470+8860=9760');
    expect(md).toContain('| 才能前程 | 底本为 × | — |');
    // 流年 1 岁行三口径断语
    const row1 = md.split('\n').find((l) => l.startsWith('| 1 | 甲子 |'))!;
    expect(row1).toContain('2408 吹落黄花弄笛声，愁人听后思难禁。（1岁）');
    expect(row1).toContain('6539');
    expect(row1).toContain('2456');
    // 空白行占位与口径脚注
    const row88 = md.split('\n').find((l) => l.startsWith('| 88 | 辛卯 |'))!;
    expect(row88).toContain('| — | — | — | — | — |');
    expect(md).toContain('## 口径与出处');
    expect(md).toContain('不构成任何命运预测依据');
  });
});

describe('TOON 导出', () => {
  it('结构完整且可解码往返，比等价 JSON 更省字符', () => {
    const toon = chartToToon(chart, resolve);
    expect(toon).toContain('format: tbss-chart');
    expect(toon).toContain('liunian[100]{age,ganzhi,sound,marker,letter,corr,corrected,formula,n,text,ages,corrN,corrText,corrAges,tbN,tbText,tbAges}:');
    expect(toon).toContain('candidates[8]{quarter,keGan,moment,hex,finalN,finalText}:');

    const back = decode(toon) as Record<string, never> & {
      core: { mainNum: number; hexName: string; finalFortuneNum: number };
      destiny: { base: number; rows: { n: number; text: string }[] };
      liunian: { age: number; n: number; text: string; ages: string }[];
    };
    expect(back.core.mainNum).toBe(344);
    expect(back.core.hexName).toBe('泰');
    expect(back.core.finalFortuneNum).toBe(392);
    expect(back.destiny.base).toBe(430);
    expect(back.destiny.rows.some((r) => r.n === 9760)).toBe(true);
    expect(back.liunian.length).toBe(100);
    expect(back.liunian[0]).toMatchObject({ age: 1, n: 2408, ages: '1' });
    expect(back.liunian[0].text).toContain('吹落黄花');

    const json = JSON.stringify(decode(toon));
    expect(toon.length).toBeLessThan(json.length * 0.8); // 省 20%+ 字符
  });

  it('导出文件名', () => {
    expect(exportFileName(chart, 'md')).toBe('铁板排盘_1924-06-15_刻1.md');
    expect(exportFileName(chart, 'toon')).toBe('铁板排盘_1924-06-15_刻1.toon');
  });
});
