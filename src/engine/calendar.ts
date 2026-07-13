/**
 * 历法换算：公历时刻 → 农历 + 八字（lunar-typescript）。
 *
 * 与上游（cnlunar godType='8char'）对齐：年柱立春界、月柱节气界；
 * 晚子时（23 时后）先移至次日 00 时再换算（上游 input_datetime 同规则），
 * 已验证黄金例 1924-06-15 16:00 → 甲子 庚午 乙丑 甲申。
 */
import { Solar } from 'lunar-typescript';

export interface BaziInfo {
  /** 公历 YYYY-MM-DD HH:mm（晚子时移日后的实际排盘时刻） */
  dateStr: string;
  /** 农历月 1–12（闰月为所闰之月） */
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  lunarStr: string;
  bazi: { year: string; month: string; day: string; time: string };
  /** 出生时刻在时辰内的分钟数 0–119（八刻细分输入） */
  minutesInHour: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 公历时刻 → 八字信息（hour≥23 按次日早子时） */
export function toBaziInfo(d: { year: number; month: number; day: number; hour: number; minute: number }): BaziInfo {
  let { year, month, day, hour, minute } = d;
  if (hour >= 23) {
    const next = new Date(year, month - 1, day + 1);
    year = next.getFullYear();
    month = next.getMonth() + 1;
    day = next.getDate();
    hour = 0;
  }
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const lm = lunar.getMonth();

  // 时辰内分钟：照搬上游 get_eight_ke_from_time 的约定——偶数小时为「时辰首小时」
  // （16:00 → 0 分 → 初刻，黄金例依赖此行为；与传统时辰奇数小时起点不同，见 engine 注记）；
  // 晚子时已移日，hour=0 视为子时第二小时。
  const minutesInHour = hour === 0 ? 60 + minute : (hour % 2) * 60 + minute;

  return {
    dateStr: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`,
    lunarMonth: Math.abs(lm),
    lunarDay: lunar.getDay(),
    isLeap: lm < 0,
    lunarStr: `${lunar.getYearInChinese()}年 ${lm < 0 ? '闰' : ''}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    bazi: { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), time: ec.getTime() },
    minutesInHour,
  };
}
