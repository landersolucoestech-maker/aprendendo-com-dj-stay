import { readFile } from "node:fs/promises";

const expectedCaniuseLiteVersion = "1.0.30001806";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const workflow = await readFile(".github/workflows/baseline.yml", "utf8");

const caniuseLite = lock.packages?.["node_modules/caniuse-lite"];
const browserslist = lock.packages?.["node_modules/browserslist"];
const failures = [];

if (!caniuseLite) {
  failures.push("caniuse-lite não foi encontrado no package-lock.json");
} else {
  if (caniuseLite.version !== expectedCaniuseLiteVersion) {
    failures.push(
      `caniuse-lite deve estar em ${expectedCaniuseLiteVersion}, encontrado ${caniuseLite.version ?? "sem versão"}`,
    );
  }

  if (
    typeof caniuseLite.resolved !== "string" ||
    !caniuseLite.resolved.includes(`caniuse-lite-${expectedCaniuseLiteVersion}.tgz`)
  ) {
    failures.push("URL resolvida de caniuse-lite não corresponde à versão fixada");
  }

  if (typeof caniuseLite.integrity !== "string" || !caniuseLite.integrity.startsWith("sha512-")) {
    failures.push("integridade sha512 de caniuse-lite está ausente");
  }
}

if (!browserslist?.version) {
  failures.push("Browserslist não foi encontrado no package-lock.json");
}

if (workflow.includes("Atualizar base Browserslist") || workflow.includes("update-browserslist-db@")) {
  failures.push("etapa temporária de atualização Browserslist ainda está presente no CI");
}

if (failures.length > 0) {
  console.error("Falhas no contrato B47:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Contrato B47 aprovado: caniuse-lite ${caniuseLite.version}, Browserslist ${browserslist.version} e workflow sem mutação temporária.`,
);
