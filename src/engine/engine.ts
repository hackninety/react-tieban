/**
 * 铁板神数考刻推演引擎 —— xaminxan/tiebanshenshu 算法的 TypeScript 移植，
 * 叠加 Nanphy/TiebanshenshuOS v2 的八刻细分、终局公式、五数寄宫与八卦加则。
 * 纯同步函数：查表走 tbss-ts-lib/tables（src/engine/data.ts），断语文本由调用方
 * 用 tbss-ts-lib/verses 批量补齐（enrich 于页面层）。
 *
 * 与上游的两处明示取齐（详见 README「排盘」节）：
 * - 八刻计分沿用上游「偶数小时为时辰首小时」的约定（黄金例 16:00 → 初刻）；
 * - 卦象/流年字母查表用八刻归并刻（刻干数≤4 → 初刻，否则正刻），本命条文（14-10）
 *   沿用 14-7 考刻规则定初/正刻 —— 两处各随其上游实现。
 * 各派铁板神数口诀不一，本引擎忠实于所据开源实现，仅供研究。
 */
import { EIGHT_QUARTERS, quarterOfMinute } from 'tbss-ts-lib/tables';
import type { BaziInfo } from './calendar';
import { getMaps, HOU_TIAN_GUA_NUM, NAYIN_WUXING } from './data';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface ChartInput {
  gender: '男' | '女';
  birth: BaziInfo;
  query: BaziInfo;
}

export interface LiunianRow {
  age: number;
  ganzhi: string;
  sound: string;
  marker: string;
  letter: string;
  /** 原条文校正数（14-14） */
  correction: number;
  /** 岁段规则校正后的校正数 */
  correctedCorrection: number;
  /** 基数+加数 公式串（如 1753+655） */
  formula: string;
  /** 原条文号（0 表示无） */
  fortune: number;
  /** 校正后条文号（0 表示无） */
  correctedFortune: number;
  /** 终局条文号 = 原条文 + 刻干数×48（Nanphy 核心公式；0 表示无） */
  tiebanFortune: number;
  /** 八卦加则演变结果（-1 表示无输入） */
  jiazeResult: number;
  jiazeStop: boolean;
}

export interface DestinyVerses {
  base: number;
  seq: number;
  /** 类目 → 各偏移的条文号（base+seq+offset） */
  categories: { category: string; entries: { offset: number; fortune: number }[] }[];
}

export interface Chart {
  gender: '男' | '女';
  birth: BaziInfo;
  query: BaziInfo;
  /** 先天命数（月值+3−时支值，≤0 加 12） */
  congNum: number;
  tone: string;
  toneNum: number;
  dayLife: number;
  timeLuck: number;
  /** 14-7 考刻（初刻/正刻）与分组 */
  kaokeMoment: string;
  kaokeGroup: string;
  /** 八刻细分（出生分钟）与刻干数 1–8 */
  quarter: string;
  keGanNum: number;
  /** 八刻归并刻（≤4 → 初刻），卦象/流年字母查表用 */
  legacyMoment: string;
  mainNum: number;
  /** 终局条文数 = 本命数 + 刻干数×48 */
  finalFortuneNum: number;
  hexName: string;
  /** 本命条文（14-10，键：卦 × 14-7 刻 × 先天命数；无匹配为 undefined） */
  destiny?: DestinyVerses;
  /** 后天命数（含五数寄宫后的实际值） */
  pnNum: number;
  pnRaw: number;
  /** 五数寄宫说明（未触发为 undefined） */
  wuShuJiGong?: { gua: string; basis: string };
  sanYuan: string;
  /** 八卦加则起始数与口诀 */
  jiazeStart: number;
  liunian: LiunianRow[];
}

function ganGroup(gan: string): string {
  const i = STEMS.indexOf(gan);
  return i < 0 ? '甲己' : ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'][i % 5];
}

function branchGroup(zhi: string): string {
  for (const g of ['寅午戌', '申子辰', '巳酉丑', '亥卯未']) if (g.includes(zhi)) return g;
  return '未知';
}

function stemGroup(gan: string): string {
  for (const g of ['甲乙丙丁', '戊己', '庚辛', '壬癸']) if (g.includes(gan)) return g;
  return '未知';
}

const isYangStem = (gan: string) => ['甲', '丙', '戊', '庚', '壬'].includes(gan);

