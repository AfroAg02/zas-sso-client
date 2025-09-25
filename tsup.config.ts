import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  bundle: true,
  splitting: false,
  dts: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2020",
  external: ["react", "react-dom", "next", "@tanstack/react-query", "jose"],
  skipNodeModulesBundle: true,
  esbuildOptions(options) {
    // Ensure we don't keep directory structure
    options.treeShaking = true;
  },
});
