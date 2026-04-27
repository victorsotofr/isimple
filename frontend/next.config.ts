import path from "node:path";
import type { NextConfig } from "next";

const frontendRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Keep Turbopack rooted in this package. The repo is not a pnpm workspace,
  // so resolving from the monorepo root breaks local dependency lookup.
  outputFileTracingRoot: frontendRoot,
  turbopack: {
    root: frontendRoot,
  },
};

export default nextConfig;
