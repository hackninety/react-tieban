import { Link } from 'react-router-dom';
import { DISCLAIMER, FIDELITY_NOTE, getCorpusStats, getSources, getVolumes } from 'tbss-ts-lib';

export default function Home() {
  const stats = getCorpusStats() as {
    verses: number; volumes: number; agesAnnotated: number;
    tables: number; tableRows: number; annotated: number; methodDocs: number;
  };
  const volumes = getVolumes();

  return (
    <div className="page">
      <section className="hero">
        <p className="kicker">铁板钉钉 · 按数取条 · 依条断事</p>
        <h1>铁板神数</h1>
        <p className="sub">托名邵康节的清代神数体系 —— <b>一万二千条文</b> 与 <b>十四考取数表</b> 语料库</p>
        <div className="stat-row">
          <Link className="stat" to="/volumes"><b>{stats.verses}</b><span>条文 · {stats.volumes} 集</span></Link>
          <Link className="stat" to="/search"><b>{stats.agesAnnotated}</b><span>年龄注记条文</span></Link>
          <Link className="stat" to="/tables"><b>{stats.tables}</b><span>取数表 · {stats.tableRows} 行</span></Link>
          <Link className="stat" to="/annotated"><b>{stats.annotated}</b><span>注解精选</span></Link>
          <Link className="stat" to="/method"><b>{stats.methodDocs}</b><span>方法文献</span></Link>
        </div>
      </section>

      <section>
        <h2>十二集</h2>
        <div className="vol-grid">
          {volumes.map((v) => (
            <Link key={v.slug} className="vol-cell" to={`/volumes?vol=${v.slug}`}>
              <span className="vol-branch">{v.branch}</span>
              <span className="vol-range">{v.start}–{v.end}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2>入口</h2>
        <div className="cards">
          <Link className="card" to="/volumes">
            <div className="card-head"><b>条文库</b><span className="muted">十二集 × 1000 条</span></div>
            <p>按集浏览断语原文，年龄注记随行标示；条文号直达单条视图。</p>
          </Link>
          <Link className="card" to="/search">
            <div className="card-head"><b>检索</b><span className="muted">全文 + 按岁</span></div>
            <p>断语全文检索（繁简折叠，繁体输入亦命中）；按岁数反查流年应验条文。</p>
          </Link>
          <Link className="card" to="/tables">
            <div className="card-head"><b>取数表</b><span className="muted">十四考 15 张</span></div>
            <p>月份、时辰、五音、日命、考刻、卦象、先天命数与流年五表，含八刻细分与核心公式。</p>
          </Link>
          <Link className="card" to="/annotated">
            <div className="card-head"><b>注解精选</b><span className="muted">29 条今注</span></div>
            <p>陈明点校本节录，按总论/六亲/婚姻等十类分题，附今人注解与标签。</p>
          </Link>
          <Link className="card" to="/method">
            <div className="card-head"><b>方法文献</b><span className="muted">3 篇综述</span></div>
            <p>体系概述、考刻与推演流程、十四考取数表字段说明。</p>
          </Link>
        </div>
      </section>

      <section>
        <h2>底本</h2>
        <div className="cards">
          {getSources().map((s) => (
            <a key={s.id} className="card" href={s.url} target="_blank" rel="noreferrer">
              <div className="card-head"><b>{s.url.replace('https://github.com/', '')}</b><span className="badge">{s.commit}</span></div>
              <p>{s.note}</p>
            </a>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>{FIDELITY_NOTE}</p>
      </section>

      <footer className="disclaimer">{DISCLAIMER}</footer>
    </div>
  );
}
