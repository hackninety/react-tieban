/**
 * 查表层：把 tbss-ts-lib/tables 的十四考通用表格建成推演用映射，
 * 键结构与上游 TieBanDataLoader 一一对应（xaminxan/Nanphy main.py）。
 * 全部惰性单例构建，构建后为纯只读查询。
 */
import { getTable } from 'tbss-ts-lib/tables';

/** 六十甲子纳音五行（单字，上游 NAYIN_WUXING 照搬） */
export const NAYIN_WUXING: Record<string, string> = {
  甲子: '金', 乙丑: '金', 丙寅: '火', 丁卯: '火', 戊辰: '木', 己巳: '木',
  庚午: '土', 辛未: '土', 壬申: '金', 癸酉: '金', 甲戌: '火', 乙亥: '火',
  丙子: '水', 丁丑: '水', 戊寅: '土', 己卯: '土', 庚辰: '金', 辛巳: '金',
  壬午: '木', 癸未: '木', 甲申: '水', 乙酉: '水', 丙戌: '土', 丁亥: '土',
  戊子: '火', 己丑: '火', 庚寅: '木', 辛卯: '木', 壬辰: '水', 癸巳: '水',
  甲午: '金', 乙未: '金', 丙申: '火', 丁酉: '火', 戊戌: '木', 己亥: '木',
  庚子: '土', 辛丑: '土', 壬寅: '金', 癸卯: '金', 甲辰: '火', 乙巳: '火',
  丙午: '水', 丁未: '水', 戊申: '土', 己酉: '土', 庚戌: '金', 辛亥: '金',
  壬子: '木', 癸丑: '木', 甲寅: '水', 乙卯: '水', 丙辰: '土', 丁巳: '土',
  戊午: '火', 己未: '火', 庚申: '木', 辛酉: '木', 壬戌: '水', 癸亥: '水',
};

/** 后天卦数（五数寄宫用） */
export const HOU_TIAN_GUA_NUM: Record<string, number> = {
  坎: 1, 坤: 2, 震: 3, 巽: 4, 中: 5, 乾: 6, 兑: 7, 艮: 8, 离: 9,
};

export interface DestinyPack {
  base: number;
  seq: number;
  offsets: Record<'性格' | '才能前程' | '财运' | '兄弟个数', number[]>;
}

export interface KaokeRule { group: string; cond: string; moment: string }

interface Maps {
  monthVal: Map<string, number>;
  hourVal: Map<string, number>;
  /** 先天命数 → 干组 → 五音 */
  wuyin: Map<number, Map<string, string>>;
  wuyinVal: Map<string, number>;
  /** 纳音 → 日干 → 日命数 */
  dayLife: Map<string, Map<string, number>>;
  hourFortune: Map<string, number>;
  kaokeRules: KaokeRule[];
  /** `${刻别}|${本命数}` → 卦名（14-9 详表） */
  hexDetail: Map<string, string>;
  /** 本命数 → 卦名（14-9 首次出现，上游 HEXAGRAM_MAP 兼容路径） */
  hexSimple: Map<number, string>;
  /** `${卦}|${Initial/Main}|${先天命数}` → 本命条文数据（14-10） */
  destiny: Map<string, DestinyPack>;
  /** `${年支组}|${性别}` → 起始数（14-11-1） */
  liunianStart: Map<string, number>;
  /** `${先天命数}|${天干}` → 四声序列 ×12（14-11-2） */
  liunianSeq: Map<string, string[]>;
  /** `${流年地支}|${后天命数}` → 流年标记（14-12） */
  marker: Map<string, string>;
  /** `${刻}|${奇偶}|${四声}|${标记}` → 流年字母（14-13） */
  letter: Map<string, string>;
  /** `${字母}|${岁}` → [基数, 加数, 条文校正数]（14-14） */
  byLetter: Map<string, [number, number, number]>;
  /** `${校正数}|${岁}` → [基数, 加数] */
  byCorrection: Map<string, [number, number]>;
  /** `${校正数}|${岁}` → 字母 */
  corrToLetter: Map<string, string>;
}

let maps: Maps | undefined;

function rows(idOrSlug: string): string[][] {
  const t = getTable(idOrSlug);
  if (!t) throw new Error(`取数表缺失：${idOrSlug}`);
  return t.rows;
}

