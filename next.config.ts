import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Next.js from inferring the monorepo root when multiple lockfiles exist.
  // (This repo is commonly checked out inside a larger workspace.)
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['playwright-core', 'archiver'],
};

export default nextConfig;
