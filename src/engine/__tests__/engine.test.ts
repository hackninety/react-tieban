import { describe, expect, it } from 'vitest';
import { foldIncludes } from 'tbss-ts-lib';
import { toBaziInfo } from '../calendar';
import {
  applyJiaze, candidateFortunes, computeChart, computeQuarterCandidates,
  correctCorrection, sanYuanOf, scoreQuarterCandidates,
} from '../engine';

/**
 * 黄金向量：xaminxan/tiebanshenshu README 排盘示例
 * 男，出生 1924-06-15 16:00，求测 2025-04-20 10:00
 */
function goldenChart() {
  return computeChart({
    gender: '男',
    birth: toBaziInfo({ year: 1924, month: 6, day: 15, hour: 16, minute: 0 }),
    query: toBaziInfo({ year: 2025, month: 4, day: 20, hour: 10, minute: 0 }),
  });
}

describe('历法换算', () => {
  it('黄金例八字与农历', () => {
    const b = toBaziInfo({ year: 1924, month: 6, day: 15, hour: 16, minute: 0 });
    expect(`${b.bazi.year} ${b.bazi.month} ${b.bazi.day} ${b.bazi.time}`).toBe('甲子 庚午 乙丑 甲申');
    expect(b.lunarMonth).toBe(5);
    expect(b.lunarDay).toBe(14);
    expect(b.isLeap).toBe(false);
    expect(b.minutesInHour).toBe(0); // 上游偶数小时为时辰首小时约定
    const q = toBaziInfo({ year: 2025, month: 4, day: 20, hour: 10, minute: 0 });
    expect(`${q.bazi.year} ${q.bazi.month} ${q.bazi.day} ${q.bazi.time}`).toBe('乙巳 庚辰 己未 己巳');
  });

  it('晚子时移次日', () => {
    const b = toBaziInfo({ year: 1990, month: 1, day: 1, hour: 23, minute: 30 });
    expect(b.dateStr).toBe('1990-01-02 00:30');
    expect(b.minutesInHour).toBe(90);
  });
});

describe('基础排盘（黄金向量）', () => {
  const c = goldenChart();

  it('命数链：先天 11 → 五音 2 → 日命 4 时运 3 → 本命 344', () => {
    expect(c.congNum).toBe(11);
    expect(c.toneNum).toBe(2);
    expect(c.dayLife).toBe(4);
    expect(c.timeLuck).toBe(3);
    expect(c.mainNum).toBe(344);
  });

  it('考刻：14-7 初刻（阳男阴女）；八刻 初刻 刻干数 1；终局 344+1×48=392', () => {
    expect(c.kaokeMoment).toBe('初刻');
    expect(c.kaokeGroup).toBe('阳男阴女');
    expect(c.quarter).toBe('初刻');
    expect(c.keGanNum).toBe(1);
    expect(c.legacyMoment).toBe('初刻');
    expect(c.finalFortuneNum).toBe(392);
  });

  it('卦与后天命数：泰卦，后天 3（355%8），中元', () => {
    expect(c.hexName).toBe('泰');
    expect(c.pnRaw).toBe(3);
    expect(c.pnNum).toBe(3);
    expect(c.wuShuJiGong).toBeUndefined();
    expect(c.sanYuan).toBe('中元');
  });

  it('本命条文：泰 × 初刻 × 先天 11（基数 430 序数 470）', () => {
    expect(c.destiny).toBeTruthy();
    expect(c.destiny!.base).toBe(430);
    expect(c.destiny!.seq).toBe(470);
    const by = Object.fromEntries(c.destiny!.categories.map((x) => [x.category, x.entries.map((e) => e.fortune)]));
    expect(by['性格']).toEqual([9760, 1353]); // 430+470+8860 / +453
    expect(by['才能前程']).toEqual([]);       // 底本为 ×
    expect(by['财运']).toEqual([10606]);
    expect(by['兄弟个数']).toEqual([1559]);
  });
});

