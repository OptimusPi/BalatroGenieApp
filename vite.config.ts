import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// motely-wasm 21.x is an EMBEDDED build: the engine is base64-inlined into the
// JS (no separate .wasm asset, no boot args, no COOP/COEP headers). We exclude
// it from esbuild's dep pre-bundling so the multi-MB inlined module isn't
// re-chunked on every dev boot, and lift the chunk-size warning for the build.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["motely-wasm"],
  },
  build: {
    chunkSizeWarningLimit: 40000,
  },
});
