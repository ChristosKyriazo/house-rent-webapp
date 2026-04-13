import path from "path";
import type { NextConfig } from "next";

/** Pin app root so Turbopack does not pick a parent lockfile (e.g. ~/package-lock.json). */
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
