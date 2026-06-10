import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /** New hash on each build — busts cached JS/CSS in production */
  generateBuildId: async () => process.env.BUILD_ID || `wc26-${Date.now()}`,
  ...(isDev
    ? {
        headers: async () => [
          {
            source: "/:path*",
            headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
          },
        ],
      }
    : {}),
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/w40/**",
      },
    ],
  },
};

export default nextConfig;
