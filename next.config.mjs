import { fileURLToPath } from "url";
import { dirname } from "path";

/** @type {import('next').NextConfig} */
const __dirname = dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname
};

export default nextConfig;
