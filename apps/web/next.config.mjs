/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@snapdesk/core", "@snapdesk/types", "@snapdesk/db"],
  // Stable top-level option as of Next.js 16 (was experimental.typedRoutes).
  typedRoutes: true,
  // P10 task #8 (TASKS.md, deploy) — traces the production dependency
  // graph into .next/standalone so the Docker runner stage (Dockerfile)
  // can ship a minimal image instead of the whole monorepo + node_modules.
  // No effect on `next dev`.
  output: "standalone",
};

export default nextConfig;
