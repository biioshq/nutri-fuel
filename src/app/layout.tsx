import type { Metadata, Viewport } from 'next';
import { Libre_Baskerville } from 'next/font/google';
import './globals.css';

import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { Nav } from '@/components/layout/Nav';
import { Loader } from '@/components/layout/Loader';
import { Grain } from '@/components/layout/Grain';
import { Footer } from '@/components/sections/Footer';
import { SITE } from '@/lib/site';

/**
 * One face for the whole site: Libre Baskerville, a transitional serif drawn
 * for screens — a wider set and a taller x-height than print Baskerville, so
 * it holds up at caption sizes as well as at the display sizes.
 *
 * It ships 400 and 700 only. Nothing here asks for a lighter weight, and
 * `font-synthesis-weight: none` in the base layer means a stray `font-light`
 * renders as 400 rather than as a smeared fake.
 */
const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-baskerville',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'protein shake',
    'ready to drink protein',
    'high protein low sugar',
    'chocolate protein shake',
    'vanilla protein shake',
    'strawberry protein shake',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    locale: 'en_IN',
    images: [{ url: '/vanilla.png', width: 1672, height: 941, alt: `${SITE.name} Vanilla protein shake` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    images: ['/vanilla.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={baskerville.variable}>
      <body>
        <div aria-hidden className="page-glow" />

        <a
          href="#main"
          className="sr-only rounded-full bg-ink px-5 py-3 font-sans text-micro tracking-luxe text-canvas uppercase focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:z-[120]"
        >
          Skip to content
        </a>

        <SmoothScroll>
          <Loader />
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <Grain />
        </SmoothScroll>
      </body>
    </html>
  );
}
