import { spawnSync } from "node:child_process";
import { relative } from "node:path";

const result = spawnSync("npx", ["eslint", ".", "--format", "json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 20 * 1024 * 1024,
});

let reports;
try {
  reports = JSON.parse(result.stdout || "[]");
} catch {
  console.error(result.stderr || result.stdout || "ESLint did not return a report.");
  process.exit(result.status ?? 1);
}

let errors = 0;
let warnings = 0;
for (const report of reports) {
  errors += report.errorCount;
  warnings += report.warningCount;
  for (const message of report.messages) {
    if (message.severity !== 2) continue;
    const file = relative(process.cwd(), report.filePath);
    console.error(`${file}:${message.line ?? 0}:${message.column ?? 0} ${message.ruleId ?? "eslint"} ${message.message}`);
  }
}

console.log(`ESLint summary: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
