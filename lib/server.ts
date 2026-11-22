import { createHash } from 'node:crypto';
import { cache } from 'react';
import { JUDGES, persona, type Judge } from './judges';
import { matchOption, norm, shuffle } from './vote';
import type { Locale, Result, Trend } from './types';
import { T } from './i18n';

const FREE_MODEL = 'gpt-5-mini'; // shared free pool: 2.5M tokens/day
const PAID_MODEL = 'gpt-5-nano'; // cheapest, used once the free pool is spent
const FREE_TOKENS_PER_DAY = 2_400_000; // keep a 100k margin under OpenAI's 2.5M
const PAID_CAP_NANO_USD = 900_000_000; // $0.90 per month, in billionths of a dollar
const NANO_USD_PER_TOKEN = { in: 50, out: 400 }; // gpt-5-nano: $0.05 / $0.40 per 1M tokens
const LIMITS = { ask: [10, 20], why: [20, 40] }; // per IP: [per hour, per day]
const TTL = 90 * 86400;
export const SUMMARIZE_AT = 250;

type Usage = { in: number; out: number };
type Tier = 'free' | 'paid';

// ---------- Redis (Upstash REST, no SDK needed) ----------

async function redis(cmd: (string | number)[]) {
  const res = await fetch(process.env.KV_REST_API_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    body: JSON.stringify(cmd),
  });
  const d = await res.json();
  if (d.error) throw new Error('redis: ' + d.error);
  return d.result;
}
const lua = (src: string, keys: string[], args: (string | number)[]) => redis(['EVAL', src, keys.length, ...keys, ...args]);

// One call per request: cache check, per-IP limits, free-pool / paid-budget check.
// KEYS: cache, rl-hour, rl-day, tokens-today, usd-month, extra (trend key for ask, result key for why)
// ARGV: hourLimit, dayLimit, freeLimit, paidCap, mode, member
const GATE = `
local hit = redis.call('GET', KEYS[1])
if hit then
  if ARGV[5] == 'ask' then redis.call('ZINCRBY', KEYS[6], 1, ARGV[6]); redis.call('EXPIRE', KEYS[6], 172800) end
  return {'hit', hit}
end
if tonumber(redis.call('GET', KEYS[2]) or '0') >= tonumber(ARGV[1]) then return {'limit', 'hour'} end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= tonumber(ARGV[2]) then return {'limit', 'day'} end
local tier = 'free'
if tonumber(redis.call('GET', KEYS[4]) or '0') >= tonumber(ARGV[3]) then
  tier = 'paid'
  if tonumber(redis.call('GET', KEYS[5]) or '0') >= tonumber(ARGV[4]) then return {'closed', ''} end
end
redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 7200)
redis.call('INCR', KEYS[3]); redis.call('EXPIRE', KEYS[3], 172800)
if ARGV[5] == 'why' then return {'go', tier, redis.call('GET', KEYS[6])} end
return {'go', tier}`;

// After the OpenAI calls: save the result (if any), count tokens or dollars, bump trending.
// KEYS: cache, tokens-today, usd-month, trend   ARGV: value, ttl, tier, tokens, nanoUsd, bump, member
const COMMIT = `
if ARGV[1] ~= '' then redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2]) end
if ARGV[3] == 'free' then redis.call('INCRBY', KEYS[2], ARGV[4]); redis.call('EXPIRE', KEYS[2], 172800)
else redis.call('INCRBY', KEYS[3], ARGV[5]); redis.call('EXPIRE', KEYS[3], 3456000) end
if ARGV[6] == '1' then redis.call('ZINCRBY', KEYS[4], 1, ARGV[7]); redis.call('EXPIRE', KEYS[4], 172800) end
return 1`;

// Top 5 results from today's trending set, topped up from yesterday's.
const TRENDING = `
local list, seen = {}, {}
for k = 1, 2 do
  for _, id in ipairs(redis.call('ZREVRANGE', KEYS[k], 0, 9)) do
    if #list < 5 and not seen[id] then
      local v = redis.call('GET', 'r:' .. id)
      if v then seen[id] = true; table.insert(list, v) end
    end
  end
end
return list`;

