import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Baseline security headers for every marketplace response (SEO audit 2026-10, section 2.3).
// No Content-Security-Policy yet: roll it out as Report-Only first (GTM, Google Maps, photo CDN).
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Why: forbidden() иначе бросает обычную ошибку, и error.tsx показывает «Что-то пошло не так».
  experimental: {
    authInterrupts: true,
  },
  turbopack: {
    root: projectRoot,
    // Why: @mui/x-chat грузит remend через приватный импорт `#remend`, который webpack/turbopack не резолвят из node_modules.
    resolveAlias: {
      "#remend": "./node_modules/remend",
    },
  },
  webpack: (config) => {
    config.resolve.alias["#remend"] = path.join(projectRoot, "node_modules/remend");
    return config;
  },
  async redirects() {
    return [
      { source: "/login", destination: "/signin", permanent: false },
      { source: "/register", destination: "/signup", permanent: false },
      { source: "/auth", destination: "/signin", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.zemledelpro.ru",
      },
      {
        protocol: "https",
        hostname: "cdn.zemledel.pro",
      },
      {
        protocol: "https",
        hostname: "storage.yandexcloud.net",
      },
    ],
  },
};

export default nextConfig;
