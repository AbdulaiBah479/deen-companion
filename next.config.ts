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
    return [{ source: "/:path*", headers: securityHeaders }];
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