const iso = (d = new Date()) => d.toISOString();
const day = (d = new Date()) => iso(d).slice(0, 10); // UTC, same reset as OpenAI's free pool
const hour = () => iso().slice(0, 13);
const month = () => iso().slice(0, 7);

function gate(mode: 'ask' | 'why', ip: string, key: string, extra: string, member = '') {
  const who = createHash('sha256').update(ip).digest('hex').slice(0, 16); // never store raw IPs
  const [h, d] = LIMITS[mode];
  return lua(
    GATE,
    [key, `rl:${mode}:${who}:${hour()}`, `rl:${mode}:${who}:${day()}`, `tok:${day()}`, `usd:${month()}`, extra],
    [h, d, FREE_TOKENS_PER_DAY, PAID_CAP_NANO_USD, mode, member],
  ) as Promise<[string, string?, string?]>;
}

function commit(key: string, value: string, tier: Tier, u: Usage, trend?: string, member = '') {
  const nano = u.in * NANO_USD_PER_TOKEN.in + u.out * NANO_USD_PER_TOKEN.out;
  return lua(COMMIT, [key, `tok:${day()}`, `usd:${month()}`, trend ?? key], [value, TTL, tier, u.in + u.out, nano, trend ? 1 : 0, member]);
}

// ---------- OpenAI (plain fetch) ----------

async function openai(path: string, body: object) {
  const res = await fetch('https://api.openai.com/v1/' + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`openai ${res.status}: ${d.error?.message}`);
  return d;
}

async function chat(tier: Tier, system: string, user: string, u: Usage, extra: object = {}) {
  const d = await openai('chat/completions', {
    model: tier === 'free' ? FREE_MODEL : PAID_MODEL,
    reasoning_effort: 'minimal',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    ...extra,
  });
  u.in += d.usage.prompt_tokens;
  u.out += d.usage.completion_tokens;
  return (d.choices[0].message.content ?? '') as string;
}

// Free moderation endpoint. Plain "violence" is allowed unless extreme, so fiction and sports pass.
const BLOCK = ['sexual', 'sexual/minors', 'hate', 'hate/threatening', 'harassment/threatening', 'self-harm',
  'self-harm/intent', 'self-harm/instructions', 'illicit', 'illicit/violent', 'violence/graphic'];
async function flagged(text: string) {
  const r = (await openai('moderations', { model: 'omni-moderation-latest', input: text })).results[0];
  return BLOCK.some((c) => r.categories[c]) || r.category_scores.violence > 0.85;
}

const SCREEN = `You screen questions for "101 Judges", a fun app where 101 AI personas vote on a question.
Set allowed=false if the question or options involve: sex or sexual content, recreational or illegal drugs, real-world violence or harm to people or animals, self-harm, weapons or dangerous instructions, hate or harassment, or a private (non-famous) person.
Allow everything else, e.g. opinions, sports, food, games, fiction (superhero fights are fine), history, politics, public figures, everyday choices.
If "long" is true, set "summary" to a neutral rewrite of the question under 220 characters, in the same language, keeping its meaning and not favoring any option. Otherwise set "summary" to "".`;
const SCREEN_FORMAT = {
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'screen',
      strict: true,
      schema: { type: 'object', properties: { allowed: { type: 'boolean' }, summary: { type: 'string' } }, required: ['allowed', 'summary'], additionalProperties: false },
    },
  },
};

async function vote(tier: Tier, j: Judge, shown: string, options: string[], u: Usage) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const reply = await chat(
        tier,
        `${persona(j)}\nAnswer as this person honestly would, given their background and values. Reply with exactly one of the options, copied exactly, and nothing else.`,
        `${shown}\n\nOptions:\n${shuffle(options).map((o) => '- ' + o).join('\n')}`, // shuffled per judge: avoids position bias
        u,
      );
      const i = matchOption(reply, options);
      if (i >= 0) return i;
    } catch (e) {
      console.error(e);
    }
  }
  return -1;
}

// ---------- Public API ----------

export const resultId = (locale: Locale, question: string, options: string[]) =>
  createHash('sha256').update([locale, norm(question), ...options.map(norm)].join('\n')).digest('base64url').slice(0, 10);

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

export const ipOf = (req: Request) =>
  req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';

