import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
