import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "reconstruction", "frontend");
mkdirSync(OUT, { recursive: true });
const CONTROL_PLANE_EXCLUSIONS = new Set(["scripts/reconcile-frontend-wave0.mjs"]);
const REVIEWED = __REVIEWED_PLACEHOLDER__;
