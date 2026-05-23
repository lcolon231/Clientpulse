import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // recharts uses browser globals (ResizeObserver, window) that aren't
  // available during SSR; transpiling it through Next.js avoids the crash.
  transpilePackages: ["recharts"],
};

export default nextConfig;
