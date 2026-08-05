import { spawnSync } from "node:child_process";

const result = spawnSync("python3", ["scripts/apply-react19-ui-compat.py"], {
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
