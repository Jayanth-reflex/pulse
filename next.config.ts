import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in $HOME otherwise confuses Turbopack.
  turbopack: { root: path.resolve(__dirname) },
  // Frontend-only living atlas — emit a fully static site for Vercel.
  output: "export",
  // No server image optimization in a static export.
  images: { unoptimized: true },
  // Emit /route/index.html so any static host resolves clean URLs.
  trailingSlash: true,
};

export default nextConfig;
