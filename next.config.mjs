/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/auth/reset-password/auth/reset-password',
        destination: '/auth/reset-password',
        permanent: false
      }
    ];
  }
};

export default nextConfig;
