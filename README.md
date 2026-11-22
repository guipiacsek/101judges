# 101 Judges

Ask anything, give 2–6 options, and 101 AI judges, each a different American persona, cast their vote. Results show as a parliament-style half circle; tap any judge to see who they are and ask them why.

**Live:** https://101judges.vercel.app · English (`/`) and Brazilian Portuguese (`/br`)

## How it works

- **Judges:** [`judges.json`](judges.json) has 101 personas built from US demographic stats (age, gender, politics, income, religion, education, profession, personality, a quirk).
- **Voting:** one OpenAI call per judge (`gpt-5-mini`, minimal reasoning, plain-text answer). Option order is shuffled per judge to avoid position bias.
- **Long questions** (over 250 characters) are summarized before the judges see them; the result shows what they saw.
- **Safety:** OpenAI's moderation endpoint plus a screening prompt block sex, drugs, real-world violence, self-harm and hate. Fiction and sports are fine.
- **Budget:** while OpenAI's free daily tokens last it uses `gpt-5-mini`; after that `gpt-5-nano`, capped at $0.90 a month, then it pauses.
- **Redis (Upstash):** one Lua script per request handles caching, per-IP limits (10 questions/hour, 20/day; 20 "why"/hour, 40/day), token and budget counters, and trending.

## Run locally

```bash
npm install
vercel env pull   # KV_REST_API_URL, KV_REST_API_TOKEN
echo "OPENAI_API_KEY=sk-..." >> .env.local
npm run dev
```

`npm test` runs the vote-matching and seat-layout tests.

Stack: Next.js on Vercel, Upstash Redis, OpenAI API. No other dependencies.
