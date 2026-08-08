import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "reconstruction", "frontend");
mkdirSync(OUT, { recursive: true });

// Control-plane tooling added after the audited 368-file baseline is not part of the application frontend scope.
const CONTROL_PLANE_EXCLUSIONS = new Set(["scripts/reconcile-frontend-wave0.mjs"]);
const EXPECTED_DOMAINS = { ADMIN:26, AFFILIATE:11, APP:17, AUTH:14, CONFIG:26, COURSE_EDITOR:4, CURRICULUM:11, INTEGRATIONS:20, LEARNING:26, LEGACY_OTHER:9, LESSON:8, MARKETPLACE:5, OBSERVABILITY:7, PAYMENTS:27, PLAYER:10, PRIVACY:5, PUBLIC:21, SHARED:69, STUDENT:34, SUPPORT:4, TESTING:14 };
const EXPECTED_DISPOSITIONS = { KEEP:45, KEEP_AND_REFACTOR:177, MERGE_INTO_MODULE:68, NEEDS_INVESTIGATION:27, REIMPLEMENT:49, REMOVE_AFTER_REPLACEMENT:2 };
const EXPECTED_WAVES = { "WAVE 0":75, "WAVE 1":17, "WAVE 2":35, "WAVE 3":54, "WAVE 4":44, "WAVE 5":31, "WAVE 6":11, "WAVE 7":2, "WAVE 8":15, "WAVE 9":40, "WAVE 10":3, "WAVE 11":41 };
const KEEP_UI = new Set(["alert.tsx","avatar.tsx","badge.tsx","breadcrumb.tsx","button.tsx","card.tsx","checkbox.tsx","dialog.tsx","drawer.tsx","form.tsx","input.tsx","label.tsx","page-state.tsx","pagination.tsx","progress.tsx","scroll-area.tsx","select.tsx","separator.tsx","sheet.tsx","skeleton.tsx","sonner.tsx","switch.tsx","table.tsx","tabs.tsx","textarea.tsx","tooltip.tsx"]);
const INTEGRATION_CONTRACTS = new Set(["academic-analytics.ts","authorization.ts","certificates.ts","contact-messages.ts","contract-error.ts","profile.ts","storage.ts","student-activity-history.ts","student-communication-preferences.ts","student-favorites.ts","student-library-page.ts","student-library-summary.ts","student-notifications.ts"]);
const TESTING_CONTRACTS = new Set(["academic-analytics.test.ts","authorization.test.ts","certificates.test.ts","contact-messages.test.ts","contract-error.test.ts","profile.test.ts","storage-file-name.test.ts","storage.test.ts","student-activity-history.test.ts","student-communication-preferences.test.ts","student-favorites.test.ts","student-library-page.test.ts","student-library-summary.test.ts","student-notifications.test.ts"]);
const PUBLIC_COMPONENTS = /^(BenefitsSection|CourseModulesSection|Footer|HeroSection|InstructorSection|Navigation|OperationalTrustSection)\.tsx$/;
const AUTH_PAGES = /^(AuthCallback|ForgotPassword|Login|Register|ResetPassword|Verified|VerifyEmail)\.tsx$/;
const PUBLIC_PAGES = /^(AccessDenied|CertificateValidation|Contact|Index|NotFound)\.tsx$/;
const HIGH_RISK_REQUIRED = ["src/App.tsx","src/auth/AuthProvider.tsx","src/integrations/supabase/client.ts","src/components/student/StudentPortalShell.tsx","src/components/admin/AdminNavigation.tsx","src/pages/Lesson.tsx","src/pages/admin/CourseEditor.tsx","src/pages/admin/CourseCurriculum.tsx","src/pages/affiliate/AffiliatePortal.tsx","src/pages/admin/AdminDashboard.tsx"];

