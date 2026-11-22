import { ipOf, why } from '@/lib/server';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (typeof b?.id !== 'string' || !Number.isInteger(b?.judge)) return Response.json({ status: 'invalid' }, { status: 400 });
  try {
    return Response.json(await why(ipOf(req), b.id, b.judge));
  } catch (e) {
    console.error(e); // Redis unreachable: fail closed
    return Response.json({ status: 'closed' }, { status: 503 });
  }
}
