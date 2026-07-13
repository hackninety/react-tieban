/** 锈朱印章装饰（text 1–4 字，2 字纵排、4 字田字格） */
export function Seal({ text = '铁数', size = 40 }: { text?: string; size?: number }) {
  const chars = [...text].slice(0, 4);
  return (
    <span
      className={`seal${chars.length > 2 ? ' seal-grid' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {chars.map((c, i) => <span key={i}>{c}</span>)}
    </span>
  );
}