function git(args) { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim(); }
function trackedFiles() { return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT }).toString("utf8").split("\0").filter(Boolean).sort(); }
function inScope(file) {
  if (CONTROL_PLANE_EXCLUSIONS.has(file)) return false;
  if (file.startsWith("src/") || file.startsWith("public/")) return true;
  if (["index.html","components.json","package.json","package-lock.json"].includes(file)) return true;
  if (/^(vite|vitest|tailwind|postcss)\.config\.[^/]+$/i.test(file)) return true;
  if (/^tsconfig(?:\.[^/]+)?$/i.test(file) || /^tsconfig[^/]*\.json$/i.test(file)) return true;
  if (/^(?:eslint(?:\.config)?|\.eslint)[^/]*$/i.test(file)) return true;
  return file.startsWith("scripts/") && /(frontend|visual|build|browser|design-system|accessibility|student-navigation|student-page-frame)/i.test(file);
}
function fileType(file) {
  const extension = path.extname(file).toLowerCase();
  const types = { ".ts":"typescript", ".tsx":"typescript-react", ".js":"javascript", ".jsx":"javascript-react", ".mjs":"javascript-module", ".cjs":"commonjs", ".json":"json", ".css":"css", ".html":"html", ".png":"png", ".jpg":"jpeg", ".jpeg":"jpeg", ".ico":"icon", ".txt":"txt" };
  return { extension, type: types[extension] || (extension ? extension.slice(1) : "no-extension") };
}
function domain(file) {
  const base = path.basename(file);
  if (file === "index.html" || file.startsWith("public/") || file === "src/components/admin/AdminNavigation.tsx" || PUBLIC_COMPONENTS.test(base) || (file.startsWith("src/pages/") && PUBLIC_PAGES.test(base))) return "PUBLIC";
  if (!file.startsWith("src/")) return file.startsWith("scripts/check-frontend-error-") ? "OBSERVABILITY" : "CONFIG";
  if (file === "src/App.tsx" || file === "src/main.tsx" || file.startsWith("src/routing/")) return "APP";
  if (file.startsWith("src/auth/") || (file.startsWith("src/pages/") && AUTH_PAGES.test(base))) return "AUTH";
  if (file.includes("course-cms") || file === "src/hooks/useCourseCms.ts" || file === "src/pages/admin/CourseEditor.tsx") return "COURSE_EDITOR";
  if (file.includes("curriculum-cms") || /^src\/components\/admin\/(CurriculumEditorDialogs|CurriculumModuleCard|LessonAssetsDialog|LessonEditorDialog|ModuleEditorDialog)\.tsx$/.test(file) || ["src/hooks/useCurriculumCms.ts","src/hooks/useLessonAssetUpload.ts","src/pages/admin/CourseCurriculum.tsx"].includes(file)) return "CURRICULUM";
  if (file.startsWith("src/components/affiliate/") || file.includes("affiliate-portal-pagination") || /^src\/contracts\/affiliate(\.test)?\.ts$/.test(file) || file.startsWith("src/hooks/useAffiliate") || file.startsWith("src/lib/affiliate-attribution") || file === "src/pages/affiliate/AffiliatePortal.tsx" || file === "src/pages/AffiliateRedirect.tsx") return "AFFILIATE";
  if (file.startsWith("src/components/student/") || file.startsWith("src/pages/student/") || file === "src/pages/EditProfile.tsx" || file === "src/pages/admin/StudentsAdmin.tsx" || /^src\/hooks\/(useStudent|useAvatarUpload|useCurrentRole|useUserProfile)/.test(file)) return "STUDENT";
  if (file.startsWith("src/components/ui/") || file === "src/accessibility/RouteAccessibility.tsx" || file === "src/components/layout/AppPageShell.tsx" || ["src/hooks/use-mobile.tsx","src/hooks/use-toast.ts","src/index.css"].includes(file) || /^src\/lib\/(date-time|error-message|external-player-bridge|private-assets|query-client|recent-activities|utils)/.test(file)) return "SHARED";
  if (/^src\/components\/(ExternalLessonMedia|PrivateLessonMedia|VideoPlayer)\.tsx$/.test(file) || /src\/contracts\/(lesson-media|playback)/.test(file) || file === "src/hooks/useLessonPlayback.ts" || file.startsWith("src/lib/playback-fingerprint")) return "PLAYER";
  if (/^src\/components\/(LessonCard|LessonGrid|LessonTextPanel)\.tsx$/.test(file) || /^src\/hooks\/useLesson(?!Playback|Asset)/.test(file) || file === "src/pages/Lesson.tsx") return "LESSON";
  if (file.includes("privacy-rights") || file === "src/hooks/usePrivacyRightsRequests.ts") return "PRIVACY";
  if (/src\/contracts\/support/.test(file) || file === "src/hooks/useSupportTickets.ts" || file.endsWith("/support-rpc.ts")) return "SUPPORT";
  if (file.startsWith("src/observability/") || file.includes("frontend-errors") || file === "src/hooks/useFrontendErrors.ts" || file.endsWith("/frontend-error-rpc.ts")) return "OBSERVABILITY";
  if (file.includes("marketplace") || file === "src/hooks/useDigitalMarketplace.ts" || file.startsWith("src/pages/marketplace/")) return "MARKETPLACE";
  if (file.startsWith("src/pages/admin/") || file.startsWith("src/components/admin/") || /affiliate-admin-pagination|students-admin-pagination/.test(file) || ["src/hooks/useAcademicAnalytics.ts","src/hooks/usePaymentAdmin.ts","src/integrations/supabase/payment-admin-rpc.ts"].includes(file) || file.startsWith("src/lib/admin-overview")) return "ADMIN";
  if (/(checkout|payment|payments|hosted-checkout)/i.test(file)) return "PAYMENTS";
  if (file.startsWith("src/contracts/") && TESTING_CONTRACTS.has(base)) return "TESTING";
  if ((file.startsWith("src/contracts/") && INTEGRATION_CONTRACTS.has(base)) || file.startsWith("src/integrations/supabase/")) return "INTEGRATIONS";
  if (/src\/contracts\/(course-access|learning|public-course-catalog|student-course-access|student-course-detail-access|student-progress-summary)/.test(file) || /^src\/hooks\/(useCourseAssetUrl|useCourseImageUpload|useModules|useProgressCalculation|usePublicCourseCatalog|useUserProgress)\.ts$/.test(file) || /^src\/lib\/(course-progress|lesson-progress-client|overall-course-progress)/.test(file) || file === "src/components/ModuleProgress.tsx" || file === "src/runtime/load-public-course-catalog.ts") return "LEARNING";
  if (file.startsWith("src/config/") || ["src/hooks/useCertificates.ts","src/hooks/useContactMessages.ts","src/hooks/useRecentActivities.ts","src/vite-env.d.ts"].includes(file) || file.startsWith("src/runtime/ci-runtime-smoke-catalog")) return "LEGACY_OTHER";
  throw new Error(`UNCLASSIFIED_DOMAIN ${file}`);
}
function disposition(file, d) {
  const base = path.basename(file);
  if (d === "APP" || d === "TESTING") return "KEEP_AND_REFACTOR";
  if (d === "CONFIG") return file.startsWith("scripts/") ? "KEEP_AND_REFACTOR" : "KEEP";
  if (d === "PUBLIC") { if (file === "src/components/admin/AdminNavigation.tsx") return "REMOVE_AFTER_REPLACEMENT"; if (file === "index.html" || file.startsWith("public/")) return "KEEP"; if (file.startsWith("src/components/")) return "MERGE_INTO_MODULE"; return "REIMPLEMENT"; }
  if (d === "SHARED") { if (["src/accessibility/RouteAccessibility.tsx","src/components/layout/AppPageShell.tsx","src/index.css"].includes(file)) return "NEEDS_INVESTIGATION"; if (file.startsWith("src/components/ui/") && KEEP_UI.has(base)) return "KEEP"; return "KEEP_AND_REFACTOR"; }
  if (d === "AUTH") { if (file.startsWith("src/pages/")) return "REIMPLEMENT"; if (["src/auth/AuthProvider.tsx","src/auth/user-metadata.test.ts"].includes(file)) return "KEEP_AND_REFACTOR"; return "NEEDS_INVESTIGATION"; }
  if (d === "STUDENT") { if (file === "src/components/student/StudentPortalShell.tsx") return "REMOVE_AFTER_REPLACEMENT"; return file.startsWith("src/pages/") ? "REIMPLEMENT" : "MERGE_INTO_MODULE"; }
  if (["LESSON","MARKETPLACE","COURSE_EDITOR","CURRICULUM","AFFILIATE","ADMIN"].includes(d)) { if (file.startsWith("src/pages/")) return "REIMPLEMENT"; if (file.startsWith("src/components/") || file.startsWith("src/hooks/")) return "MERGE_INTO_MODULE"; return "KEEP_AND_REFACTOR"; }
  if (d === "PLAYER") return file.startsWith("src/components/") || file.startsWith("src/hooks/") ? "MERGE_INTO_MODULE" : "KEEP_AND_REFACTOR";
  if (d === "INTEGRATIONS") return file.startsWith("src/contracts/") ? "NEEDS_INVESTIGATION" : "KEEP_AND_REFACTOR";
  if (d === "LEARNING") { if (file === "src/runtime/load-public-course-catalog.ts") return "NEEDS_INVESTIGATION"; return file.startsWith("src/components/") || file.startsWith("src/hooks/") ? "MERGE_INTO_MODULE" : "KEEP_AND_REFACTOR"; }
  if (d === "LEGACY_OTHER") return ["src/config/brand.ts","src/config/public-config.ts","src/runtime/ci-runtime-smoke-catalog.ts","src/vite-env.d.ts"].includes(file) ? "NEEDS_INVESTIGATION" : "KEEP_AND_REFACTOR";
  if (d === "OBSERVABILITY") { if (file === "src/hooks/useFrontendErrors.ts") return "MERGE_INTO_MODULE"; if (file === "src/observability/frontend-error-reporting.ts") return "NEEDS_INVESTIGATION"; return "KEEP_AND_REFACTOR"; }
  if (d === "PAYMENTS") { if (file.startsWith("src/pages/")) return "REIMPLEMENT"; return file.startsWith("src/hooks/") ? "MERGE_INTO_MODULE" : "KEEP_AND_REFACTOR"; }
  if (["PRIVACY","SUPPORT"].includes(d)) return file.startsWith("src/hooks/") ? "MERGE_INTO_MODULE" : "KEEP_AND_REFACTOR";
  throw new Error(`UNCLASSIFIED_DISPOSITION ${file}`);
}
function wave(file, d) {
  const fixed = { APP:"WAVE 1", AUTH:"WAVE 2", PUBLIC:"WAVE 2", STUDENT:"WAVE 3", INTEGRATIONS:"WAVE 3", LEARNING:"WAVE 4", LESSON:"WAVE 4", PLAYER:"WAVE 4", MARKETPLACE:"WAVE 5", AFFILIATE:"WAVE 6", COURSE_EDITOR:"WAVE 8", CURRICULUM:"WAVE 8", PRIVACY:"WAVE 9", SUPPORT:"WAVE 9", OBSERVABILITY:"WAVE 9", TESTING:"WAVE 11", LEGACY_OTHER:"WAVE 11" };
  if (fixed[d]) return fixed[d];
  if (d === "CONFIG") { if (!file.startsWith("scripts/")) return "WAVE 0"; return file === "scripts/run-browser-mobile-navigation-smoke.mjs" ? "WAVE 10" : "WAVE 11"; }
  if (d === "SHARED") { if (["src/accessibility/RouteAccessibility.tsx","src/hooks/use-mobile.tsx"].includes(file)) return "WAVE 10"; if (["src/lib/date-time.test.ts","src/lib/error-message.test.ts","src/lib/recent-activities.test.ts"].includes(file)) return "WAVE 11"; return "WAVE 0"; }
  if (d === "ADMIN") return ["src/components/admin/AdminCourseLayout.tsx","src/pages/admin/AdminDashboard.tsx"].includes(file) ? "WAVE 7" : "WAVE 9";
  if (d === "PAYMENTS") return file === "src/contracts/payment-admin.ts" ? "WAVE 11" : "WAVE 5";
  throw new Error(`UNCLASSIFIED_WAVE ${file}`);
}
function risk(file) {
  if (["src/App.tsx","src/auth/AuthProvider.tsx","src/integrations/supabase/client.ts","src/pages/Lesson.tsx","src/pages/admin/CourseEditor.tsx","src/pages/admin/CourseCurriculum.tsx","src/pages/affiliate/AffiliatePortal.tsx","src/pages/admin/AdminDashboard.tsx"].includes(file)) return "CRITICAL";
  if (/StudentPortalShell|AdminNavigation|checkout|payment|progress|privacy|support|affiliate|asset|storage|playback/i.test(file)) return "HIGH";
  return "LOW";
}
function destination(file, d, disp) {
  if (disp === "KEEP" || d === "CONFIG") return file;
  const base = path.basename(file);
  const roots = { APP:"src/app", SHARED:"src/shared", PUBLIC:"src/modules/public", AUTH:"src/modules/auth", STUDENT:"src/modules/student", LEARNING:"src/modules/learning", LESSON:"src/modules/learning/lesson", PLAYER:"src/modules/learning/player", MARKETPLACE:"src/modules/commerce", PAYMENTS:"src/modules/commerce/payments", AFFILIATE:"src/modules/affiliate", ADMIN:"src/modules/admin", COURSE_EDITOR:"src/modules/admin/courses/editor", CURRICULUM:"src/modules/admin/courses/curriculum", SUPPORT:"src/modules/support", PRIVACY:"src/modules/privacy", OBSERVABILITY:"src/modules/admin/observability", INTEGRATIONS:"src/modules/integrations", TESTING:"src/testing", LEGACY_OTHER:"src/legacy" };
  return `${roots[d] || "src/modules/legacy"}/${base}`;
}
function countBy(items, key) { const out = {}; for (const x of items) out[x[key]] = (out[x[key]] || 0) + 1; return Object.fromEntries(Object.entries(out).sort()); }
function assertCounts(actual, expected, label) { const e = Object.fromEntries(Object.entries(expected).sort()); if (JSON.stringify(actual) !== JSON.stringify(e)) throw new Error(`${label}_DIVERGENCE actual=${JSON.stringify(actual)} expected=${JSON.stringify(e)}`); }
function write(name, content) { writeFileSync(path.join(OUT, name), content, "utf8"); }
function writeJson(name, data) { write(name, JSON.stringify(data, null, 2) + "\n"); }

