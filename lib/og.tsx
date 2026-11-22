import { ImageResponse } from 'next/og';
import { byVote, color, COLORS } from './judges';
import { seats } from './vote';
import type { Result } from './types';

export const size = { width: 1200, height: 630 };
const BG = '#FCFBF9';
const INK = '#111110';
const MUTED = '#6F6B64';

// The half circle as an inline SVG image (simplest thing the OG renderer handles reliably).
function hemi(votes: string, width: number) {
  const order = byVote(votes);
  const dots = seats().map((p, i) => `<circle cx="${p.x}" cy="${-p.y}" r="0.047" fill="${color(order[i].v)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.07 -1.07 2.14 1.13">${dots}</svg>`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" width={width} height={Math.round((width * 1.13) / 2.14)} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} />;
}

export function resultImage(r: Result) {
  const counts = r.options.map((_, i) => [...r.votes].filter((v) => v === String(i)).length);
  const top = counts.indexOf(Math.max(...counts));
  const tie = counts.filter((c) => c === counts[top]).length > 1;
  // Long questions show the judges' summary; anything still long is cut at a word boundary.
  const text = r.question.length > 120 ? r.shown : r.question;
  const q = text.length > 120 ? text.slice(0, 117).replace(/\s+\S*$/, '') + '…' : text;
  const pt = r.locale === 'pt';
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, padding: 64, color: INK }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 520, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>101 Judges</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: q.length > 70 ? 40 : 52, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>{q}</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32 }}>
              <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>{counts[top]}</div>
              <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 4 }}>
                <span>{tie ? (pt ? 'deu empate' : "it's a tie") : pt ? 'juízes escolheram' : 'judges picked'}</span>
                {!tie && <span style={{ color: COLORS[top], fontWeight: 700, marginLeft: 10 }}>{r.options[top]}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 24, color: MUTED }}>
            {r.options.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', marginRight: 24, marginTop: 6 }}>
                <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, background: COLORS[i], marginRight: 8 }} />
                <span>{`${o} ${counts[i]}`}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>{hemi(r.votes, 540)}</div>
      </div>
    ),
    size,
  );
}

export function brandImage() {
  // Decorative split so the default image shows the idea at a glance.
  const votes = '0'.repeat(38) + '1'.repeat(27) + '2'.repeat(22) + '3'.repeat(14);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, padding: 72, color: INK, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 520 }}>
          <div style={{ display: 'flex', fontSize: 150, fontWeight: 700, letterSpacing: -9, lineHeight: 0.9 }}>101</div>
          <div style={{ display: 'flex', fontSize: 150, fontWeight: 700, letterSpacing: -9, lineHeight: 0.9 }}>Judges</div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 28, lineHeight: 1.3 }}>Ask anything. 101 AI judges vote.</div>
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}>{hemi(votes, 500)}</div>
      </div>
    ),
    size,
  );
}