/** 多值单元格（\n / 全角逗号 / | 分隔）→ 数字数组 */
function parseNums(cell: string): number[] {
  return cell.split(/[\n，|]/).map((x) => x.trim()).filter((x) => /^\d+$/.test(x)).map(Number);
}

function build(): Maps {
  const monthVal = new Map(rows('14-1').map((r) => [r[0], Number(r[1])] as const));
  const hourVal = new Map(rows('14-2').map((r) => [r[0], Number(r[1])] as const));

  const wuyinTable = getTable('14-3')!;
  const wuyin = new Map<number, Map<string, string>>();
  for (const r of wuyinTable.rows) {
    const tones = new Map<string, string>();
    wuyinTable.columns.slice(1).forEach((group, i) => tones.set(group, r[i + 1]));
    for (const n of r[0].split('|').map(Number)) wuyin.set(n, tones);
  }

  const wuyinVal = new Map(rows('14-4').map((r) => [r[0], Number(r[1])] as const));

  const dayLifeTable = getTable('14-5')!;
  const dayLife = new Map<string, Map<string, number>>();
  for (const r of dayLifeTable.rows) {
    const byGan = new Map<string, number>();
    dayLifeTable.columns.slice(1).forEach((gan, i) => byGan.set(gan, Number(r[i + 1])));
    dayLife.set(r[0], byGan);
  }

  const hourFortune = new Map(rows('14-6').map((r) => [r[0], Number(r[1])] as const));

  const kaokeRules: KaokeRule[] = rows('14-7').map((r) => ({ group: r[0], cond: r[1], moment: r[2] }));

  const hexDetail = new Map<string, string>();
  const hexSimple = new Map<number, string>();
  for (const [kebie, numStr, gua] of rows('14-9')) {
    const num = Number(numStr);
    if (!Number.isInteger(num) || !gua) continue;
    hexDetail.set(`${kebie}|${num}`, gua);
    if (!hexSimple.has(num)) hexSimple.set(num, gua);
  }

  const destiny = new Map<string, DestinyPack>();
  for (const r of rows('14-10')) {
    const [gua, baseStr, chuStr, zhengStr, seqStr, xingge, caineng, caiyun, xiongdi] = r;
    const base = Number(baseStr);
    const seq = Number(seqStr);
    if (!gua || !Number.isInteger(base) || !Number.isInteger(seq)) continue;
    const pack: DestinyPack = {
      base, seq,
      offsets: { 性格: parseNums(xingge), 才能前程: parseNums(caineng), 财运: parseNums(caiyun), 兄弟个数: parseNums(xiongdi) },
    };
    for (const n of parseNums(chuStr)) destiny.set(`${gua}|Initial|${n}`, pack);
    for (const n of parseNums(zhengStr)) destiny.set(`${gua}|Main|${n}`, pack);
  }

  const liunianStart = new Map(rows('14-11-1').map((r) => [`${r[0]}|${r[1]}`, Number(r[2])] as const));

  const liunianSeq = new Map<string, string[]>();
  for (const r of rows('14-11-2')) {
    const [numStr, gan, ...seq] = r;
    if (seq.length >= 12) liunianSeq.set(`${Number(numStr)}|${gan}`, seq.slice(0, 12));
  }

  const marker = new Map(rows('14-12').map((r) => [`${r[0]}|${Number(r[1])}`, r[2]] as const));

  const letter = new Map(rows('14-13').map((r) => [`${r[0]}|${r[1]}|${r[2]}|${r[3]}`, r[4]] as const));

  const byLetter = new Map<string, [number, number, number]>();
  const byCorrection = new Map<string, [number, number]>();
  const corrToLetter = new Map<string, string>();
  for (const [corrStr, lt, ageStr, baseStr, addStr] of rows('14-14')) {
    const corr = Number(corrStr);
    const age = Number(ageStr);
    const base = Number(baseStr);
    const add = Number(addStr);
    if (!lt || !Number.isInteger(age) || age <= 0) continue;
    byLetter.set(`${lt}|${age}`, [base, add, corr]);
    byCorrection.set(`${corr}|${age}`, [base, add]);
    corrToLetter.set(`${corr}|${age}`, lt);
  }

  return {
    monthVal, hourVal, wuyin, wuyinVal, dayLife, hourFortune, kaokeRules,
    hexDetail, hexSimple, destiny, liunianStart, liunianSeq, marker, letter,
    byLetter, byCorrection, corrToLetter,
  };
}

export function getMaps(): Maps {
  return (maps ??= build());
}
