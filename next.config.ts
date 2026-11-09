import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product and tile photos are served from our own /public/products. Let browsers keep them for a day
  // (and reuse them while refreshing for a week) so repeat visits do not wait on the network.
  async headers() {
    return [
      { source: '/products/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/categories/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ]
  },
  images: {
    // Vercel's image optimizer is over its plan quota and answers every
    // /_next/image request with 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED),
    // so images rendered through next/image showed as broken. Serve them
    // straight from their source instead.
    unoptimized: true,
    // Only our own storage + Unsplash go through Next's optimizer (resized,
    // compressed, served as WebP/AVIF). Grocery product photos are hotlinked
    // from ~100+ retailer/brand sites we don't control — far past the
    // remotePatterns cap, and some of those hosts block a server-side fetch
    // even once trusted — so every <Image> that can render one of those sets
    // `unoptimized` itself instead of relying on a global default.
    remotePatterns: [
      { protocol: 'https', hostname: 'wdvonmzfbwnsluaxjptw.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