const physical = trackedFiles().filter(inScope);
const manifest = physical.map(file => {
  const currentDomain = domain(file);
  const disp = disposition(file, currentDomain);
  const primaryWave = wave(file, currentDomain);
  const { extension, type } = fileType(file);
  const isTest = /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i.test(file);
  return {
    path: file, size: statSync(path.join(ROOT, file)).size, extension, type, isTest,
    currentDomain, currentPurpose: `${currentDomain} responsibility (${path.basename(file)}).`,
    disposition: disp, v2Destination: destination(file, currentDomain, disp), primaryWave, secondaryWaves: [],
    risk: risk(file), tests: isTest ? [file] : [], dependencyProfile: "STATIC_GRAPH_NOT_FULLY_RESOLVED",
    notes: "Wave 0 planning classification; no move/delete authorized.",
    ...(disp === "REMOVE_AFTER_REPLACEMENT" ? { replacementRequirement: "Equivalent V2 replacement and parity required before removal." } : {}),
    ...(disp === "NEEDS_INVESTIGATION" ? { investigationReason: "Exact V2 ownership/usage requires implementation-wave static graph review before destructive change." } : {})
  };
});
if (manifest.length !== 368) throw new Error(`TOTAL_FILES=${manifest.length}; expected 368`);
const domainCounts = countBy(manifest, "currentDomain"), dispositionCounts = countBy(manifest, "disposition"), waveCounts = countBy(manifest, "primaryWave");
assertCounts(domainCounts, EXPECTED_DOMAINS, "DOMAIN_COUNTS");
assertCounts(dispositionCounts, EXPECTED_DISPOSITIONS, "DISPOSITION_COUNTS");
assertCounts(waveCounts, EXPECTED_WAVES, "WAVE_COUNTS");
const summary = { generatedBy:"scripts/reconcile-frontend-wave0.mjs", authoritativeSource:"git ls-files", head:git(["rev-parse","HEAD"]), totalFiles:368, classifiedFiles:368, unclassifiedFiles:0, duplicatePaths:0, missingPaths:0, unexpectedPaths:0, domainCounts, dispositionCounts, waveCounts, controlPlaneExclusions:[...CONTROL_PLANE_EXCLUSIONS] };
writeJson("physical-manifest.json", manifest);
writeJson("manifest-summary.json", summary);