export type Outcome<T> = ({ status: 'ok' } & T) | { status: 'blocked' | 'closed' | 'error' } | { status: 'limit'; window: string };

export async function ask(ip: string, locale: Locale, question: string, options: string[]): Promise<Outcome<{ result: Result }>> {
  const id = resultId(locale, question, options);
  const key = `r:${id}`;
  const trend = `trend:${locale}:${day()}`;
  const [status, a] = await gate('ask', ip, key, trend, id);
  if (status === 'hit') return { status: 'ok', result: JSON.parse(a!) };
  if (status === 'limit') return { status: 'limit', window: a! };
  if (status === 'closed') return { status: 'closed' };

  const tier = a as Tier;
  const u: Usage = { in: 0, out: 0 };
  try {
    if (await flagged(`${question}\n${options.join('\n')}`)) return { status: 'blocked' };
    const long = question.length > SUMMARIZE_AT;
    const screen = JSON.parse(await chat(tier, SCREEN, JSON.stringify({ question, options, long }), u, SCREEN_FORMAT));
    if (!screen.allowed) {
      await commit(key, '', tier, u);
      return { status: 'blocked' };
    }
    const shown = long && screen.summary ? screen.summary : question;
    const votes = await Promise.all(JUDGES.map((j) => vote(tier, j, shown, options, u)));
    if (votes.filter((v) => v < 0).length > 10) {
      await commit(key, '', tier, u);
      return { status: 'error' };
    }
    const result: Result = { id, locale, question, shown, options, votes: votes.map((v) => (v < 0 ? '-' : v)).join(''), at: Date.now() };
    await commit(key, JSON.stringify(result), tier, u, trend, id);
    return { status: 'ok', result };
  } catch (e) {
    console.error(e);
    await commit(key, '', tier, u).catch(() => {}); // still count tokens already spent
    return { status: 'error' };
  }
}

export async function why(ip: string, id: string, judgeId: number): Promise<Outcome<{ text: string }>> {
  const j = JUDGES.find((x) => x.id === judgeId);
  if (!j || !/^[\w-]{10}$/.test(id)) return { status: 'error' };
  const key = `w:${id}:${judgeId}`;
  const [status, a, raw] = await gate('why', ip, key, `r:${id}`);
  if (status === 'hit') return { status: 'ok', text: a! };
  if (status === 'limit') return { status: 'limit', window: a! };
  if (status === 'closed') return { status: 'closed' };
  if (!raw) return { status: 'error' };

  const r: Result = JSON.parse(raw);
  const v = r.votes[judgeId - 1];
  if (v === '-') return { status: 'error' };
  const tier = a as Tier;
  const u: Usage = { in: 0, out: 0 };
  try {
    const text = (
      await chat(
        tier,
        `${persona(j)}\nStay in character as this person.`,
        `You were asked: "${r.shown}"\nOptions: ${r.options.join(' | ')}\nYou voted: ${r.options[+v]}\n\n` +
          `In one short, casual sentence (max 25 words), in first person, say why you voted that way. Write in ${r.locale === 'pt' ? 'Brazilian Portuguese' : 'English'}.`,
        u,
      )
    ).trim();
    await commit(key, text, tier, u);
    return { status: 'ok', text };
  } catch (e) {
    console.error(e);
    await commit(key, '', tier, u).catch(() => {});
    return { status: 'error' };
  }
}

export const getResult = cache(async (id: string): Promise<Result | null> => {
  if (!/^[\w-]{10}$/.test(id)) return null;
  const v = await redis(['GET', `r:${id}`]);
  return v ? JSON.parse(v) : null;
});

// Real trending questions first, topped up with the starter list so there are always 5.
export async function getTrending(locale: Locale): Promise<Trend[]> {
  let real: Result[] = [];
  try {
    const yesterday = new Date(Date.now() - 86400_000);
    real = ((await lua(TRENDING, [`trend:${locale}:${day()}`, `trend:${locale}:${day(yesterday)}`], [])) as string[]).map((s) => JSON.parse(s));
  } catch (e) {
    console.error(e);
  }
  const seen = new Set(real.map((r) => norm(r.question)));
  return [...real, ...T[locale].starters.filter((s) => !seen.has(norm(s.question)))].slice(0, 5);
}
