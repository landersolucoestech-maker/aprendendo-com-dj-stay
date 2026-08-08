import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(process.cwd(), "visual-preview"),
  publicDir: resolve(process.cwd(), "public"),
  base: "/aprendendo-com-dj-stay/",
  plugins: [react()],
  resolve: { alias: { "@": resolve(process.cwd(), "src") } },
  build: {
    outDir: resolve(process.cwd(), "dist-visual-preview"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
