import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createMingliModeGate } from '../../utils/mingli-mode';
import { MingliModePanel } from '../MingliModePanel';

const imports = vi.hoisted(() => ({ ui: vi.fn(), data: vi.fn() }));
vi.mock('mingli-cases-react', () => {
  imports.ui();
  return { MingliCaseLibrary: () => <div>测试命例库内容</div> };
});
vi.mock('mingli-cases-ts-lib', () => {
  imports.data();
  return {};
});

describe('命例库界面加载边界', () => {
  it('普通占事只渲染关闭的开关，不调用界面或数据模块', () => {
    const context = {};
    const gate = createMingliModeGate(context);
    const html = renderToString(<MingliModePanel gate={gate} state={gate.getSnapshot()} context={context} />);
    expect(html).toContain('算命模式');
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain('展开命例库');
    expect(imports.ui).not.toHaveBeenCalled();
    expect(imports.data).not.toHaveBeenCalled();
  });

  it('仅开启模式仍不加载模块，显示单独的展开入口', () => {
    const context = {};
    const gate = createMingliModeGate(context);
    gate.setEnabled(true);
    const html = renderToString(<MingliModePanel gate={gate} state={gate.getSnapshot()} context={context} />);
    expect(html).toContain('checked=""');
    expect(html).toContain('展开命例库');
    expect(imports.ui).not.toHaveBeenCalled();
    expect(imports.data).not.toHaveBeenCalled();
  });

  it('换盘渲染时即隐藏旧引用与已展开界面，不等待 effect 清理', () => {
    const gate = createMingliModeGate('旧盘');
    gate.setEnabled(true);
    gate.setExpanded(true);
    gate.receiveReference(gate.getSnapshot(), {
      caseId: 'old', title: '旧盘引用', text: '旧内容', sourceUrl: 'https://example.com',
      sourceRevision: 'rev', collectionId: 'test', mode: 'reference',
    });
    const html = renderToString(<MingliModePanel gate={gate} state={gate.getSnapshot()} context="新盘" />);
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain('旧盘引用');
    expect(imports.ui).not.toHaveBeenCalled();
    expect(imports.data).not.toHaveBeenCalled();
  });
});
