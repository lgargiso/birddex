import type { NextConfig } from "next";

// TypeScript checking runs via `npm run typecheck` (tsc --noEmit) locally.
// ignoreBuildErrors set because Next.js 16 TypeScript worker crashes on Vercel's
// build runner (zero error output, exit 1) — not a code type error.
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
