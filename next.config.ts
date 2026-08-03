import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Grocery product photos are hotlinked from ~100+ retailer/brand sites we
    // don't control (see the product image library import) — far past the
    // 50-entry cap this config enforces on remotePatterns, and some of those
    // hosts block a server-side fetch even once trusted. Unoptimized skips
    // Next's server-side proxy entirely: the browser loads the src directly,
    // so no host list is needed and none of this can 400 the build or a page.
    unoptimized: true,
  },
};

export default nextConfig;
