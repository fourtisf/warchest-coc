/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8787';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@warchest/game-core'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
