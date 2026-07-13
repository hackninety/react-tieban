import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getVolumes } from 'tbss-ts-lib';
import { getVersesByAge, searchVerses, type Verse } from 'tbss-ts-lib/verses';

/** 检索：断语全文（繁简折叠、可限某集）＋ 按岁数反查年龄注记条文 */
export default function Search() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'age' ? 'age' : 'text';
  const q = params.get('q') ?? '';
  const scope = params.get('vol') ?? '';
  const [input, setInput] = useState(q);
  const [hits, setHits] = useState<Verse[]>();
  const [busy, setBusy] = useState(false);
  const volumes = getVolumes();

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    let on = true;
    if (!q.trim()) { setHits(undefined); return; }
    setBusy(true);
    const run = mode === 'age'
      ? getVersesByAge(Number(q))
      : searchVerses(q, { limit: 100, volumes: scope ? [scope] : undefined });
    run.then((list) => { if (on) { setHits(list); setBusy(false); } });
    return () => { on = false; };
  }, [q, mode, scope]);

  const submit = () => {
    if (!input.trim()) return;
    setParams({ mode, q: input.trim(), ...(scope ? { vol: scope } : {}) });
  };

  return (
    <div className="page cols">
      <aside className="side">
        <div className="tabs">
          <button className={mode === 'text' ? 'active' : ''}
            onClick={() => setParams({ ...(q ? { q } : {}), ...(scope ? { vol: scope } : {}) })}>全文</button>
          <button className={mode === 'age' ? 'active' : ''}
            onClick={() => setParams({ mode: 'age', ...(q && /^\d+$/.test(q) ? { q } : {}) })}>按岁</button>
        </div>

        <input className="search-box"
          inputMode={mode === 'age' ? 'numeric' : undefined}
          placeholder={mode === 'age' ? '岁数（如 47）' : '断语全文（如 姻缘 / 殘花）'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />

        {mode === 'text' && (
          <select value={scope} onChange={(e) => setParams({ ...(q ? { q } : {}), ...(e.target.value ? { vol: e.target.value } : {}) })}>
            <option value="">全部十二集</option>
            {volumes.map((v) => <option key={v.slug} value={v.slug}>{v.name}</option>)}
          </select>
        )}

        <p className="muted">
          {mode === 'text'
            ? '繁简折叠：繁体输入亦命中简体断语；命中上限 100 条。'
            : '按年龄注记反查：列出该岁数下全部流年应验条文。'}
        </p>
      </aside>

      <main className="main results">
        {!q && <p className="muted">输入{mode === 'age' ? '岁数' : '关键词'}回车检索。</p>}
        {busy && <p className="muted">检索中（按集渐进加载）…</p>}

        {hits && !busy && (
          <section>
            <h3>{mode === 'age' ? `${q} 岁应验条文` : `「${q}」`} · {hits.length} 条{mode === 'text' && hits.length >= 100 ? '（已达上限）' : ''}</h3>
            <ol className="verse-list">
              {hits.map((v) => (
                <li key={v.n}>
                  <Link className="verse-n" to={`/v/${v.n}`}>{v.n}</Link>
                  <span className="verse-text">{v.text}</span>
                  <span className="verse-ages">{v.ages.length > 0 && `${v.ages.join('，')}岁`}<span className="muted"> · {v.volume}</span></span>
                </li>
              ))}
            </ol>
            {hits.length === 0 && <p className="muted">无命中。</p>}
          </section>
        )}
      </main>
    </div>
  );
}
