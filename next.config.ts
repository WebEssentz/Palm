import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  allowedDevOrigins: ['unthinkable-unatoned-patsy.ngrok-free.dev'],

  async redirects() {
    return [
      // /dashboard/:session/projects → /projects  (old projects page)
      {
        source: '/dashboard/:session/projects',
        destination: '/projects',
        permanent: true, // 308 — browser caches it, never hits the server again
      },
      // /dashboard/:session → /projects  (old workspace home)
      {
        source: '/dashboard/:session',
        destination: '/projects',
        permanent: true,
      },
      // /dashboard → /projects  (bare redirect)
      {
        source: '/dashboard',
        destination: '/projects',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;