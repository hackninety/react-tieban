import { describe, expect, it, vi } from 'vitest';
import type { CaseReference } from 'mingli-cases-react';
import { createMingliModeGate } from '../mingli-mode';

const reference: CaseReference = {
  caseId: 'baziqa:test', title: '独立测试命例', text: '案例命主的经历，仅供比较',
  sourceUrl: 'https://example.com/dataset', sourceRevision: 'test-revision',
  collectionId: 'baziqa', mode: 'reference',
};

describe('算命模式门控', () => {
  it('默认关闭、即使请求也不调用数据加载器', async () => {
    const gate = createMingliModeGate('盘一');
    const loader = vi.fn(async () => ({ cases: [] }));
    expect(gate.getSnapshot()).toMatchObject({ enabled: false, expanded: false, reference: null });
    await expect(gate.loadLibrary(gate.getSnapshot(), loader)).rejects.toThrow('开启算命模式');
    expect(loader).not.toHaveBeenCalled();
    gate.receiveReference(gate.getSnapshot(), reference);
    expect(gate.appendReference('普通占事', gate.getSnapshot())).toBe('普通占事');
  });

  it('开启仍不加载数据，须再次展开；引用只附到原 Prompt 末尾', async () => {
    const gate = createMingliModeGate('盘一');
    const loader = vi.fn(async () => ({ cases: [] }));
    gate.setEnabled(true);
    const ticket = gate.getSnapshot();
    await expect(gate.loadLibrary(ticket, loader)).rejects.toThrow('展开命例库');
    expect(loader).not.toHaveBeenCalled();
    gate.setExpanded(true);
    await expect(gate.loadLibrary(ticket, loader)).resolves.toEqual({ cases: [] });
    expect(loader).toHaveBeenCalledTimes(1);
    gate.receiveReference(ticket, reference);
    const prompt = gate.appendReference('原有盘面与断法', ticket);
    expect(prompt).toMatch(/^原有盘面与断法\n\n## 算命模式/);
    expect(prompt).toContain(reference.sourceUrl);
    expect(prompt).toContain(reference.sourceRevision);
    expect(prompt).toContain('不得把案例中的经历、结果或身份迁移到本盘');
    expect(prompt).toContain(reference.text);
  });

  it('关闭立即清除引用，重新开启也不恢复旧引用或接受旧回调', () => {
    const gate = createMingliModeGate('盘一');
    gate.setEnabled(true);
    const oldTicket = gate.getSnapshot();
    gate.receiveReference(oldTicket, reference);
    gate.setEnabled(false);
    expect(gate.getSnapshot().reference).toBeNull();
    expect(gate.appendReference('普通占事', oldTicket)).toBe('普通占事');
    gate.setEnabled(true);
    gate.receiveReference(oldTicket, reference);
    expect(gate.getSnapshot().reference).toBeNull();
    expect(gate.appendReference('新会话', gate.getSnapshot())).toBe('新会话');
  });

  it('等待数据期间关闭，晚到结果被拒绝，异步复制不附旧案例', async () => {
    const gate = createMingliModeGate('盘一');
    gate.setEnabled(true);
    gate.setExpanded(true);
    const ticket = gate.getSnapshot();
    gate.receiveReference(ticket, reference);
    let complete!: (value: string) => void;
    const pending = gate.loadLibrary(ticket, () => new Promise<string>((resolve) => { complete = resolve; }));
    gate.setEnabled(false);
    complete('晚到数据');
    await expect(pending).rejects.toThrow('会话已关闭');
    gate.receiveReference(ticket, reference);
    expect(gate.appendReference('异步生成的占事 Prompt', ticket)).toBe('异步生成的占事 Prompt');
  });

  it('换盘关闭模式并拒绝原盘回调，原盘正在生成的 Prompt 不夹带新盘引用', () => {
    const first = {};
    const second = {};
    const gate = createMingliModeGate(first);
    gate.setEnabled(true);
    const oldTicket = gate.getSnapshot();
    gate.receiveReference(oldTicket, reference);
    gate.setContext(second);
    expect(gate.getSnapshot()).toMatchObject({ enabled: false, expanded: false, reference: null });
    gate.setEnabled(true);
    gate.receiveReference(gate.getSnapshot(), reference);
    expect(gate.appendReference('原盘', oldTicket)).toBe('原盘');
    gate.receiveReference(oldTicket, null);
    expect(gate.getSnapshot().reference).toBe(reference);
  });

  it('手动清除仅移除当前引用，不关闭模式', () => {
    const gate = createMingliModeGate('盘一');
    gate.setEnabled(true);
    const ticket = gate.getSnapshot();
    gate.receiveReference(ticket, reference);
    gate.clearReference();
    expect(gate.getSnapshot().enabled).toBe(true);
    gate.receiveReference(ticket, reference);
    expect(gate.getSnapshot().reference).toBeNull();
    expect(gate.appendReference('盘面', gate.getSnapshot())).toBe('盘面');
  });
});
