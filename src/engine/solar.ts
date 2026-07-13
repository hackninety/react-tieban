/**
 * 真太阳时校正（与 react-8char engine/solar.ts 同口径的单点实现）：
 *   真太阳时 ≈ 当地标准时 + (经度 − 时区中央经线) × 4 分钟 + 均时差(EoT)
 * 铁板神数取数精确到刻（15 分钟），出生地经度校正直接影响八刻与时柱；
 * 求测时刻同址同校（其时辰干支参与日命/时运取数）。
 */

export interface DateInput { year: number; month: number; day: number; hour: number; minute: number }

export interface SolarTimeInfo {
  applied: boolean;
  /** 地名标注（城市或「经度 X°」） */
  place?: string;
  longitude?: number;
  utcOffset?: number;
  /** 总偏移（分钟） */
  offsetMinutes?: number;
  /** 地方时差部分（分钟） */
  longitudeMinutes?: number;
  /** 均时差部分（分钟，一位小数） */
  eotMinutes?: number;
  /** 校正前时刻 YYYY-MM-DD HH:mm */
  original?: string;
}

function dayOfYear(year: number, month: number, day: number): number {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
}

/**
 * 均时差（Equation of Time，分钟，可为负）。
 * Whitman/SPA 简式：B = 2π(N−81)/364，EoT ≈ 9.87·sin2B − 7.53·cosB − 1.5·sinB，
 * 精度约 ±0.5 分钟，满足分钟级排盘需求（全年约 −14 ~ +16 分钟）。
 */
export function equationOfTimeMinutes(year: number, month: number, day: number): number {
  const b = (2 * Math.PI * (dayOfYear(year, month, day) - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** 真太阳时总偏移（分钟）：地方时差 (经度−中央经线)×4 + 均时差 */
export function getTrueSolarOffset(
  year: number, month: number, day: number, longitude: number, tzMeridian = 120,
): { total: number; longitudeMinutes: number; eotMinutes: number } {
  const lngMin = (longitude - tzMeridian) * 4;
  const eot = equationOfTimeMinutes(year, month, day);
  return {
    total: Math.round(lngMin + eot),
    longitudeMinutes: Math.round(lngMin),
    eotMinutes: Math.round(eot * 10) / 10,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 以指定 UTC 偏移（小时）表达「此刻」的墙钟时间（datetime-local 值）。
 * 缺省用浏览器本地时区——排盘输入是墙钟时刻，浏览器在异地时区时，
 * 「此刻」应按盘面时区（城市模式恒 UTC+8，手动模式取所填时区）换算填入。
 */
export function nowStringForOffset(offsetHours?: number, now: Date = new Date()): string {
  const d = offsetHours === undefined
    ? now
    : new Date(now.getTime() + (offsetHours * 60 + now.getTimezoneOffset()) * 60000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 浏览器时区描述：UTC 偏移小时 + IANA 名（如 8 / Asia/Shanghai） */
export function browserTimezone(): { offsetHours: number; iana: string } {
  return {
    offsetHours: -new Date().getTimezoneOffset() / 60,
    iana: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '未知',
  };
}

/**
 * 施加真太阳时校正：返回校正后时刻分量与校正信息。
 * @param longitude 出生地经度（东经正、西经负）；undefined 则不校正
 * @param utcOffset 出生地时区 UTC 偏移小时（缺省 8 北京时 → 中央经线 120°E）
 */
export function applySolarCorrection(
  input: DateInput,
  longitude?: number,
  utcOffset = 8,
  place?: string,
): { corrected: DateInput; info: SolarTimeInfo } {
  if (longitude === undefined || Number.isNaN(longitude)) {
    return { corrected: input, info: { applied: false } };
  }
  const tzMeridian = utcOffset * 15;
  const off = getTrueSolarOffset(input.year, input.month, input.day, longitude, tzMeridian);
  const dt = new Date(input.year, input.month - 1, input.day, input.hour, input.minute);
  dt.setMinutes(dt.getMinutes() + off.total);
  return {
    corrected: {
      year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(),
      hour: dt.getHours(), minute: dt.getMinutes(),
    },
    info: {
      applied: true,
      place: place ?? `经度${longitude}°`,
      longitude,
      utcOffset,
      offsetMinutes: off.total,
      longitudeMinutes: off.longitudeMinutes,
      eotMinutes: off.eotMinutes,
      original: `${input.year}-${pad(input.month)}-${pad(input.day)} ${pad(input.hour)}:${pad(input.minute)}`,
    },
  };
}
