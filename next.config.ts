import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Üst klasörlerdeki başka lockfile'lar yanlış kök seçtirmesin diye kökü açıkça belirt.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
