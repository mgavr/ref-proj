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
};

export default nextConfig;
