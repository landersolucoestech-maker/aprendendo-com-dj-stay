import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const manualChunks = (id: string): string | undefined => {
  const normalizedId = id.replaceAll("\\", "/");
  if (!normalizedId.includes("/node_modules/")) return undefined;

  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("/react-dom/") ||
    normalizedId.includes("/react-router") ||
    normalizedId.includes("/scheduler/")
  ) {
    return "vendor-react";
  }

  if (normalizedId.includes("/@tanstack/")) return "vendor-query";
  if (normalizedId.includes("/@supabase/")) return "vendor-supabase";
  if (normalizedId.includes("/@radix-ui/")) return "vendor-radix";

  if (
    normalizedId.includes("/recharts/") ||
    normalizedId.includes("/d3-") ||
    normalizedId.includes("/victory-vendor/")
  ) {
    return "vendor-charts";
  }

  if (
    normalizedId.includes("/react-hook-form/") ||
    normalizedId.includes("/@hookform/") ||
    normalizedId.includes("/zod/")
  ) {
    return "vendor-forms";
  }

  if (
    normalizedId.includes("/lucide-react/") ||
    normalizedId.includes("/class-variance-authority/") ||
    normalizedId.includes("/clsx/") ||
    normalizedId.includes("/tailwind-merge/") ||
    normalizedId.includes("/sonner/") ||
    normalizedId.includes("/vaul/") ||
    normalizedId.includes("/cmdk/") ||
    normalizedId.includes("/date-fns/") ||
    normalizedId.includes("/embla-carousel") ||
    normalizedId.includes("/input-otp/") ||
    normalizedId.includes("/react-day-picker/")
  ) {
    return "vendor-ui";
  }

  return "vendor-misc";
};

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
