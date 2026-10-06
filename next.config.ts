import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Üst klasörlerdeki başka lockfile'lar yanlış kök seçtirmesin diye kökü açıkça belirt.
  turbopack: { root: path.resolve(__dirname) },
  // Geliştirme sunucusuna aynı ağdaki telefondan (http://192.168.x.x:3000) bağlanabilmek için.
  // Bu izin olmadan Next.js dev kaynaklarını engeller ve sayfadaki JavaScript telefonda çalışmaz.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
