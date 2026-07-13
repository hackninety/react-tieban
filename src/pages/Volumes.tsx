import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getVolumes } from 'tbss-ts-lib';
import { getVolumeVerses, type Verse } from 'tbss-ts-lib/verses';

const PAGE_SIZE = 100;

/** 条文库：十二集切换 → 分页条文列表（100 条/页），条文号直达单条视图 */
export default function Volumes() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const volumes = getVolumes();
  const slug = params.get('vol') ?? 'zi';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const vol = volumes.find((v) => v.slug === slug) ?? volumes[0];
  const [verses, setVerses] = useState<Verse[]>();
  const [jump, setJump] = useState('');

  useEffect(() => {
    let on = true;
    setVerses(undefined);
    getVolumeVerses(vol.slug).then((list) => { if (on) setVerses(list); });
    return () => { on = false; };
  }, [vol.slug]);

  const pages = Math.ceil(vol.count / PAGE_SIZE);
  const cur = Math.min(page, pages);
  const slice = useMemo(
    () => verses?.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE) ?? [],
    [verses, cur],
  );

  const goJump = () => {
    const n = Number(jump);
    if (Number.isInteger(n) && n >= 1001 && n <= 13000) navigate(`/v/${n}`);
  };

  return (
    <div className="page cols">
      <aside className="side">
        <div className="vol-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: '4px 0 12px' }}>
          {volumes.map((v) => (
            <div key={v.slug} className={`vol-cell${v.slug === vol.slug ? ' active' : ''}`}
              onClick={() => setParams({ vol: v.slug })}>
              <span className="vol-branch">{v.branch}</span>
              <span className="vol-range">{v.start}</span>
            </div>
          ))}
        </div>
        <input className="search-box" inputMode="numeric" placeholder="条文号直达（1001–13000）"
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') goJump(); }} />
        <p className="muted">
          {vol.name} 第 {vol.start}–{vol.end} 条；带年龄注记者为流年应验岁数。
        </p>
      </aside>

      <main className="main">
        <div className="main-head">
          <h2>{vol.name}</h2>
          <span className="muted">第 {(cur - 1) * PAGE_SIZE + vol.start}–{Math.min(cur * PAGE_SIZE, vol.count) + vol.start - 1} 条</span>
        </div>

        {!verses && <p className="muted">加载{vol.name}载荷…</p>}

        {verses && (
          <>
            <ol className="verse-list">
              {slice.map((v) => (
                <li key={v.n}>
                  <Link className="verse-n" to={`/v/${v.n}`}>{v.n}</Link>
                  <span className="verse-text">{v.text}</span>
                  {v.ages.length > 0 && <span className="verse-ages">{v.ages.join('，')}岁</span>}
                </li>
              ))}
            </ol>
            <div className="pager">
              <a className="btn" aria-disabled={cur <= 1}
                onClick={() => setParams({ vol: vol.slug, page: String(cur - 1) })}>← 上一页</a>
              <span className="muted">{cur} / {pages} 页</span>
              <a className="btn" aria-disabled={cur >= pages}
                onClick={() => setParams({ vol: vol.slug, page: String(cur + 1) })}>下一页 →</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
