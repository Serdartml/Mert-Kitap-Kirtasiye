import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sayfaların sabit kısmı önceden üretilir, "use cache" ile işaretli veriler önbellekten gelir;
  // yalnızca çerez okuyan parçalar (sepet) istek anında akar.
  cacheComponents: true,
  partialPrefetching: true,
  // Üst klasörlerdeki başka lockfile'lar yanlış kök seçtirmesin diye kökü açıkça belirt.
  turbopack: { root: path.resolve(__dirname) },
  // Geliştirme sunucusuna aynı ağdaki telefondan (http://192.168.x.x:3000) bağlanabilmek için.
  // Bu izin olmadan Next.js dev kaynaklarını engeller ve sayfadaki JavaScript telefonda çalışmaz.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
