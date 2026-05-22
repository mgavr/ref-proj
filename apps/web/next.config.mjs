/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@refproj/types', '@refproj/api-client'],
};

export default nextConfig;
