import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: '**.blu-ray.com' },
      { protocol: 'https', hostname: '**.ssl-images-amazon.com' },
    ],
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
