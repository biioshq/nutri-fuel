import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * `next build` and `next dev` share `.next` and corrupt each other — a build
   * run while the dev server is up leaves it serving half-written chunks, and
   * sections render blank. `QA_BUILD=1 next build` writes somewhere else
   * instead, so a production check can run alongside a live dev server.
   */
  distDir: process.env.QA_DIR ?? (process.env.QA_BUILD ? '.next-qa' : '.next'),

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [400, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [160, 240, 320, 480],
    qualities: [75, 90],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },

  async headers() {
    return [
      {
        // The hero film is content-stable and unhashed; cache it hard but
        // leave a revalidation window so a re-export is picked up.
        source: '/:file*.mp4',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
