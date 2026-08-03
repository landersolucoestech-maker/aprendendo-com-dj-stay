import { existsSync, readFileSync } from "node:fs";

const paths = {
  programHook: "src/hooks/useAffiliateProgram.ts",
  portalHook: "src/hooks/useAffiliatePortalPagination.ts",
  page: "src/pages/affiliate/AffiliatePortal.tsx",
  documentation: "docs/refactor/FASE-B104-AFFILIATE-PORTAL-CANONICAL-HOOK.md",
  parent: "scripts/check-affiliate-portal-pagination.mjs",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B104 ausente: ${path}`);
}

if (failures.length === 0) {
  const programHook = read(paths.programHook);
  const portalHook = read(paths.portalHook);
  const page = read(paths.page);
  const documentation = read(paths.documentation).toLowerCase();
  const parent = read(paths.parent);

  if (!programHook.includes(
    "export const useAffiliatePortal = useAffiliatePortalPagination;",
  )) {
    failures.push("Hook legado não é alias direto do hook paginado.");
  }
  if (!programHook.includes(
    'import { useAffiliatePortalPagination } from "@/hooks/useAffiliatePortalPagination";',
  )) {
    failures.push("Arquivo de mutações não importa o hook paginado canônico.");
  }
  if (programHook.includes("affiliatePortalSchema")) {
    failures.push("Hook legado ainda depende do schema não paginado.");
  }
  if (programHook.includes('supabase.rpc("get_affiliate_portal"')) {
    failures.push("Arquivo de mutações ainda executa uma segunda consulta ao portal.");
  }

  const directPortalRpcCount = (
    portalHook.match(/supabase\.rpc\("get_affiliate_portal"/g) ?? []
  ).length;
  if (directPortalRpcCount !== 1) {
    failures.push(
      `Hook canônico deve possuir exatamente uma chamada RPC; encontrado: ${directPortalRpcCount}.`,
    );
  }
  if (!portalHook.includes("paginatedAffiliatePortalSchema")) {
    failures.push("Hook canônico não valida o contrato paginado.");
  }
  if (!portalHook.includes('queryKey: ["affiliate", "portal", filters]')) {
    failures.push("Hook canônico não preserva a chave de cache paginada.");
  }

  if (!page.includes("useAffiliatePortalPagination")) {
    failures.push("Página do afiliado não usa o hook canônico paginado.");
  }
  if (page.includes("useAffiliatePortal();")) {
    failures.push("Página do afiliado voltou ao alias sem parâmetros explícitos.");
  }

  for (const fragment of [
    "hook canônico",
    "alias direto",
    "uma única chamada",
    "campo `totals`",
    "branch `dev`",
  ]) {
    if (!documentation.includes(fragment)) {
      failures.push(`Documentação B104 não contém: ${fragment}`);
    }
  }

  if (!parent.includes('await import("./check-affiliate-portal-canonical-hook.mjs")')) {
    failures.push("B104 não está encadeada ao gate B103.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B104 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B104 aprovado: o portal do afiliado possui um único hook de leitura paginado.",
);
