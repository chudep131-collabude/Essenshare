/** @type {import('next').NextConfig} */

// Derive API origin from NEXT_PUBLIC_API_URL so CSP works in all environments.
// Falls back to localhost only when the env var is absent (local dev without .env.local).
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
let apiOrigin;
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  // Malformed URL fall back safely
  apiOrigin = 'http://localhost:3001';
}

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  images: {
    unoptimized: isDev,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Security headers on all responses (SOC 2 Confidentiality / Transport Security)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://api.mapbox.com https://*.mapbox.com https://cdnjs.cloudflare.com",
              "font-src 'self' data: https://cdnjs.cloudflare.com",
              `connect-src 'self' ${apiOrigin} https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com https://router.project-osrm.org`,
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Redirect old HTML pages to new Next.js routes
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/find.html', destination: '/find', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/impact.html', destination: '/impact', permanent: true },
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/register.html', destination: '/register', permanent: true },
      { source: '/safety.html', destination: '/safety', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
    ];
  },
};

module.exports = nextConfig;
