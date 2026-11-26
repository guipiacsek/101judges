// Pure helpers (type-only imports) so they can be unit-tested with plain `node --test`.
import type { Locale } from './types';

// Keeps + and # so "C", "C++" and "C#" stay different options.
export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim();

// Trust boundary for /api/ask: anything that gets past this costs OpenAI tokens.
export function parseAsk(body: unknown): { locale: Locale; question: string; options: string[] } | null {
  const b = body as { locale?: unknown; question?: unknown; options?: unknown } | null;
  const question = typeof b?.question === 'string' ? b.question.trim() : '';
  const options = Array.isArray(b?.options) ? b.options.map((o) => (typeof o === 'string' ? o.trim() : '')) : [];
  const keys = options.map(norm);
  if (question.length < 3 || question.length > 999) return null;
  if (options.length < 2 || options.length > 6) return null;
  if (options.some((o, i) => !o || o.length > 40 || !keys[i] || keys.indexOf(keys[i]) !== i)) return null;
  return { locale: b?.locale === 'pt' ? 'pt' : 'en', question, options };
}

// Read a judge's odds reply ("70 20 10", one number per listed option) and roll the dice.
// Returns the picked position in the listed order, or -1 if the reply isn't exactly n numbers with a positive total.
export function pickByOdds(reply: string, n: number, roll = Math.random()): number {
  const odds = reply.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  const total = odds.reduce((a, b) => a + b, 0);
  if (odds.length !== n || total <= 0) return -1;
  let x = roll * total;
  for (let k = 0; k < n; k++) if ((x -= odds[k]) < 0) return k;
  return n - 1;
}

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Seat positions for a parliament half-circle: rows of growing radius, seats per row
// proportional to radius, ordered left → right so each vote forms a wedge.
export function seats(n = 101, rows = 6, r0 = 0.42) {
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((1 - r0) * i) / (rows - 1));
  const sum = radii.reduce((a, b) => a + b);
  const counts = radii.map((r) => Math.round((n * r) / sum));
  counts[rows - 1] += n - counts.reduce((a, b) => a + b);
  const pts: { x: number; y: number; a: number; r: number }[] = [];
  radii.forEach((r, i) => {
    for (let k = 0; k < counts[i]; k++) {
      const a = Math.PI * (1 - k / (counts[i] - 1));
      // rounded so server and browser render identical numbers (avoids a hydration mismatch)
      pts.push({ x: +(r * Math.cos(a)).toFixed(4), y: +(r * Math.sin(a)).toFixed(4), a, r });
    }
  });
  return pts.sort((p, q) => q.a - p.a || p.r - q.r);
}
