/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@snapdesk/core", "@snapdesk/types", "@snapdesk/db"],
  // Stable top-level option as of Next.js 16 (was experimental.typedRoutes).
  typedRoutes: true,
};

export default nextConfig;
