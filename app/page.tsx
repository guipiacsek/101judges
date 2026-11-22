import Home from '@/components/Home';
import { getTrending } from '@/lib/server';

export const revalidate = 60; // trending is read from Redis at most once a minute

export default async function Page() {
  return <Home locale="en" trending={await getTrending('en')} />;
}
