import { useCallback, useEffect, useState } from 'react';

/** 三档主题：铁（护眼铁青，默认）→ 雪（明亮）→ 玄（墨夜） */
export type ThemeName = 'tie' | 'xue' | 'xuan';
export const THEME_ORDER: ThemeName[] = ['tie', 'xue', 'xuan'];
export const THEME_LABEL: Record<ThemeName, string> = { tie: '铁', xue: '雪', xuan: '玄' };

const KEY = 'tieban.theme';

function readStored(): ThemeName {
  if (typeof window === 'undefined') return 'tie';
  const t = localStorage.getItem(KEY);
  return t === 'xue' || t === 'xuan' ? t : 'tie';
}

/** 主题状态：写入 <html data-theme> 并持久化（index.html 有防闪烁预置脚本） */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(readStored);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((t) => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length]);
  }, []);

  return { theme, cycle };
}
