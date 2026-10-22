import type { NextConfig } from "next";

// Cache Components / partial prefetching are intentionally OFF: Circlo is a fully
// dynamic, session-and-database-backed app (see DECISIONS.md).
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // The seeded database and SQL migrations are read at runtime, so make sure they ship with the server bundle.
  outputFileTracingIncludes: { "/**": ["./circlo.db", "./drizzle/**/*"] },
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
