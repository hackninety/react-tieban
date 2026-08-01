import { describe, expect, it } from 'vitest';
import { AI_ANALYST_ROLE, TOON_SYNTAX_HINT, generateAIPrompt } from '../prompt';

describe('AI 分析提示词', () => {
  it('TOON 口径：角色 + 语法提示 + 数据围栏 + 框架/纪律/追问齐备', () => {
    const p = generateAIPrompt('meta:\n  format: tbss-chart', 'toon');
    expect(p).toContain(AI_ANALYST_ROLE);
    expect(p).toContain(TOON_SYNTAX_HINT);
    expect(p).toContain('```toon\nmeta:');
    expect(p).toContain('## 请按以下框架逐项展开分析');
    expect(p).toContain('## 分析纪律（务必遵守）');
    expect(p).toContain('## 追问协议');
    expect(p).toContain('仅供文献研究');
  });

  it('Markdown 口径：markdown 围栏且不含 TOON 语法提示', () => {
    const p = generateAIPrompt('# 铁板神数排盘', 'md');
    expect(p).toContain('```markdown\n# 铁板神数排盘');
    expect(p).not.toContain(TOON_SYNTAX_HINT);
  });

  it('两口径共用同一分析指引（框架/纪律/追问一处维护）', () => {
    const tail = (s: string) => s.slice(s.indexOf('## 请按以下框架'));
    expect(tail(generateAIPrompt('x', 'toon'))).toBe(tail(generateAIPrompt('x', 'md')));
  });
});
