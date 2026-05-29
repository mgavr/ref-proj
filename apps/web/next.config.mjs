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
  // /api/v1/* is proxied via a Route Handler at
  // apps/web/app/api/v1/[...path]/route.ts — not via Next.js rewrites.
  // Rewrites work locally but Vercel's edge resolver blocks
  // cross-host rewrites in some IPv6/CDN cases
  // (DNS_HOSTNAME_RESOLVED_PRIVATE). A route handler in the Node.js
  // runtime has no such restriction.
};

export default nextConfig;
