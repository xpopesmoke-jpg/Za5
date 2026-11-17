import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local development database ships its own engine files; load it as-is instead of bundling it.
  serverExternalPackages: ["@electric-sql/pglite"],
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
