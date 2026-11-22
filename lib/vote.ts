// Pure helpers (no imports) so they can be unit-tested with plain `node --test`.

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Map a model's plain-text reply to an option index, or -1 if it doesn't clearly name exactly one option.
export function matchOption(reply: string, options: string[]): number {
  const r = norm(reply);
  const opts = options.map(norm);
  const exact = opts.indexOf(r);
  if (exact >= 0) return exact;
  const hits = opts.flatMap((o, i) => (` ${r} `.includes(` ${o} `) ? [i] : []));
  return hits.length === 1 ? hits[0] : -1;
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