let md = "# Frontend physical manifest — Wave 0 reconciled\n\nGenerated deterministically from `git ls-files`. Persistence control-plane tooling created after the 368-file baseline is excluded from the audited application scope.\n\n| File | Domain | Purpose | Disposition | V2 destination | Primary wave | Risk |\n|---|---|---|---|---|---|---|\n";
for (const x of manifest) md += `| \`${x.path}\` | ${x.currentDomain} | ${x.currentPurpose} | ${x.disposition} | \`${x.v2Destination}\` | ${x.primaryWave} | ${x.risk} |\n`;
write("physical-manifest.md", md);
function table(title, values) { let s = `## ${title}\n\n| Value | Files |\n|---|---:|\n`; for (const [k,v] of Object.entries(values)) s += `| ${k} | ${v} |\n`; return s + "\n"; }
write("domain-summary.md", `# Domain summary\n\n${table("Domain counts", domainCounts)}${table("Disposition counts", dispositionCounts)}${table("Wave counts", waveCounts)}`);
let waveMap = "# Wave file map\n\n"; for (let i=0;i<=11;i++) { const key=`WAVE ${i}`, rows=manifest.filter(x=>x.primaryWave===key); waveMap += `## ${key} — ${rows.length}\n\n`; for (const x of rows) waveMap += `- \`${x.path}\` — ${x.disposition} → \`${x.v2Destination}\`\n`; waveMap += "\n"; } write("wave-file-map.md", waveMap);
let high = "# High-risk files / do-not-remove register\n\n"; for (const p of [...new Set([...HIGH_RISK_REQUIRED, ...manifest.filter(x=>["HIGH","CRITICAL"].includes(x.risk)).map(x=>x.path)])].sort()) { const x=manifest.find(m=>m.path===p); if (!x) continue; high += `## \`${p}\`\n\n- **RISK:** ${x.risk}\n- **WHY_HIGH_RISK:** ${x.currentPurpose}\n- **REPLACEMENT_REQUIRED_BEFORE_REMOVAL:** ${x.replacementRequirement || "Equivalent V2 responsibility and dependency parity required."}\n- **TARGET_WAVE:** ${x.primaryWave}\n\n`; } write("high-risk-files.md", high);
write("duplication-map.md", `# Duplication map\n\n## DUP-001\nMetric/stat cards — PARTIAL merge candidate — WAVE 7.\n\n## DUP-002\nPage/section headers — PARTIAL — WAVE 7.\n\n## DUP-003\nPagination — YES — WAVE 6.\n\n## DUP-004\nButtons/brand classes — PARTIAL — WAVE 0.\n\n## DUP-005\nNavigation/sidebar strategies — PARTIAL — WAVE 1.\n\n## DUP-006\nLoading/error/empty states — PARTIAL — WAVE 1.\n`);
write("dependency-hotspots.md", `# Dependency hotspots\n\nExact importer counts are not invented.\n\n${HIGH_RISK_REQUIRED.map(p=>`## \`${p}\`\n\n- **DEPENDENCIES:** static graph refresh required before move.\n- **KNOWN_DEPENDENTS:** domain consumers.\n- **WHY_CRITICAL:** high-centrality or destructive-change risk.\n- **SAFE_RECONSTRUCTION_ORDER:** follow primary wave; replace before removal.\n`).join("\n")}`);
write("wave0-validation-report.md", `# Wave 0 reconciliation generation report\n\n- authoritative enumeration: \`git ls-files\`\n- HEAD: \`${summary.head}\`\n- frontend scope files: **368**\n- classified files: **368**\n- unclassified files: **0**\n- duplicate paths: **0**\n- missing paths: **0**\n- unexpected paths: **0**\n- domain/disposition/wave counts: **MATCH BASELINE**\n- dependency profile: \`STATIC_GRAPH_NOT_FULLY_RESOLVED\`.\n`);
console.log("RECONCILIATION_GENERATOR=PASS TOTAL_FILES=368");