describe('流年（黄金向量 vs 上游 README 表）', () => {
  const c = goldenChart();
  const row = (age: number) => c.liunian[age - 1];

  // README 行：岁 干支 四声 标记 字母 校正数 校正后 公式 原条文 校正后条文
  const GOLDEN: [number, string, string, string, string, number, number, string, number, number][] = [
    [1, '甲子', '五', '土', '召', 3, 5, '1753+655', 2408, 6539],
    [2, '乙丑', '七', '石', '玄', 2, 4, '7658+493', 8151, 3274],
    [10, '癸酉', '五', '水', '刀', 6, 2, '6937+817', 7754, 9348],
    [20, '癸未', '四', '闭', '龙', 17, 20, '6632+559', 7191, 10043],
    [47, '庚戌', '六', '火', '神', 3, 6, '3254+681', 3935, 4127],
    [50, '癸丑', '七', '石', '玄', 8, 11, '9644+794', 10438, 1610],
    [78, '辛巳', '四', '收', '吏', 11, 14, '4280+816', 5096, 177],
    [99, '壬寅', '四', '开', '问', 1, 3, '3145+992', 4137, 7770],
  ];

  it.each(GOLDEN)('%i 岁 %s：%s%s→%s', (age, ganzhi, sound, marker, letter, corr, corrected, formula, fortune, correctedFortune) => {
    const r = row(age);
    expect(r.ganzhi).toBe(ganzhi);
    expect(r.sound).toBe(sound);
    expect(r.marker).toBe(marker);
    expect(r.letter).toBe(letter);
    expect(r.correction).toBe(corr);
    expect(r.correctedCorrection).toBe(corrected);
    expect(r.formula).toBe(formula);
    expect(r.fortune).toBe(fortune);
    expect(r.correctedFortune).toBe(correctedFortune);
  });

  it('88/96/100 岁：字母无匹配行（上游同为空白）', () => {
    for (const age of [88, 96, 100]) {
      const r = row(age);
      expect(r.correction).toBe(0);
      expect(r.fortune).toBe(0);
      expect(r.formula).toBe('');
    }
  });

  it('终局条文 = 原条文 + 刻干数×48（刻干 1）', () => {
    expect(row(1).tiebanFortune).toBe(2408 + 48);
    expect(row(99).tiebanFortune).toBe(4137 + 48);
    expect(row(88).tiebanFortune).toBe(0);
  });

  it('全表 108 行，四声/标记全程可查', () => {
    expect(c.liunian.length).toBe(108);
    expect(c.liunian.every((r) => r.sound !== '?')).toBe(true);
    expect(c.liunian.every((r) => r.marker !== '?')).toBe(true);
  });
});

describe('考刻对比（八刻候选）', () => {
  const c = goldenChart();
  const cands = computeQuarterCandidates(c);

  it('八刻各一套：初刻组泰卦，正刻组否卦，终局 48 阶差', () => {
    expect(cands.length).toBe(8);
    expect(cands.map((x) => x.finalFortuneNum)).toEqual([392, 440, 488, 536, 584, 632, 680, 728]);
    for (const x of cands.slice(0, 4)) {
      expect(x.legacyMoment).toBe('初刻');
      expect(x.hexName).toBe('泰');
      expect(x.destiny!.seq).toBe(470); // 泰 × 初刻 × 先天 11
    }
    for (const x of cands.slice(4)) {
      expect(x.legacyMoment).toBe('正刻');
      expect(x.hexName).toBe('否'); // 14-9 正刻 344 → 否
      expect(x.destiny!.base).toBe(490);
      expect(x.destiny!.seq).toBe(470); // 否 × 正刻 × 先天 11
    }
    // 同一先天命数下泰初/否正给出相同的性格条文号（底本互证）
    const by = (i: number) => Object.fromEntries(cands[i].destiny!.categories.map((x) => [x.category, x.entries.map((e) => e.fortune)]));
    expect(by(0)['性格']).toEqual([9760, 1353]);
    expect(by(7)['性格']).toEqual([1353, 9760]);
  });

  it('候选文本池：终局 + 本命各类目', () => {
    const pool = candidateFortunes(cands[0]);
    expect(pool[0]).toEqual({ n: 392, source: '终局条文' });
    expect(pool.some((f) => f.n === 9760 && f.source === '性格')).toBe(true);
    expect(pool.some((f) => f.n === 10606 && f.source === '财运')).toBe(true);
  });

  it('六亲评分：关键词只在命中刻计分，明细可复核', () => {
    const texts = new Map<number, string>([
      [392, '父命属马，早岁刑伤。'],
      [728, '兄弟二人，同气连枝。'],
      [9760, '水火性情发刚焚。'],
    ]);
    const scores = scoreQuarterCandidates(cands, ['属马', '兄弟二人', '无此词'], (n) => texts.get(n), foldIncludes);
    const s1 = scores.find((s) => s.keGanNum === 1)!;
    const s8 = scores.find((s) => s.keGanNum === 8)!;
    expect(s1.score).toBe(1);
    expect(s1.hits[0]).toMatchObject({ keyword: '属马', n: 392, source: '终局条文' });
    expect(s8.score).toBe(1);
    expect(s8.hits[0]).toMatchObject({ keyword: '兄弟二人', n: 728 });
    expect(scores.find((s) => s.keGanNum === 2)!.score).toBe(0); // 440 无文本
    // 繁体输入命中
    const trad = scoreQuarterCandidates(cands, ['兄弟二人'.replace('兄弟', '兄弟')], (n) => texts.get(n), foldIncludes);
    expect(trad.find((s) => s.keGanNum === 8)!.score).toBe(1);
  });

  it('手动定刻重排全盘：override 8 → 正刻系（否卦、终局 728、流年字母改走正刻）', () => {
    const o = computeChart({
      gender: '男',
      birth: toBaziInfo({ year: 1924, month: 6, day: 15, hour: 16, minute: 0 }),
      query: toBaziInfo({ year: 2025, month: 4, day: 20, hour: 10, minute: 0 }),
      quarterOverride: 8,
    });
    expect(o.quarter).toBe('正刻');
    expect(o.keGanNum).toBe(8);
    expect(o.legacyMoment).toBe('正刻');
    expect(o.hexName).toBe('否');
    expect(o.finalFortuneNum).toBe(728);
    expect(o.destiny!.base).toBe(490);
    expect(o.kaokeMoment).toBe('初刻'); // 14-7 先验不受覆盖影响
    expect(o.mainNum).toBe(344);       // 本命数不随刻变
    // 流年字母按正刻查 14-13，与初刻黄金行（召）不同
    expect(o.liunian[0].letter).not.toBe('?');
    expect(o.liunian[0].letter).not.toBe('召');
  });
});

