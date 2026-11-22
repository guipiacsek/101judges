import { ask, ipOf } from '@/lib/server';
import { parseAsk } from '@/lib/vote';

export const maxDuration = 60;

export async function POST(req: Request) {
  const input = parseAsk(await req.json().catch(() => null));
  if (!input) return Response.json({ status: 'invalid' }, { status: 400 });
  try {
    return Response.json(await ask(ipOf(req), input.locale, input.question, input.options));
  } catch (e) {
    console.error(e); // Redis unreachable: fail closed so limits and budget are never skipped
    return Response.json({ status: 'closed' }, { status: 503 });
  }
}
