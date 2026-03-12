import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright-core', 'archiver'],
  async redirects() {
    return [
      {
        source: '/tiktok',
        destination: '/tiktok/tiktokK6k2GcLQ168JtZpLVwwQ8VAPr4KFYLra.txt',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
