# 101 Judges

Ask anything, give 2–6 options, and 101 AI judges, each a different American persona, cast their vote. Results show as a parliament-style half circle; tap any judge to see who they are and ask them why.

**Live:** https://101judges.vercel.app · English (`/`) and Brazilian Portuguese (`/br`)

## How it works

- **Judges:** [`judges.json`](judges.json) has 101 personas built from US demographic stats (age, gender, politics, income, religion, education, profession, personality, a quirk).
- **Voting:** one OpenAI call per judge (`gpt-5-mini`, minimal reasoning). Each judge replies with odds for every option (e.g. "70 30") and the server rolls them, so groups lean realistically instead of voting as one block. Options are labeled A–F in a shuffled order per judge to avoid position bias.
- **Long questions** (over 250 characters) are summarized before the judges see them; the result shows what they saw.
- **Safety:** OpenAI's moderation endpoint plus a screening prompt block sex, drugs, real-world violence, self-harm and hate. Fiction and sports are fine.
- **Budget:** for the first 2M tokens a day (OpenAI gives 2.5M free, shared across the whole OpenAI account) it uses `gpt-5-mini`; after that `gpt-5-nano`, capped at $0.90 a month, then it pauses.
- **Redis (Upstash):** one Lua script per request handles caching, per-IP limits (10 questions/hour, 20/day; 20 "why"/hour, 40/day), token and budget counters (an upper bound on each request is reserved up front, so parallel requests cannot overshoot; every model call has an output cap), and trending (one bump per visitor per question per day). A Vercel Firewall rule also limits each IP to 60 requests a minute on `/api/*` and `/r/*`.

## Run locally

```bash
npm install
vercel env pull   # KV_REST_API_URL, KV_REST_API_TOKEN
echo "OPENAI_API_KEY=sk-..." >> .env.local
npm run dev
```

`npm test` runs the vote-matching and seat-layout tests.

Stack: Next.js on Vercel, Upstash Redis, OpenAI API. No other dependencies.
