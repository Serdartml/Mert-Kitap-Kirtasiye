import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Depo kökünde eski projenin lockfile'ı durduğu için kökü açıkça belirt.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