/** 流年校正数岁段规则（上游 calculate_correction） */
export function correctCorrection(correction: number, age: number): number {
  if (correction === 0) return 0;
  if ((age >= 1 && age <= 10) || (age >= 81 && age <= 108)) {
    const v = correction + 2;
    return v > 6 ? v - 6 : v;
  }
  const v = correction + 3;
  return v > 20 ? v - 20 : v;
}

/** 三元（上元 1864–1923 / 中元 1924–1983 / 下元 1984–2043，循环外推） */
export function sanYuanOf(year: number): string {
  const offset = ((year - 1864) % 180 + 180) % 180;
  return offset < 60 ? '上元' : offset < 120 ? '中元' : '下元';
}

function wuShuJiGongGua(sanYuan: string, gender: string, isYang: boolean): string {
  if (sanYuan === '上元') return gender === '男' ? '艮' : '坤';
  if (sanYuan === '中元') {
    return (gender === '男' && isYang) || (gender === '女' && !isYang) ? '艮' : '坤';
  }
  if (sanYuan === '下元') return gender === '男' ? '离' : '兑';
  return '坤';
}

/** 八卦加则：起始数（乾 36 / 兑 3 / 其余 30）叠加，遇十取个位，逢六八止 */
export function applyJiaze(num: number, hexName: string): { result: number; stop: boolean; iterations: number } {
  const start = hexName === '乾' ? 36 : hexName === '兑' ? 3 : 30;
  let cur = num;
  for (let i = 1; i <= 10; i++) {
    cur = start + cur;
    if (cur >= 10) cur = cur % 10;
    if (cur === 6 || cur === 8) return { result: cur, stop: true, iterations: i };
  }
  return { result: cur, stop: false, iterations: 10 };
}

