import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["next-auth", "mongoose"],
  output:"standalone"
};

export default nextConfig;
