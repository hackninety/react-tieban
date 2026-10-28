import type { CaseReference } from 'mingli-cases-react';

interface ModeTicket {
  context: unknown;
  revision: number;
}

export interface MingliModeState extends ModeTicket {
  enabled: boolean;
  expanded: boolean;
  reference: CaseReference | null;
}

/** 会话门控与 React 解耦：异步复制、模块加载及晚到的引用回调共用同一版本。 */
export function createMingliModeGate(context: unknown) {
  let state: MingliModeState = { context, revision: 0, enabled: false, expanded: false, reference: null };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<MingliModeState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const isCurrent = (ticket: ModeTicket) =>
    state.enabled && Object.is(state.context, ticket.context) && state.revision === ticket.revision;

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setEnabled(enabled: boolean) {
      if (state.enabled === enabled) return;
      update({ enabled, expanded: false, reference: null, revision: state.revision + 1 });
    },
    setExpanded(expanded: boolean) {
      if (state.enabled && state.expanded !== expanded) update({ expanded });
    },
    setContext(next: unknown) {
      if (!Object.is(state.context, next)) {
        update({ context: next, enabled: false, expanded: false, reference: null, revision: state.revision + 1 });
      }
    },
    receiveReference(ticket: ModeTicket, reference: CaseReference | null) {
      if (isCurrent(ticket)) update({ reference: reference?.mode === 'reference' ? reference : null });
    },
    clearReference() {
      // 外层清除同时使库内选中状态重新挂载，避免内外提示不一致。
      if (state.enabled) update({ reference: null, revision: state.revision + 1 });
    },
    async loadLibrary<T>(ticket: ModeTicket, loader: () => Promise<T>): Promise<T> {
      if (!isCurrent(ticket) || !state.expanded) throw new Error('请先开启算命模式并展开命例库');
      const library = await loader();
      if (!isCurrent(ticket) || !state.expanded) throw new Error('命例库会话已关闭');
      return library;
    },
    appendReference(prompt: string, ticket: ModeTicket): string {
      const reference = state.reference;
      if (!isCurrent(ticket) || !reference?.text.trim()) return prompt;
      return `${prompt}\n\n## 算命模式 · 独立命例参考\n以下内容属于另一位命主，仅用于人生主题的案例比较，不是当前求测人的事实。不得把案例中的经历、结果或身份迁移到本盘；不得把起课时间当作出生时间，也不得将八字案例当作本术数的原典或算法验证。\n案例：${reference.title}（${reference.caseId}）\n来源：${reference.sourceUrl}\n资料集：${reference.collectionId}；版本：${reference.sourceRevision}\n\n${reference.text}`;
    },
  };
}

export type MingliModeGate = ReturnType<typeof createMingliModeGate>;
