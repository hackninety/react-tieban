import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DISCLAIMER, foldIncludes } from 'tbss-ts-lib';
import { getVerses, type Verse } from 'tbss-ts-lib/verses';
import { CORE_FORMULA } from 'tbss-ts-lib/tables';
import { toBaziInfo } from '../engine/calendar';
import {
  candidateFortunes, computeChart, computeQuarterCandidates, scoreQuarterCandidates,
  type Chart,
} from '../engine/engine';

type VerseMap = Map<number, Verse>;

function parseLocal(v: string) {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return undefined;
  return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
}

function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 条文号 → 链接 + 断语；rowAge 命中年龄注记时高亮（考刻相验） */
function VerseCell({ n, verses, rowAge }: { n: number; verses: VerseMap; rowAge?: number }) {
  if (!n) return <span className="muted">—</span>;
  const v = verses.get(n);
  const hit = rowAge !== undefined && v ? v.ages.includes(rowAge) : false;
  return (
    <>
      <Link className="verse-n" to={`/v/${n}`}>{n}</Link>{' '}
      {v ? (
        <>
          {v.text}
          {v.ages.length > 0 && (
            <span className={`verse-ages${hit ? ' hit' : ''}`}>（{v.ages.join('，')}岁{hit ? ' ✓' : ''}）</span>
          )}
        </>
      ) : <span className="muted">未找到断语</span>}
    </>
  );
}

/**
 * 排盘推演：URL 驱动（g/b/q/k/f 可分享回放）。
 * 输入生辰与求测时刻 → 基础排盘 / 考刻对比（八刻 + 六亲验证）/ 本命条文 / 流年 1–100 岁。
 */
