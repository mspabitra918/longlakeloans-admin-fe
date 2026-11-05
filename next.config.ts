import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* to the Express backend so the browser stays same-origin
  // (no CORS setup needed for the admin portal).
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:5001";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
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
