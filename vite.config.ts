import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv, type Plugin } from "vite";

const packageMetadata = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { name: string; version: string };
const immutableIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{6,149}$/;
const environmentIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,49}$/;

const validateIdentifier = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!immutableIdentifierPattern.test(normalized)) {
    throw new Error(`${label} possui formato inválido: ${normalized || "vazio"}.`);
  }
  return normalized;
};

const readGitHead = (): string | null => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const resolveRelease = (
  command: "build" | "serve",
  explicitRelease: string | undefined,
): string => {
  if (explicitRelease?.trim()) {
    return validateIdentifier(explicitRelease, "VITE_APP_RELEASE");
  }
  if (process.env.GITHUB_SHA?.trim()) {
    return validateIdentifier(process.env.GITHUB_SHA, "GITHUB_SHA");
  }

  const gitHead = readGitHead();
  if (gitHead) return validateIdentifier(gitHead, "Git HEAD");
  if (command === "serve") return "local-development";

  throw new Error(
    "Build bloqueado: revisão imutável não resolvida por VITE_APP_RELEASE, GITHUB_SHA ou Git HEAD.",
  );
};

const resolveEnvironment = (
  explicitEnvironment: string | undefined,
  mode: string,
): string => {
  const environment = explicitEnvironment?.trim() || mode;
  if (!environmentIdentifierPattern.test(environment)) {
    throw new Error(`Ambiente lógico possui formato inválido: ${environment}.`);
  }
  return environment;
};

const releaseManifestPlugin = (
  release: string,
  environment: string,
): Plugin => ({
  name: "release-manifest",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "release.json",
      source: `${JSON.stringify(
        {
          application: packageMetadata.name,
          environment,
          release,
          schema_version: 1,
          version: packageMetadata.version,
        },
        null,
        2,
      )}\n`,
    });
  },
});

const manualChunks = (id: string): string | undefined => {
  const normalizedId = id.replaceAll("\\", "/");
  if (!normalizedId.includes("/node_modules/")) return undefined;

  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("/react-dom/") ||
    normalizedId.includes("/react-router") ||
    normalizedId.includes("/@remix-run/router/") ||
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

  return undefined;
};

export default defineConfig(({ command, mode }) => {
  const environmentVariables = loadEnv(mode, process.cwd(), "");
  const release = resolveRelease(command, environmentVariables.VITE_APP_RELEASE);
  const environment = resolveEnvironment(
    environmentVariables.VITE_APP_ENV,
    mode,
  );

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), releaseManifestPlugin(release, environment)],
    define: {
      __APP_RELEASE__: JSON.stringify(release),
      __APP_ENVIRONMENT__: JSON.stringify(environment),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        onLog(level, log, handler) {
          if (
            log.code === "CIRCULAR_CHUNK" ||
            log.message.includes("Circular chunk:")
          ) {
            throw new Error(`Grafo de chunks circular bloqueado: ${log.message}`);
          }
          handler(level, log);
        },
        output: {
          manualChunks,
        },
      },
    },
  };
});
