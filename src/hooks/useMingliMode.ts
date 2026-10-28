import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createMingliModeGate } from '../utils/mingli-mode';

/** 不持久化开启状态；换盘默认回到普通占事，旧引用立即失效。 */
export function useMingliMode(context: unknown) {
  const [gate] = useState(() => createMingliModeGate(context));
  const state = useSyncExternalStore(gate.subscribe, gate.getSnapshot, gate.getSnapshot);
  useLayoutEffect(() => {
    gate.setContext(context);
  }, [context, gate]);
  useLayoutEffect(() => () => gate.setEnabled(false), [gate]);
  return { gate, state, context };
}
