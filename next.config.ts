import type { NextConfig } from "next";

const securityHeaders = [
  // The Content-Security-Policy is added per request in src/proxy.ts (it depends on run-time settings).
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Only this site may use the sensors the app asks for; everything else is off.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), microphone=(self), camera=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), payment=(), usb=(), bluetooth=(), serial=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Public, read-only data that is the same for everyone: let the CDN keep it close to your users (the app then
      // loads it in milliseconds instead of waiting for a server). Never applied to /api/ai, push, health or anything personal.
      {
        source: "/api/:name(ayah-of-day|hadith|duas|tafsir|names|learn|quran|prayer|search|mosques|geocode)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=900, stale-while-revalidate=86400" }],
      },
      {
        source: "/api/:name(ayah-of-day|hadith|duas|tafsir|names|learn|quran|prayer|search|mosques|geocode)",
        headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=900, stale-while-revalidate=86400" }],
      },
    ];
  },
  // The server reads the bundled Quran/hadith JSON from ./data at runtime; make sure deployments ship it.
  outputFileTracingIncludes: {
    '/api/**': ['./data/**/*'],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
