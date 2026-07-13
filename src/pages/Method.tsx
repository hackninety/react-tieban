import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDocMarkdown, getMethodDocs } from 'tbss-ts-lib/docs';
import { Md } from '../components/Md';

const ORDER = ['overview', 'kaoke', 'tables'];

/** 方法文献：篇目侧栏 + markdown 阅读器（正文懒加载） */
export default function Method() {
  const [params, setParams] = useSearchParams();
  const docs = [...getMethodDocs()].sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
  const slug = params.get('doc') ?? docs[0]?.slug;
  const [md, setMd] = useState<string>();

  useEffect(() => {
    let on = true;
    setMd(undefined);
    getDocMarkdown(slug).then((text) => { if (on) setMd(text); });
    return () => { on = false; };
  }, [slug]);

  return (
    <div className="page cols">
      <aside className="side">
        <ul className="entity-list">
          {docs.map((d) => (
            <li key={d.slug} className={d.slug === slug ? 'active' : ''} onClick={() => setParams({ doc: d.slug })}>
              <b>{d.title}</b>
              <div className="muted">{d.summary}</div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="main reader">
        {md === undefined ? <p className="muted">加载文献…</p> : <Md src={md} />}
      </main>
    </div>
  );
}
