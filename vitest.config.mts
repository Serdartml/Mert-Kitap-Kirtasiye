import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Testler veritabanına bağlanmaz: veritabanı ve Next'e bağlı modüller testlerde vi.mock ile değiştirilir.
export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // "server-only" istemci dışında import edilince hata verir; testte boş modül.
      "server-only": fromRoot("./tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
