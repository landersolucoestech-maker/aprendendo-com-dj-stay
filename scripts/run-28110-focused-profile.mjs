import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const sourcePath = "visual-preview/click-smoke.mjs";
const tempPath = "/tmp/click-smoke-profile-28110.mjs";
let source = await readFile(sourcePath, "utf8");

const insertMarker = "const chromePath = findChrome();";
const insertAt = source.indexOf(insertMarker);
if (insertAt < 0) throw new Error(`Marker ausente: ${insertMarker}`);

const focusedFunction = String.raw`
const runFocusedStudentMobileProfile28110 = async (cdp) => {
  currentStep.viewport = "mobile";
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await prepareScenario(cdp, "student/history", "STUDENT_PROFILE_FOCUSED");
  const opened = await openResponsiveMenu(cdp);
  if (!opened || !(await waitFor(cdp, \`Boolean(document.querySelector('[data-shell-drawer-content]'))\`, 3000))) {
    throw new Error("DRAWER_OPEN=false no focused Student Profile.");
  }
  const selector = selectorForDestination("student/profile");
  const beforeHistory = await cdp.send("Page.getNavigationHistory");
  const geometry = await studentDrawerGeometry(cdp, selector);
  if (!geometry?.target) throw new Error("TARGET_FOUND=false para student/profile.");
  if (!geometry.scrollOwner) throw new Error("SCROLL_OWNER_FOUND=false para student/profile.");
  currentStep = { scenario: "STUDENT_PROFILE_FOCUSED", viewport: "mobile", from: "student/history", action: "Perfil", selector, expectedSlug: "student/profile" };
  const urlBefore = await evaluate(cdp, "location.href");
  const target = await trustedClick(cdp, selector);
  if (!target) throw new Error("TARGET_FOUND=false para student/profile após estabilização.");
  if (target.localBlocker?.tag === "HTML" || target.localBlocker?.tag === "BODY") throw new Error(\`STRUCTURAL_ROOT_AS_BLOCKER=true: \${JSON.stringify(target)}\`);
  if (!(target.clickableRect?.width > 0 && target.clickableRect?.height > 0)) throw new Error(\`CLICKABLE_RECT_INVALID: \${JSON.stringify(target)}\`);
  if (target.elementFromPoint?.same !== true) throw new Error(\`ELEMENT_FROM_POINT_MATCH=false: \${JSON.stringify(target)}\`);
  if (target.probe?.trusted !== true || target.probe?.received !== true) throw new Error(\`TRUSTED_CLICK=false: \${JSON.stringify(target)}\`);
  await waitSurface(cdp, "student/profile");
  const afterHistory = await cdp.send("Page.getNavigationHistory");
  const entryCreated = afterHistory.entries.some((entry) => entry.url.includes(expectedPath("student/profile"))) && afterHistory.entries.length > beforeHistory.entries.length;
  if (!entryCreated) throw new Error("HISTORY_ENTRY_CREATED=false para student/profile.");
  console.log(JSON.stringify({
    SCENARIO: "STUDENT_PROFILE_FOCUSED",
    VIEWPORT: "mobile",
    FROM: "student/history",
    DRAWER: true,
    SCROLL_OWNER: target.scrollOwner,
    CLIENT_HEIGHT: target.scrollOwner?.clientHeight,
    SCROLL_HEIGHT: target.scrollOwner?.scrollHeight,
    MAX_SCROLL_TOP: geometry.maxScrollTop,
    SCROLL_TOP_BEFORE: target.scrollTopBefore,
    SCROLL_TOP_REQUESTED: target.scrollTopRequested,
    SCROLL_TOP_AFTER: target.scrollTopAfter,
    TARGET_RECT_BEFORE: target.rectBefore,
    TARGET_RECT_AFTER: target.rect,
    BLOCKER_CANDIDATES: target.localBlockerCandidates,
    LOCAL_BLOCKER: target.localBlocker,
    VISIBLE_REGION: target.availableVisibleRegion,
    CLICKABLE_RECT: target.clickableRect,
    CLICK_POINT: { x: target.x, y: target.y },
    ELEMENT_FROM_POINT: target.elementFromPoint,
    ELEMENT_FROM_POINT_MATCH: true,
    TRUSTED_CLICK: true,
    URL_BEFORE: urlBefore,
    URL_AFTER: await evaluate(cdp, "location.href"),
    EXPECTED_SURFACE: "student/profile",
    OBSERVED_SURFACE: await evaluate(cdp, currentSlugExpression),
    HISTORY_ENTRY_CREATED: true,
    RESULT: "PASS",
  }));
  await browserBackForward(cdp, "student/history", "student/profile", "STUDENT_PROFILE_FOCUSED_HISTORY");
  console.log("FOCUSED_STUDENT_MOBILE_PROFILE_TEST=PASS");
};
`;

source = source.slice(0, insertAt) + focusedFunction + source.slice(insertAt);

const mainStartMarker = "try {\n  await waitJson(`http://127.0.0.1:${port}/json/version`);";
const mainStart = source.indexOf(mainStartMarker);
const mainEndMarker = "} finally {\n  chrome.kill(\"SIGTERM\");\n}";
const mainEndStart = source.lastIndexOf(mainEndMarker);
if (mainStart < 0 || mainEndStart < mainStart) throw new Error("Bloco main do click-smoke não localizado de forma determinística.");
const mainEnd = mainEndStart + mainEndMarker.length;

const replacementMain = `try {
  await waitJson(\`http://127.0.0.1:\${port}/json/version\`);
  const target = await fetch(\`http://127.0.0.1:\${port}/json/new?about:blank\`, { method: "PUT" }).then((response) => response.json());
  client = new Cdp(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  try {
    await runFocusedStudentMobileProfile28110(client);
  } catch (error) {
    await logStep(client, "FAIL", { ERROR: String(error?.message || error) }).catch(() => undefined);
    await saveDiagnostics(client, error);
    throw error;
  } finally {
    client.close();
    await fetch(\`http://127.0.0.1:\${port}/json/close/\${target.id}\`).catch(() => undefined);
  }
} finally {
  chrome.kill("SIGTERM");
}`;

source = source.slice(0, mainStart) + replacementMain + source.slice(mainEnd);
await writeFile(tempPath, source);

const check = spawnSync(process.execPath, ["--check", tempPath], { stdio: "inherit" });
if (check.status !== 0) process.exit(check.status ?? 1);

const run = spawnSync(process.execPath, [tempPath], {
  stdio: "inherit",
  env: process.env,
});
process.exit(run.status ?? 1);