/** 主推演（纯同步，仅产出数字与查表结果；断语文本另行补齐） */
export function computeChart(input: ChartInput): Chart {
  const m = getMaps();
  const { gender, birth, query } = input;
  const yGan = birth.bazi.year[0];
  const yZhi = birth.bazi.year[1];
  const tZhi = birth.bazi.time[1];
  const dDay = birth.bazi.day;
  const qGan = query.bazi.time[0];
  const qTime = query.bazi.time;

  // Step 1 先天命数：闰月进位（>12 归 1），月值 + 3 − 时支值
  const mIdx = birth.lunarMonth + (birth.isLeap ? 1 : 0);
  const calcMonth = mIdx > 12 ? '1' : String(mIdx);
  const monthVal = m.monthVal.get(calcMonth) ?? Number(calcMonth);
  const timeVal = m.hourVal.get(tZhi) ?? 0;
  let congNum = monthVal + 3 - timeVal;
  if (congNum <= 0) congNum += 12;

  // Step 2 五音命数：先天命数对 × 年干五合组
  const tone = m.wuyin.get(congNum)?.get(ganGroup(yGan)) ?? '宫';
  const toneNum = m.wuyinVal.get(tone) ?? 5;

  // Step 3 日命数（出生日柱纳音 × 求测时干）/ 时运数（求测时柱纳音）
  const dayLife = m.dayLife.get(NAYIN_WUXING[dDay] ?? '金')?.get(qGan) ?? 0;
  const timeLuck = m.hourFortune.get(NAYIN_WUXING[qTime] ?? '金') ?? 0;

  // Step 4 考刻：14-7（阳男阴女 × 和值）+ 八刻细分（出生分钟）
  const sumVal = dayLife + timeLuck;
  const isYang = isYangStem(yGan);
  const kaokeGroup = (gender === '男' && isYang) || (gender === '女' && !isYang) ? '阳男阴女' : '阴男阳女';
  const cond = sumVal > 6 ? '>6' : '<=6';
  const kaokeMoment = m.kaokeRules.find((r) => r.group === kaokeGroup && r.cond === cond)?.moment ?? '正刻';
  const quarter = quarterOfMinute(birth.minutesInHour) ?? EIGHT_QUARTERS[EIGHT_QUARTERS.length - 1];
  const keGanNum = quarter.value;
  const legacyMoment = keGanNum <= 4 ? '初刻' : '正刻';

  // Step 5 本命数与终局条文数
  const baseVal = toneNum * 5 + dayLife + timeLuck;
  const fact = sumVal <= 6 ? baseVal - 1 : baseVal - 6;
  const mainNum = fact * 30 + birth.lunarDay;
  const finalFortuneNum = mainNum + keGanNum * 48;

  // Step 6 卦名（14-9：归并刻 → 简表兜底）
  const hexName = m.hexDetail.get(`${legacyMoment}|${mainNum}`) ?? m.hexSimple.get(mainNum) ?? '未知';

  // 本命条文（14-10：卦 × 14-7 刻 × 先天命数）
  const momentKey = kaokeMoment === '初刻' ? 'Initial' : 'Main';
  const pack = m.destiny.get(`${hexName}|${momentKey}|${congNum}`);
  const destiny: DestinyVerses | undefined = pack && {
    base: pack.base,
    seq: pack.seq,
    categories: (Object.keys(pack.offsets) as (keyof typeof pack.offsets)[]).map((category) => ({
      category,
      entries: pack.offsets[category].map((offset) => ({ offset, fortune: pack.base + pack.seq + offset })),
    })),
  };

  // Step 7 后天命数（+五数寄宫）
  const pnRaw = (congNum + mainNum) % 8 === 0 ? 8 : (congNum + mainNum) % 8;
  const sanYuan = sanYuanOf(Number(birth.dateStr.slice(0, 4)));
  let pnNum = pnRaw;
  let wuShuJiGong: Chart['wuShuJiGong'];
  if (pnRaw === 5) {
    const gua = wuShuJiGongGua(sanYuan, gender, isYang);
    pnNum = HOU_TIAN_GUA_NUM[gua] ?? 5;
    wuShuJiGong = { gua, basis: `${sanYuan} ${gender} ${isYang ? '阳' : '阴'}` };
  }

  // Step 8 流年（1–108 岁）
  const start = m.liunianStart.get(`${branchGroup(yZhi)}|${gender}`) ?? 0;
  let finalSeq: string[] | undefined;
  if (start !== 0) {
    const raw = m.liunianSeq.get(`${congNum}|${yGan}`) ?? m.liunianSeq.get(`${congNum}|${stemGroup(yGan)}`);
    if (raw && raw.length >= 12) {
      const off = (13 - start) % 12;
      finalSeq = Array.from({ length: 12 }, (_, i) => raw[(i + off) % 12]);
    }
  }
  const stTg = STEMS.indexOf(yGan);
  const stDz = BRANCHES.indexOf(yZhi);
  const liunian: LiunianRow[] = [];
  for (let age = 1; age <= 108; age++) {
    const ganzhi = STEMS[(stTg + age - 1) % 10] + BRANCHES[(stDz + age - 1) % 12];
    const sound = finalSeq ? finalSeq[(age - 1) % 12] : '?';
    const marker = m.marker.get(`${ganzhi[1]}|${pnNum}`) ?? '?';
    const parity = age % 2 !== 0 ? '奇数' : '偶数';
    const letter = m.letter.get(`${legacyMoment}|${parity}|${sound}|${marker}`) ?? '?';

    let correction = 0;
    let correctedCorrection = 0;
    let formula = '';
    let fortune = 0;
    let correctedFortune = 0;
    let tiebanFortune = 0;
    const hit = letter !== '?' ? m.byLetter.get(`${letter}|${age}`) : undefined;
    if (hit) {
      const [base, add, corr] = hit;
      correction = corr;
      formula = `${base}+${add}`;
      fortune = base + add;
      correctedCorrection = correctCorrection(corr, age);
      const corrHit = correctedCorrection > 0 ? m.byCorrection.get(`${correctedCorrection}|${age}`) : undefined;
      if (corrHit) correctedFortune = corrHit[0] + corrHit[1];
      tiebanFortune = fortune + keGanNum * 48;
    }
    const jiaze = correctedFortune > 0 ? applyJiaze(correctedFortune, hexName) : undefined;

    liunian.push({
      age, ganzhi, sound, marker, letter,
      correction, correctedCorrection, formula,
      fortune, correctedFortune, tiebanFortune,
      jiazeResult: jiaze?.result ?? -1,
      jiazeStop: jiaze?.stop ?? false,
    });
  }

  return {
    gender, birth, query,
    congNum, tone, toneNum, dayLife, timeLuck,
    kaokeMoment, kaokeGroup, quarter: quarter.name, keGanNum, legacyMoment,
    mainNum, finalFortuneNum, hexName, destiny,
    pnNum, pnRaw, wuShuJiGong, sanYuan,
    jiazeStart: hexName === '乾' ? 36 : hexName === '兑' ? 3 : 30,
    liunian,
  };
}
