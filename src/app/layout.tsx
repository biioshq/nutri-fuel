import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { Nav } from '@/components/layout/Nav';
import { Grain } from '@/components/layout/Grain';
import { Footer } from '@/components/sections/Footer';
import { SITE } from '@/lib/site';

/**
 * Display: Outfit — a geometric sans, variable, so the 200 used for the huge
 * headings and the 400 used for small numerals come from a single file.
 * Text: Inter, for labels and body copy.
 */
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
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
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: 'en_IN',
    images: [{ url: '/vanilla.png', width: 1672, height: 941, alt: `${SITE.name} Vanilla protein shake` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
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
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body>
        <div aria-hidden className="page-glow" />

        <a
          href="#main"
          className="sr-only rounded-full bg-ink px-5 py-3 font-sans text-micro tracking-luxe text-canvas uppercase focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:z-[120]"
        >
          Skip to content
        </a>

        <SmoothScroll>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <Grain />
        </SmoothScroll>
      </body>
    </html>
  );
}