describe('大限与流年细节', () => {
  const c = goldenChart();

  it('大限（子平顺行）：童限 1–7，首运辛未 8–17 起 1931', () => {
    expect(c.daYun.direction).toBe('顺行');
    expect(c.daYun.qiyun).toMatchObject({ years: 7, months: 4, days: 10, solar: '1931-10-25' });
    const [tong, first] = c.daYun.periods;
    expect(tong).toMatchObject({ index: 0, ganzhi: '', startAge: 1, endAge: 7, startYear: 1924 });
    expect(first).toMatchObject({ index: 1, ganzhi: '辛未', startAge: 8, endAge: 17, startYear: 1931 });
    expect(c.daYun.periods[2].ganzhi).toBe('壬申');
    // 覆盖至 108 岁
    expect(c.daYun.periods[c.daYun.periods.length - 1].endAge).toBeGreaterThanOrEqual(108);
  });

  it('女命逆行首运己巳', () => {
    const f = computeChart({
      gender: '女',
      birth: toBaziInfo({ year: 1924, month: 6, day: 15, hour: 16, minute: 0 }),
      query: toBaziInfo({ year: 2025, month: 4, day: 20, hour: 10, minute: 0 }),
    });
    expect(f.daYun.direction).toBe('逆行');
    expect(f.daYun.periods[1].ganzhi).toBe('己巳');
    expect(f.daYun.periods[1].startAge).toBe(4);
  });

  it('天地数：甲子庚午乙丑甲申 → 奇和 43 偶和 24 → 天 8 地 4', () => {
    expect(c.tianDi).toEqual({ oddSum: 43, evenSum: 24, tian: 8, di: 4 });
  });

  it('流年公历年份与当前虚岁', () => {
    expect(c.liunian[0].year).toBe(1924);
    expect(c.liunian[99].year).toBe(2023);
    expect(c.currentAge).toBe(102); // 求测 2025
  });
});

describe('规则函数', () => {
  it('校正数岁段规则', () => {
    expect(correctCorrection(3, 1)).toBe(5);   // 1–10 岁 +2
    expect(correctCorrection(6, 10)).toBe(2);  // >6 减 6
    expect(correctCorrection(8, 50)).toBe(11); // 其他 +3
    expect(correctCorrection(17, 20)).toBe(20);
    expect(correctCorrection(18, 30)).toBe(1); // >20 减 20
    expect(correctCorrection(0, 5)).toBe(0);
    expect(correctCorrection(3, 81)).toBe(5);  // 81–108 岁 +2
  });

  it('三元界定与循环外推', () => {
    expect(sanYuanOf(1900)).toBe('上元');
    expect(sanYuanOf(1924)).toBe('中元');
    expect(sanYuanOf(2024)).toBe('下元');
    expect(sanYuanOf(2044)).toBe('上元');
  });

  it('八卦加则：遇十取个位，逢六八止', () => {
    // 兑起 3：3+3=6 → 一步即止
    expect(applyJiaze(3, '兑')).toEqual({ result: 6, stop: true, iterations: 1 });
    // 乾起 36：36+1=37→7；36+7=43→3；36+3=39→9；36+9=45→5；36+5=41→1 … 循环不触 6/8
    const r = applyJiaze(1, '乾');
    expect(r.stop).toBe(false);
    expect(r.iterations).toBe(10);
    // 其他卦起 30：30+6536→个位 6 → 止
    expect(applyJiaze(6536, '泰').result).toBe(6);
  });
});
