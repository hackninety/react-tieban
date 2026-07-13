import { useSearchParams } from 'react-router-dom';
import { CORE_FORMULA, EIGHT_QUARTERS, TAIXUAN_RHYME, getTable, getTables } from 'tbss-ts-lib/tables';

/** 取数表：十四考 15 张侧栏切换，通用表格直渲；页头常驻八刻/公式/太玄数 */
export default function Tables() {
  const [params, setParams] = useSearchParams();
  const tables = getTables();
  const id = params.get('t') ?? tables[0].id;
  const table = getTable(id) ?? tables[0];

  return (
    <div className="page cols">
      <aside className="side">
        <ul className="entity-list">
          {tables.map((t) => (
            <li key={t.id} className={t.id === table.id ? 'active' : ''} onClick={() => setParams({ t: t.id })}>
              <b>{t.id}</b> {t.title}
              <span className="muted"> · {t.rows.length} 行</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        <div className="main-head">
          <h2>{table.title}</h2>
          <span className="badge">{table.id}</span>
          <span className="muted">{table.rows.length} 行</span>
        </div>
        <p className="muted">{table.description}</p>

        {table.slug === 'kaoke' && (
          <>
            <div className="formula">{CORE_FORMULA} —— 刻干数即八刻细分（1–8）</div>
            <div className="dtable-wrap">
              <table className="dtable">
                <thead><tr><th>刻别</th><th>时辰内分钟</th><th>天干</th><th>刻干数</th></tr></thead>
                <tbody>
                  {EIGHT_QUARTERS.map((qt) => (
                    <tr key={qt.name}>
                      <td>{qt.name}</td><td>{qt.fromMinute}–{qt.toMinute}</td><td>{qt.stem}</td><td>{qt.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {table.slug === 'month' && <div className="formula">太玄数：{TAIXUAN_RHYME}</div>}

        <div className="dtable-wrap">
          <table className="dtable">
            <thead>
              <tr>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>
                      {cell.includes('\n')
                        ? cell.split('\n').map((x, k) => <span className="mv" key={k}>{x}</span>)
                        : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
