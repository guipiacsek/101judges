import type { Metadata } from 'next';
import Home from '@/components/Home';
import { getTrending } from '@/lib/server';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '101 Judges · Brasil',
  description: 'Pergunte qualquer coisa, dê as opções, e 101 juízes de IA dão o seu voto.',
};

export default async function Page() {
  return <Home locale="pt" trending={await getTrending('pt')} />;
}
