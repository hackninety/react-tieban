import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FIDELITY_NOTE, volumeOf } from 'tbss-ts-lib';
import { getVerse, type Verse } from 'tbss-ts-lib/verses';
import { citeVerse } from 'tbss-ts-lib/prompt';

/** 单条视图：断语大字 + 出处行 + 前后条翻页 */
export default function VerseView() {
  const { n: nStr } = useParams();
  const n = Number(nStr);
  const [verse, setVerse] = useState<Verse | null>();

  useEffect(() => {
    let on = true;
    setVerse(undefined);
    getVerse(n).then((v) => { if (on) setVerse(v ?? null); });
    return () => { on = false; };
  }, [n]);

  const vol = volumeOf(n);

  return (
    <div className="page reader">
      <div className="crumbs">
        <Link to="/volumes">条文库</Link>
        <span className="muted">/</span>
        {vol && <Link to={`/volumes?vol=${vol.slug}&page=${Math.floor((n - vol.start) / 100) + 1}`}>{vol.name}</Link>}
        <span className="muted">/</span>
        <span className="muted">第 {nStr} 条</span>
      </div>

      {verse === undefined && <p className="muted">加载条文…</p>}
      {verse === null && <p>无此条文号（条文库范围 1001–13000）。</p>}

      {verse && (
        <div className="verse-view">
          <span className="badge age">
            {verse.ages.length ? `年龄注记 ${verse.ages.join('、')} 岁` : '无年龄注记'}
          </span>
          <p className="vtext">{verse.text}</p>
          <p className="cite">{citeVerse(verse)}</p>
        </div>
      )}

      <div className="pager">
        {n > 1001
          ? <Link className="btn" to={`/v/${n - 1}`}>← 第 {n - 1} 条</Link>
          : <span />}
        {n < 13000
          ? <Link className="btn" to={`/v/${n + 1}`}>第 {n + 1} 条 →</Link>
          : <span />}
      </div>

      <p className="muted">{FIDELITY_NOTE}</p>
    </div>
  );
}
