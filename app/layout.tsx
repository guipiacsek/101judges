import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '101 Judges',
  description: 'Ask anything, give the options, and 101 AI judges, each a different American, cast their vote.',
};

export const viewport: Viewport = { themeColor: '#fcfbf9' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
