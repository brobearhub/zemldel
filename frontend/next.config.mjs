import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
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
