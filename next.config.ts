import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local development database ships its own engine files; load it as-is instead of bundling it.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Plan uploads (a PDF plus its pages as pictures) pass through the language proxy whole.
    proxyClientMaxBodySize: 40 * 1024 * 1024,
  },
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
