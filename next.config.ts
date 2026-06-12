import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      }
    ]
  },
  allowedDevOrigins: ['unthinkable-unatoned-patsy.ngrok-free.dev'],
};

export default nextConfig;