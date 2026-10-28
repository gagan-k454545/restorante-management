/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone output in Docker/Linux build environments to prevent Windows symlink EPERM
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
