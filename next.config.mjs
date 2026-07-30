/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
];

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/irc/deliver': ['./node_modules/pdfkit/js/data/*.afm']
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  },
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
