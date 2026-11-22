import { brandImage, size } from '@/lib/og';

export { size };
export const contentType = 'image/png';
export const alt = '101 Judges: ask anything, 101 AI judges vote';

export default function Image() {
  return brandImage();
}
