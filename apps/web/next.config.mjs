/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@refproj/types', '@refproj/api-client'],
  images: {
    remotePatterns: [
      // Google avatars (from the userinfo endpoint).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  /**
   * Proxy /api/v1/* from this Next.js process to the NestJS API.
   *
   * Why: in dev (and in Codespaces especially) we want web and API to
   * share a hostname so session cookies set by the API land on the
   * same host the browser is using. Without this, cookies set on the
   * port-3000 hostname are invisible to the port-3001 origin.
   *
   * In production this rewrite is also fine (Next.js will proxy to
   * the configured API_INTERNAL_URL), or you can disable rewrites and
   * use a real reverse proxy (nginx/Caddy/CloudFront) — same idea,
   * same shared-host outcome.
   *
   * API_INTERNAL_URL defaults to http://localhost:3000, which is the
   * other dev process running on the same machine.
   */
  async rewrites() {
    const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
