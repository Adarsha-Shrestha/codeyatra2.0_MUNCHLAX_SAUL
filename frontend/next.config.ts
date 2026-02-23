import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
      "tailwindcss-animate": path.resolve(__dirname, "node_modules/tailwindcss-animate"),
      "@tailwindcss/postcss": path.resolve(__dirname, "node_modules/@tailwindcss/postcss"),
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
