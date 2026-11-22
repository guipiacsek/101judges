import { brandImage, resultImage, size } from '@/lib/og';
import { getResult } from '@/lib/server';

export { size };
export const contentType = 'image/png';
export const alt = 'How 101 AI judges voted';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const r = await getResult((await params).id);
  return r ? resultImage(r) : brandImage();
}
