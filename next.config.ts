import type { NextConfig } from "next";

// Cache Components / partial prefetching are intentionally OFF: Circlo is a fully
// dynamic, session-and-database-backed app (see DECISIONS.md).
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
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
