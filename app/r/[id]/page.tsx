import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Home from '@/components/Home';
import { getResult, getTrending } from '@/lib/server';

export const revalidate = 3600; // results never change; trending below may lag by up to an hour
// Empty list = build no pages up front, but cache each one on its first visit (without it the route renders every time).
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getResult((await params).id);
  return r ? { title: `${r.question} · 101 Judges`, description: r.locale === 'pt' ? 'Veja como 101 juízes de IA votaram.' : 'See how 101 AI judges voted.' } : {};
}

export default async function Page({ params }: Props) {
  const r = await getResult((await params).id);
  if (!r) notFound();
  return <Home locale={r.locale} trending={await getTrending(r.locale)} initial={r} />;
}
