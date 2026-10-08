import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    ],
  },
};

export default nextConfig;
