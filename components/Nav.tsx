import Link from 'next/link';
import { T } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export default function Nav({ locale }: { locale: Locale }) {
  const t = T[locale];
  return (
    <nav>
      <Link href={t.home} className="logo">
        101.
      </Link>
      <div className="links">
        <Link href={`${t.home}#trending`}>{t.trending}</Link>
        <Link href={t.termsHref}>{t.terms}</Link>
      </div>
      <div className="toggle" aria-label="Language">
        <Link href="/" className={locale === 'en' ? 'on' : ''} aria-current={locale === 'en' ? 'true' : undefined}>
          US
        </Link>
        <Link href="/br" className={locale === 'pt' ? 'on' : ''} aria-current={locale === 'pt' ? 'true' : undefined}>
          BR
        </Link>
      </div>
    </nav>
  );
}