export default function Paipan() {
  const [params, setParams] = useSearchParams();
  const pGender = params.get('g') === '女' ? '女' : '男';
  const pBirth = params.get('b') ?? '';
  const pQuery = params.get('q') ?? '';
  const pQuarter = Number(params.get('k')) || 0;
  const pFacts = params.get('f') ?? '';

  const [gender, setGender] = useState<'男' | '女'>(pGender);
  const [birthStr, setBirthStr] = useState(pBirth || '1990-01-01T12:00');
  const [queryStr, setQueryStr] = useState(pQuery || nowLocal());
  const [facts, setFacts] = useState(pFacts);
  const [verses, setVerses] = useState<VerseMap>(new Map());

  // 盘面完全由 URL 参数派生（分享/回放/冒烟一致）
  const chart: Chart | undefined = useMemo(() => {
    const b = pBirth && parseLocal(pBirth);
    const q = pQuery && parseLocal(pQuery);
    if (!b || !q) return undefined;
    try {
      return computeChart({
        gender: pGender, birth: toBaziInfo(b), query: toBaziInfo(q),
        quarterOverride: pQuarter >= 1 && pQuarter <= 8 ? pQuarter : undefined,
      });
    } catch {
      return undefined;
    }
  }, [pGender, pBirth, pQuery, pQuarter]);

  const candidates = useMemo(() => (chart ? computeQuarterCandidates(chart) : []), [chart]);

  const run = (patch?: Record<string, string>) => {
    const next: Record<string, string> = { g: gender, b: birthStr, q: queryStr };
    if (facts.trim()) next.f = facts.trim();
    if (pQuarter) next.k = String(pQuarter);
    Object.assign(next, patch);
    for (const k of Object.keys(next)) if (!next[k]) delete next[k];
    setParams(next);
  };

  // 断语补齐：盘面 + 八刻候选全量条文号批量取条
  const wanted = useMemo(() => {
    if (!chart) return [];
    const ns = new Set<number>();
    ns.add(chart.finalFortuneNum);
    for (const c of chart.destiny?.categories ?? []) for (const e of c.entries) ns.add(e.fortune);
    for (const cand of candidates) for (const f of candidateFortunes(cand)) ns.add(f.n);
    for (const r of chart.liunian.slice(0, 100)) {
      if (r.fortune) ns.add(r.fortune);
      if (r.correctedFortune) ns.add(r.correctedFortune);
      if (r.tiebanFortune) ns.add(r.tiebanFortune);
    }
    return [...ns].filter((n) => n >= 1001 && n <= 13000);
  }, [chart, candidates]);

  useEffect(() => {
    let on = true;
    if (!wanted.length) { setVerses(new Map()); return; }
    getVerses(wanted).then((list) => {
      if (!on) return;
      const map: VerseMap = new Map();
      list.forEach((v) => { if (v) map.set(v.n, v); });
      setVerses(map);
    });
    return () => { on = false; };
  }, [wanted]);

  // 六亲验证评分（关键词空格分隔；断语载荷就绪后计算）
  const factTokens = useMemo(() => pFacts.split(/[\s,，、]+/).map((s) => s.trim()).filter(Boolean), [pFacts]);
  const scores = useMemo(() => {
    if (!candidates.length || !factTokens.length || !verses.size) return undefined;
    return scoreQuarterCandidates(candidates, factTokens, (n) => verses.get(n)?.text, foldIncludes);
  }, [candidates, factTokens, verses]);
  const bestScore = scores ? Math.max(...scores.map((s) => s.score)) : 0;

  const b = chart?.birth;

  return (
    <div className="page">
      <div className="main-head"><h2>排盘推演</h2><span className="badge fid">上游开源实现移植 · 仅供研究</span></div>

      <div className="form-card">
        <div className="paipan-grid">
          <label className="form-field">
            <span className="muted">性别</span>
            <div className="tabs" style={{ margin: 0 }}>
              {(['男', '女'] as const).map((g) => (
                <button key={g} className={gender === g ? 'active' : ''} onClick={() => setGender(g)}>{g}</button>
              ))}
            </div>
          </label>
          <label className="form-field">
            <span className="muted">出生时刻（精确到分，供八刻细分）</span>
            <input className="search-box" type="datetime-local" value={birthStr}
              onChange={(e) => setBirthStr(e.target.value)} style={{ margin: 0 }} />
          </label>
          <label className="form-field">
            <span className="muted">求测时刻（日命/时运取此时辰）</span>
            <input className="search-box" type="datetime-local" value={queryStr}
              onChange={(e) => setQueryStr(e.target.value)} style={{ margin: 0 }} />
          </label>
          <label className="form-field">
            <span className="muted">&nbsp;</span>
            <button className="btn btn-run" onClick={() => run({ k: '' })}>起盘 →</button>
          </label>
        </div>
      </div>

      {chart && b && (
        <>
          <section>
            <h2>基础信息</h2>
            <div className="formula" style={{ borderLeftColor: 'var(--accent-soft)' }}>
              性别 {chart.gender} · 农历 {b.lunarStr} · 出生八字 <b>{b.bazi.year} {b.bazi.month} {b.bazi.day} {b.bazi.time}</b>
              <br />
              求测 {chart.query.dateStr} · 八字 {chart.query.bazi.year} {chart.query.bazi.month} {chart.query.bazi.day} {chart.query.bazi.time}
            </div>
            <div className="stat-row" style={{ justifyContent: 'flex-start' }}>
              <div className="stat"><b>{chart.congNum}</b><span>先天命数</span></div>
              <div className="stat"><b>{chart.toneNum}</b><span>五音命数（{chart.tone}）</span></div>
              <div className="stat"><b>{chart.dayLife} / {chart.timeLuck}</b><span>日命 / 时运</span></div>
              <div className="stat"><b>{chart.kaokeMoment}</b><span>考刻 · {chart.kaokeGroup}</span></div>
              <div className="stat">
                <b>{chart.quarter}</b>
                <span>八刻 · 刻干数 {chart.keGanNum}{pQuarter ? ' · 手动定刻' : ''}</span>
              </div>
              <div className="stat"><b>{chart.mainNum}</b><span>本命数</span></div>
              <div className="stat"><b>{chart.hexName}</b><span>十二辟卦</span></div>
              <div className="stat"><b>{chart.pnNum}</b><span>后天命数{chart.wuShuJiGong ? ` · 寄${chart.wuShuJiGong.gua}` : ''}</span></div>
              <div className="stat"><b>{chart.sanYuan}</b><span>三元</span></div>
            </div>
            <div className="formula">
              {CORE_FORMULA}：{chart.mainNum} + {chart.keGanNum} × 48 = <b>{chart.finalFortuneNum}</b>
              {verses.get(chart.finalFortuneNum) && <> —— {verses.get(chart.finalFortuneNum)!.text}</>}
            </div>
          </section>

          <section>
            <h2>考刻对比（八刻）</h2>
            <p className="muted">
              出生分钟只给出初步刻别；考刻即以已知事实在八刻间定夺。输入已知六亲信息
              （空格分隔关键词，如「属马 兄弟二人 夫做官」）自动比对各刻的终局与本命条文断语，
              命中明细在表下列出；点「采用」以该刻重排全盘。
            </p>
            <div className="paipan-grid" style={{ gridTemplateColumns: '1fr 110px' }}>
              <input className="search-box" placeholder="已知六亲信息关键词（父母生肖/兄弟数/婚姻/功名/子女…）"
                value={facts} onChange={(e) => setFacts(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') run({ f: facts.trim() }); }}
                style={{ margin: 0 }} />
              <button className="btn btn-run" onClick={() => run({ f: facts.trim() })}>验证</button>
            </div>
            <div className="dtable-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>刻别</th><th>刻干数</th><th>归并</th><th>卦</th>
                    <th style={{ minWidth: 240 }}>终局条文（本命数+刻干×48）</th>
                    {scores && <th>匹配</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const s = scores?.find((x) => x.keGanNum === c.keGanNum);
                    const active = c.keGanNum === chart.keGanNum;
                    return (
                      <tr key={c.keGanNum} className={active ? 'row-active' : ''}>
                        <td>{c.quarter}{active ? ' ●' : ''}</td>
                        <td>{c.keGanNum}</td>
                        <td>{c.legacyMoment}</td>
                        <td>{c.hexName}</td>
                        <td style={{ whiteSpace: 'normal' }}><VerseCell n={c.finalFortuneNum} verses={verses} /></td>
                        {scores && (
                          <td>{s && s.score > 0
                            ? <b style={{ color: s.score === bestScore ? 'var(--ok)' : undefined }}>{s.score}</b>
                            : <span className="muted">0</span>}</td>
                        )}
                        <td>
                          {active
                            ? <span className="muted">当前</span>
                            : <a className="btn" onClick={() => run({ k: String(c.keGanNum) })}>采用</a>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {scores && scores.some((s) => s.hits.length > 0) && (
              <div className="formula" style={{ borderLeftColor: 'var(--ok)' }}>
                {scores.filter((s) => s.hits.length > 0).map((s) => (
                  <div key={s.keGanNum}>
                    <b>{s.quarter}</b>：{s.hits.map((h, i) => (
                      <span key={i}>「{h.keyword}」→ <Link className="verse-n" to={`/v/${h.n}`}>{h.n}</Link>（{h.source}）{h.text}　</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {scores && !scores.some((s) => s.hits.length > 0) && (
              <p className="muted">关键词在八刻候选断语中均无命中——换更贴近断语用语的词试试（如「属马」「二人」「登科」）。</p>
            )}
          </section>

          <section>
            <h2>本命条文</h2>
            {!chart.destiny && (
              <p className="muted">14-10 表无匹配行（卦 {chart.hexName} × {chart.legacyMoment} × 先天命数 {chart.congNum}）。</p>
            )}
            {chart.destiny && (
              <div className="dtable-wrap">
                <table className="dtable">
                  <thead><tr><th>类目</th><th>公式（基数+序数+偏移）</th><th>条文与断语</th></tr></thead>
                  <tbody>
                    {chart.destiny.categories.flatMap((c) =>
                      c.entries.length === 0
                        ? [<tr key={c.category}><td>{c.category}</td><td className="muted">底本为 ×</td><td className="muted">—</td></tr>]
                        : c.entries.map((e, i) => (
                          <tr key={`${c.category}-${i}`}>
                            <td>{i === 0 ? c.category : ''}</td>
                            <td>{chart.destiny!.base} + {chart.destiny!.seq} + {e.offset} = {e.fortune}</td>
                            <td style={{ whiteSpace: 'normal' }}><VerseCell n={e.fortune} verses={verses} /></td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2>流年条文（1–100 岁）</h2>
            <p className="muted">断语年龄注记与实岁吻合者以 <span className="verse-ages hit">✓ 绿色</span> 标示——年龄相验为考刻之凭。</p>
            <div className="dtable-wrap" style={{ maxHeight: '72dvh', overflowY: 'auto' }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>岁</th><th>干支</th><th>四声</th><th>标记</th><th>字母</th>
                    <th>校正</th><th>公式</th>
                    <th style={{ minWidth: 260 }}>原条文断语</th>
                    <th style={{ minWidth: 260 }}>校正后断语</th>
                    <th style={{ minWidth: 220 }}>终局（+{chart.keGanNum}×48）</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.liunian.slice(0, 100).map((r) => (
                    <tr key={r.age}>
                      <td>{r.age}</td>
                      <td>{r.ganzhi}</td>
                      <td>{r.sound}</td>
                      <td>{r.marker}</td>
                      <td>{r.letter === '?' ? <span className="muted">—</span> : r.letter}</td>
                      <td>{r.correction ? `${r.correction}→${r.correctedCorrection}` : <span className="muted">—</span>}</td>
                      <td>{r.formula || <span className="muted">—</span>}</td>
                      <td style={{ whiteSpace: 'normal' }}><VerseCell n={r.fortune} verses={verses} rowAge={r.age} /></td>
                      <td style={{ whiteSpace: 'normal' }}><VerseCell n={r.correctedFortune} verses={verses} rowAge={r.age} /></td>
                      <td style={{ whiteSpace: 'normal' }}><VerseCell n={r.tiebanFortune} verses={verses} rowAge={r.age} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              「原条文」为字母×岁数查 14-14 所得；「校正后」按岁段校正数规则重查；
              「终局」应用铁板核心公式（+刻干数×48）。条文号可点入单条视图。
            </p>
          </section>

          <footer className="disclaimer">
            推演口径：移植自 xaminxan/tiebanshenshu 与 Nanphy/TiebanshenshuOS 开源实现
            （八刻计分沿用上游「偶数小时为时辰首小时」约定；卦象/本命条文/流年字母统一按
            八刻归并刻查表，14-7 考刻作先验参考）。六亲验证为透明关键词匹配，定刻仍须人工判断。
            各派铁板神数口诀不一，结果仅供文献研究比对。{DISCLAIMER}
          </footer>
        </>
      )}

      {!chart && (
        <p className="muted" style={{ marginTop: 18 }}>
          输入出生时刻（精确到分钟）与求测时刻，起盘后依次得：先天命数 → 五音命数 → 日命/时运 →
          考刻定刻 → 本命数与十二辟卦 → 考刻对比（八刻 + 六亲验证）→ 本命条文 → 流年 1–100 岁逐年断语。
          盘面参数入 URL，可直接分享回放。方法说明见
          <Link to="/method?doc=kaoke"> 方法文献·考刻篇</Link>。
        </p>
      )}
    </div>
  );
}
