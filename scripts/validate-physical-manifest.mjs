import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/reconstruction/frontend/physical-manifest.json");
const CONTROL_PLANE_EXCLUSIONS = new Set(["scripts/reconcile-frontend-wave0.mjs"]);
const VALID_DISPOSITIONS = new Set(["KEEP","KEEP_AND_REFACTOR","REIMPLEMENT","MERGE_INTO_MODULE","SPLIT","REMOVE_AFTER_REPLACEMENT","NEEDS_INVESTIGATION"]);
const VALID_DOMAINS = new Set(["APP","SHARED","PUBLIC","AUTH","STUDENT","LEARNING","COURSE","LESSON","PLAYER","MARKETPLACE","COMMERCIAL","PAYMENTS","AFFILIATE","ADMIN","COURSE_EDITOR","CURRICULUM","SUPPORT","PRIVACY","OBSERVABILITY","INTEGRATIONS","CONFIG","TESTING","LEGACY_OTHER","HYBRID"]);
function trackedFiles(){return execFileSync("git",["ls-files","-z"],{cwd:ROOT}).toString("utf8").split("\0").filter(Boolean).sort();}
function isFrontendScope(file){if(CONTROL_PLANE_EXCLUSIONS.has(file))return false;if(file.startsWith("src/")||file.startsWith("public/"))return true;if(["index.html","components.json","package.json","package-lock.json"].includes(file))return true;if(/^(vite|vitest|tailwind|postcss)\.config\.[^/]+$/i.test(file))return true;if(/^tsconfig(?:\.[^/]+)?$/i.test(file)||/^tsconfig[^/]*\.json$/i.test(file))return true;if(/^(?:eslint(?:\.config)?|\.eslint)[^/]*$/i.test(file))return true;if(file.startsWith("scripts/"))return /(frontend|visual|build|browser|design-system|accessibility|student-navigation|student-page-frame)/i.test(file);return false;}
const manifest=JSON.parse(readFileSync(MANIFEST_PATH,"utf8"));
const physical=trackedFiles().filter(isFrontendScope);
const paths=manifest.map(x=>x.path);
const counts=new Map();for(const p of paths)counts.set(p,(counts.get(p)||0)+1);
const duplicates=[...counts].filter(([,n])=>n>1).map(([p])=>p);
const manifestSet=new Set(paths), physicalSet=new Set(physical);
const missing=physical.filter(p=>!manifestSet.has(p));
const unexpected=paths.filter(p=>!physicalSet.has(p));
const invalid=[];
for(const x of manifest){
 if(!VALID_DISPOSITIONS.has(x.disposition))invalid.push(`${x.path}: disposition`);
 if(!VALID_DOMAINS.has(x.currentDomain))invalid.push(`${x.path}: currentDomain`);
 if(!x.currentPurpose)invalid.push(`${x.path}: currentPurpose`);
 if(!x.primaryWave&&!x.waveJustification)invalid.push(`${x.path}: primaryWave`);
 if(!x.v2Destination)invalid.push(`${x.path}: v2Destination`);
 if(!x.dependencyProfile)invalid.push(`${x.path}: dependencyProfile`);
 if(x.disposition==="REMOVE_AFTER_REPLACEMENT"&&!x.replacementRequirement)invalid.push(`${x.path}: replacementRequirement`);
 if(x.disposition==="NEEDS_INVESTIGATION"&&!x.investigationReason)invalid.push(`${x.path}: investigationReason`);
}
console.log(`TOTAL_FILES=${manifest.length}`);
console.log(`PHYSICAL_SCOPE_FILES=${physical.length}`);
console.log(`CLASSIFIED_FILES=${manifest.length-invalid.length}`);
console.log(`UNCLASSIFIED_FILES=${invalid.length}`);
console.log(`DUPLICATE_PATHS=${duplicates.length}`);
console.log(`MISSING_PATHS=${missing.length}`);
console.log(`UNEXPECTED_PATHS=${unexpected.length}`);
if(manifest.length!==368||physical.length!==368||duplicates.length||missing.length||unexpected.length||invalid.length){
 if(duplicates.length)console.error("DUPLICATES",duplicates);
 if(missing.length)console.error("MISSING",missing);
 if(unexpected.length)console.error("UNEXPECTED",unexpected);
 if(invalid.length)console.error("INVALID",invalid);
 process.exit(1);
}
console.log("FRONTEND_PHYSICAL_MANIFEST_VALIDATION=PASS");
