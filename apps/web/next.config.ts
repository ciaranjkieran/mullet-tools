import type { NextConfig } from "next";

// Use environment variable, fallback to localhost for development
const API_BASE = process.env.API_BASE || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@shared"],

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "192.168.0.7",
        port: "8000",
        pathname: "/media/**",
      },
      // production backend media (Render)
      {
        protocol: "https",
        hostname: "mullet-tools-backend.onrender.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons/**",
      },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${API_BASE}/media/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
