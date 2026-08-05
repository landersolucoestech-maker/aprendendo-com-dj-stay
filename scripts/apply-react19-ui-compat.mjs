import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const pythonPath = "scripts/apply-react19-ui-compat.py";
let source = readFileSync(pythonPath, "utf8");

source = source.replace(
  `      nameKey,\n      ...props\n`,
  `      nameKey,\n`,
);

const unnecessaryLegendSpreadPatch = `chart = replace_once(
    chart,
    '''          className
        )}
      >''',
    '''          className
        )}
        {...props}
      >''',
    "chart legend div props",
)
`;

if (!source.includes(unnecessaryLegendSpreadPatch)) {
  throw new Error("Bloco ambíguo esperado não foi encontrado no patcher Python.");
}
source = source.replace(unnecessaryLegendSpreadPatch, "");

const chartWriteAnchor = "chart_path.write_text(chart)\n";
const tooltipKeyPatch = [
  "chart = replace_once(",
  "    chart,",
  "    '''                key={item.dataKey}''',",
  "    '''                key={`${String(item.name ?? \"item\")}-${index}`}''',",
  "    \"chart tooltip key\",",
  ")",
  "",
].join("\n");

if (source.split(chartWriteAnchor).length !== 2) {
  throw new Error("Âncora única para gravar chart.tsx não foi encontrada.");
}
source = source.replace(chartWriteAnchor, `${tooltipKeyPatch}${chartWriteAnchor}`);
writeFileSync(pythonPath, source, "utf8");

const result = spawnSync("python3", [pythonPath], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
