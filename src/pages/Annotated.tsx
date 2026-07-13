import { useMemo, useState } from 'react';
import { getAnnotated, getAnnotatedCategories, getAnnotatedMeta } from 'tbss-ts-lib/annotated';

/** 注解精选：分类页签 + 原文/今注/标签卡片（29 条，陈明点校本节录） */
export default function Annotated() {
  const meta = getAnnotatedMeta();
  const categories = getAnnotatedCategories();
  const [cat, setCat] = useState('');
  const articles = useMemo(
    () => (cat ? getAnnotated().filter((a) => a.category === cat) : getAnnotated()),
    [cat],
  );

  return (
    <div className="page">
      <div className="main-head">
        <h2>{meta.title}</h2>
        <span className="badge fid">第三方今注</span>
      </div>
      <p className="muted">{meta.source} —— {meta.note}</p>

      <div className="tabs" style={{ flexWrap: 'wrap', margin: '16px 0' }}>
        <button className={cat === '' ? 'active' : ''} onClick={() => setCat('')} style={{ flex: 'none', padding: '4px 16px' }}>全部</button>
        {categories.map((c) => (
          <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)} style={{ flex: 'none', padding: '4px 16px' }}>
            {c}
          </button>
        ))}
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {articles.map((a) => (
          <article key={a.id} className="anno-card">
            <div className="card-head">
              <b>{a.title}</b>
              <span className="muted">卷{a.juan} · {a.tiao}</span>
              <span className="badge">{a.category}</span>
            </div>
            <p className="content">{a.content}</p>
            <p className="note">注：{a.note}</p>
            <div className="tag-row">
              {a.tags.map((t) => <span key={t} className="badge" style={{ marginLeft: 0 }}>{t}</span>)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
