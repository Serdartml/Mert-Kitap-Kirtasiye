import path from "node:path";
import type { NextConfig } from "next";

// Ürün görselleri Cloudflare R2'den gelir (lib/r2.ts); next/image yalnızca bu adresten görsel yükler.
function r2ImagePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  try {
    const url = new URL(process.env.R2_PUBLIC_URL ?? "");
    return [{ protocol: url.protocol === "http:" ? "http" : "https", hostname: url.hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns: r2ImagePatterns() },
  // Sayfaların sabit kısmı önceden üretilir, "use cache" ile işaretli veriler önbellekten gelir;
  // yalnızca çerez okuyan parçalar (sepet) istek anında akar.
  cacheComponents: true,
  partialPrefetching: true,
  // Üst klasörlerdeki başka lockfile'lar yanlış kök seçtirmesin diye kökü açıkça belirt.
  turbopack: { root: path.resolve(__dirname) },
  // Geliştirme sunucusuna aynı ağdaki telefondan (http://192.168.x.x:3000) bağlanabilmek için.
  // Bu izin olmadan Next.js dev kaynaklarını engeller ve sayfadaki JavaScript telefonda çalışmaz.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Yönetimdeki Excel içe aktarma (actions/product-import.ts) dosyayı action ile yükler; varsayılan 1 MB sınırı 10 bin
  // ürünlük dosyaya yetmez. Vercel istek sınırı 4,5 MB olduğundan bunun üstüne çıkılamaz.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};

export default nextConfig;
