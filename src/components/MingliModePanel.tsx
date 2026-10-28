import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { CaseReference } from 'mingli-cases-react';
import type { MingliModeGate, MingliModeState } from '../utils/mingli-mode';
import './MingliModePanel.css';

// 仅 React.lazy 真正挂载时加载界面；仅界面请求时加载数据模块。
const MingliCaseLibrary = lazy(() => import('mingli-cases-react').then((module) => ({ default: module.MingliCaseLibrary })));
const loadLibrary = () => import('mingli-cases-ts-lib');

class LibraryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert">命例库暂时加载失败。可关闭算命模式后重试，原有排盘与导出仍可使用。</p>
      : this.props.children;
  }
}

interface Props {
  gate: MingliModeGate;
  state: MingliModeState;
  context: unknown;
}

export function MingliModePanel({ gate, state, context }: Props) {
  const current = Object.is(state.context, context);
  const enabled = current && state.enabled;
  const ticket = useMemo(() => ({ context, revision: state.revision }), [context, state.revision]);
  const guardedLoader = useMemo(() => () => gate.loadLibrary(ticket, loadLibrary), [gate, ticket]);
  const receiveReference = useMemo(
    () => (reference: CaseReference | null) => gate.receiveReference(ticket, reference),
    [gate, ticket],
  );

  return (
    <div className="mingli-mode">
      <label className="mingli-mode-switch">
        <input type="checkbox" checked={enabled} onChange={(event) => gate.setEnabled(event.target.checked)} />
        <span>算命模式</span>
      </label>
      <p className="mingli-mode-hint">开启后可选用命例库作人生主题参考；当前排盘的时间、出生资料与算法口径保持原样。</p>
      {enabled && (
        <div className="mingli-mode-content">
          <button type="button" className="mingli-mode-open" aria-expanded={state.expanded}
            onClick={() => gate.setExpanded(!state.expanded)}>
            {state.expanded ? '收起命例库' : '展开命例库'}
          </button>
          {state.reference && (
            <p role="status" className="mingli-mode-selection">
              AI 参考：{state.reference.title}
              <button type="button" onClick={() => gate.clearReference()}>清除引用</button>
            </p>
          )}
          {state.expanded && (
            <LibraryBoundary key={state.revision}>
              <Suspense fallback={<p role="status">正在加载命例库…</p>}>
                <MingliCaseLibrary loadLibrary={guardedLoader} onReferenceChange={receiveReference}
                  preferredChart="bazi" title="命例库 · 人生主题参考" />
              </Suspense>
            </LibraryBoundary>
          )}
        </div>
      )}
    </div>
  );
}
