import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      module: {
        browser: "./app/lab/node-module-shim.ts",
      },
    },
  },
};

export default nextConfig;
