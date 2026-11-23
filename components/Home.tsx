'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { byVote, color, COLORS, JUDGES, type Judge } from '@/lib/judges';
import { T, TRAITS } from '@/lib/i18n';
import { norm, seats } from '@/lib/vote';
import { SUMMARIZE_AT, type Locale, type Result, type Trend } from '@/lib/types';
import Nav from './Nav';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

export default function Home({ locale, trending, initial }: { locale: Locale; trending: Trend[]; initial?: Result }) {
  const t = T[locale];
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [options, setOptions] = useState<string[]>(initial?.options ?? t.defaultOptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(initial ?? null);
  const [judge, setJudge] = useState<Judge | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);

  const clean = options.map((o) => o.trim());
  const keys = clean.map(norm);
  const canAsk = question.trim().length >= 3 && clean.length >= 2 && keys.every((k, i) => k && keys.indexOf(k) === i);

  useEffect(() => {
    if (result && result !== initial) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result, initial]);

  async function ask() {
    if (!canAsk) return setError(t.errors.invalid);
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, question, options: clean }),
      });
      const d = await res.json();
      if (d.status === 'ok') {
        setResult(d.result);
        history.replaceState(null, '', `/r/${d.result.id}`); // replace, so Back leaves the page instead of only changing the URL
      } else {
        setError(t.errors[d.status === 'limit' ? (d.window === 'hour' ? 'limitHour' : 'limitDay') : d.status] ?? t.errors.error);
      }
    } catch {
      setError(t.errors.error);
    }
    setBusy(false);
  }

  function pickTrend(tr: Trend) {
    setQuestion(tr.question);
    setOptions(tr.options);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    askRef.current?.focus({ preventScroll: true });
  }

  return (
    <div lang={t.htmlLang}>
      <div className="wrap">
        <Nav locale={locale} />

        <section className="hero">
          <div>
            <h1>
              101
              <br />
              Judges
            </h1>
            <p className="lede">{t.lede}</p>
            {!result && !busy && (
              <div className="idle">
                <Hemicycle votes={'-'.repeat(101)} options={[]} t={t} />
              </div>
            )}
          </div>
          <div className="ask">
            <div className="box">
              <label className="sr" htmlFor="q">{t.placeholder}</label>
              <textarea id="q" ref={askRef} maxLength={999} placeholder={t.placeholder} value={question} onChange={(e) => setQuestion(e.target.value)} />
              <div className="meta">
                <span className="warn">{question.length > SUMMARIZE_AT ? t.longNote : ''}</span>
                <span>{question.length} / 999</span>
              </div>
            </div>
            <div className="opts">
              {options.map((o, i) => (
                <div className="opt" key={i}>
                  <i style={{ background: COLORS[i] }} />
                  <input
                    aria-label={t.option(i + 1)}
                    maxLength={40}
                    value={o}
                    placeholder={t.option(i + 1)}
                    onChange={(e) => setOptions(options.map((x, k) => (k === i ? e.target.value : x)))}
                  />
                  {options.length > 2 && (
                    <button aria-label={t.remove} onClick={() => setOptions(options.filter((_, k) => k !== i))}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button className="add" onClick={() => setOptions([...options, ''])}>
                {t.addOption}
              </button>
            )}
            <button className="pill dark" onClick={ask} disabled={busy}>
              {busy ? t.asking : t.ask}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="agree">
              {t.agree[0]}
              <Link href={t.termsHref}>{t.agree[1]}</Link>
              {t.agree[2]}
            </p>
          </div>
        </section>

        {(result || busy) && (
          <section className={'result' + (busy ? ' busy' : '')} ref={resultRef} id="result" aria-busy={busy}>
            {busy ? (
              <>
                <div>
                  <div className="big">…</div>
                  <div className="sub">{t.asking}</div>
                </div>
                <Hemicycle votes={'-'.repeat(101)} options={[]} t={t} pulse />
              </>
            ) : (
              result && <Verdict result={result} t={t} onPick={setJudge} />
            )}
          </section>
        )}

        {result && !busy && <Breakdown result={result} t={t} />}

        <section className="trending" id="trending">
          <h2>{t.trending}</h2>
          <p className="muted">{t.trendingSub}</p>
          <div className="trend-list">
            {trending.map((tr, i) => {
              const top = tr.votes ? winner(tr.votes, tr.options.length) : null;
              const inner = (
                <>
                  <span className="tq">{tr.question}</span>
                  <span className="tchips">
                    {top ? (
                      <span className="chip">
                        <i style={{ background: COLORS[top.i] }} />
                        {tr.options[top.i]} · {pct(top.n, 101)}%
                      </span>
                    ) : (
                      tr.options.map((o, k) => (
                        <span className="chip" key={k}>
                          <i style={{ background: COLORS[k] }} />
                          {o}
                        </span>
                      ))
                    )}
                  </span>
                </>
              );
              return tr.id ? (
                <Link className="trend" href={`/r/${tr.id}`} key={tr.id}>
                  {inner}
                </Link>
              ) : (
                <button className="trend" key={i} onClick={() => pickTrend(tr)}>
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        <footer>
          <span>{t.footer}</span>
          <Link href={t.termsHref}>{t.terms}</Link>
        </footer>
      </div>

      {judge && result && <JudgeSheet judge={judge} result={result} t={t} onClose={() => setJudge(null)} />}
    </div>
  );
}

type Dict = (typeof T)['en'];

function winner(votes: string, n: number) {
  const counts = Array.from({ length: n }, (_, i) => [...votes].filter((v) => v === String(i)).length);
  const max = Math.max(...counts);
  return { i: counts.indexOf(max), n: max, tie: counts.filter((c) => c === max).length > 1, counts };
}

function Verdict({ result, t, onPick }: { result: Result; t: Dict; onPick: (j: Judge) => void }) {
  const w = winner(result.votes, result.options.length);
  const [copied, setCopied] = useState(false);
  const summarized = result.shown !== result.question;

  async function share() {
    const url = `${location.origin}/r/${result.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '101 Judges', text: result.question, url });
      } catch {}
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div>
        <p className="asked">{result.question}</p>
        <div className="big">{w.n}</div>
        <div className="sub">
          {w.tie ? (
            t.tie
          ) : (
            <>
              {t.picked} <b style={{ color: COLORS[w.i] }}>{result.options[w.i]}</b>
            </>
          )}
        </div>
        <div>
          {result.options.map((o, i) => (
            <div className="lg-row" key={i}>
              <i style={{ background: COLORS[i] }} />
              {o}
              <span className="n">{w.counts[i]}</span>
              <span className="p">{pct(w.counts[i], 101)}%</span>
            </div>
          ))}
        </div>
        <button className="pill share" onClick={share}>
          {copied ? t.copied : t.share}
        </button>
      </div>
      <div>
        <Hemicycle votes={result.votes} options={result.options} t={t} onPick={onPick} key={result.id} />
        <p className="hint">{t.tapJudge}</p>
      </div>
      <p className="saw">
        {summarized ? t.summarized : t.judgesSaw}: <b>{result.shown}</b>
      </p>
    </>
  );
}

function Hemicycle({ votes, options, t, onPick, pulse }: { votes: string; options: string[]; t: Dict; onPick?: (j: Judge) => void; pulse?: boolean }) {
  const pts = useMemo(() => seats(), []);
  const order = useMemo(() => byVote(votes), [votes]);
  return (
    <svg className={'hemi' + (pulse ? ' pulse' : '')} viewBox="-1.07 -1.07 2.14 1.13" role="group" aria-label="101 judges">
      {pts.map((p, i) => {
        const { j, v } = order[i];
        const label = `${j.name}, ${j.age}: ${v === '-' ? t.noAnswer : options[+v] ?? ''}`;
        return (
          <circle
            key={j.id}
            className="seat"
            cx={p.x}
            cy={-p.y}
            r={0.047}
            fill={color(v)}
            style={{ animationDelay: `${i * 12}ms` }}
            {...(onPick && {
              tabIndex: 0,
              role: 'button',
              'aria-label': label,
              onClick: () => onPick(j),
              onKeyDown: (e: ReactKeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(j);
                }
              },
            })}
          >
            {onPick && <title>{label}</title>}
          </circle>
        );
      })}
    </svg>
  );
}

function Breakdown({ result, t }: { result: Result; t: Dict }) {
  const [tab, setTab] = useState(0);
  const trait = TRAITS[tab];
  return (
    <section className="breakdown">
      <h2>{t.breakdown}</h2>
      <p className="muted">{t.breakdownSub}</p>
      <div className="tabs" role="tablist">
        {TRAITS.map((tr, i) => (
          <button key={tr.key} role="tab" aria-selected={i === tab} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>
            {t.traitNames[tr.key]}
          </button>
        ))}
      </div>
      <div className="legend">
        {result.options.map((o, i) => (
          <span className="chip" key={i}>
            <i style={{ background: COLORS[i] }} />
            {o}
          </span>
        ))}
      </div>
      {trait.groups.map((g) => {
        const votes = JUDGES.flatMap((j, k) => (trait.of(j) === g && result.votes[k] !== '-' ? [result.votes[k]] : []));
        const counts = result.options.map((_, i) => votes.filter((v) => v === String(i)).length);
        return (
          <div className="group" key={g}>
            <div className="gl">
              <span>{t.groups[g]}</span>
              <span className="muted">{votes.length}</span>
            </div>
            <div className="stack" aria-label={`${t.groups[g]}: ${result.options.map((o, i) => `${o} ${pct(counts[i], votes.length)}%`).join(', ')}`}>
              {counts.map((c, i) =>
                c ? (
                  <span key={i} style={{ width: `${pct(c, votes.length)}%`, background: COLORS[i] }}>
                    {pct(c, votes.length) >= 12 ? `${pct(c, votes.length)}%` : ''}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

const SHEET_TRAITS = ['gender', 'orientation', 'politics', 'income', 'religion', 'education', 'profession', 'personality', 'quirk'] as const;

function JudgeSheet({ judge: j, result, t, onClose }: { judge: Judge; result: Result; t: Dict; onClose: () => void }) {
  const v = result.votes[j.id - 1];
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  async function ask() {
    setBusy(true);
    try {
      const d = await (await fetch('/api/why', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: result.id, judge: j.id }) })).json();
      setWhy(d.status === 'ok' ? `“${d.text}”` : d.status === 'limit' ? t.errors.whyLimit : t.errors[d.status] ?? t.errors.error);
    } catch {
      setWhy(t.errors.error);
    }
    setBusy(false);
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${j.name}, ${j.age}`}>
        <div className="sh-top">
          <div className="av" style={{ background: color(v) }}>
            {j.name[0]}
          </div>
          <div>
            <h3>
              {j.name}, {j.age}
            </h3>
            <p className="muted">
              {t.judge} #{j.id}
            </p>
          </div>
          <button className="x" ref={closeRef} aria-label={t.close} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="vote">
          <span>{t.voted}</span>
          <b style={{ color: color(v) }}>{v === '-' ? t.noAnswer : result.options[+v]}</b>
        </div>
        {v !== '-' &&
          (why ? (
            <p className="why">{why}</p>
          ) : (
            <button className="pill why-btn" onClick={ask} disabled={busy}>
              {busy ? t.whyBusy : t.why}
            </button>
          ))}
        <div className="traits">
          {SHEET_TRAITS.map((k) => (
            <div key={k}>
              <small>{t.traitLabels[k]}</small>
              <span>{j[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
