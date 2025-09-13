/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don’t run ESLint during builds (so you don’t need eslint installed)
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
