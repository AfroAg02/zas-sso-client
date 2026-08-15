import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // PBKDF2 a 100k iteraciones cuesta ~29 ms: los tests que miden derivaciones
    // en frío necesitan algo más de margen que el default.
    testTimeout: 20_000,
  },
});
