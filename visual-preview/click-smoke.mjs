import { mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:4173/aprendendo-com-dj-stay/";
const diagnosticsDir = process.env.CLICK_SMOKE_DIAGNOSTICS_DIR ?? "click-smoke-artifacts";
let currentStep = { scenario: "bootstrap", viewport: "unknown", from: "", action: "", selector: "", expectedSlug: "" };
let client;
const consoleErrors = [];
const clickProbes = [];

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [candidate], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium não encontrado.");
};

const waitJson = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch {}
    await sleep(150);
  }
  throw new Error(`Timeout: ${url}`);
};

class Cdp {
  constructor(url) { this.url = url; this.id = 1; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === "Runtime.consoleAPICalled") {
        const values = message.params.args?.map((arg) => arg.value ?? arg.description ?? "") ?? [];
        if (message.params?.type === "error") consoleErrors.push(values.join(" ") || "console.error");
        for (const value of values) {
          if (typeof value !== "string" || !value.startsWith("__CLICK_PROBE__")) continue;
          try { clickProbes.push(JSON.parse(value.slice("__CLICK_PROBE__".length))); } catch {}
        }
      }
      if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params?.exceptionDetails?.text ?? "Runtime.exceptionThrown");
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result ?? {});
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

const evaluate = async (cdp, expression) => {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`Eval failed: ${expression}`);
  return result.result?.value;
};
const waitFor = async (cdp, expression, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await evaluate(cdp, expression)) return true; } catch {}
    await sleep(100);
  }
  return false;
};
const expectedPath = (slug) => `/visual-preview/${slug}/`;
const currentSlugExpression = `document.body.dataset.previewSurface || ''`;
const surfaceMarker = async (cdp) => evaluate(cdp, `({slug:document.body.dataset.previewSurface||'',title:document.title,h1:document.querySelector('h1')?.textContent?.trim()||'',body:(document.body.innerText||'').slice(0,1600)})`);

const waitSurface = async (cdp, slug) => {
  const ready = await waitFor(cdp, `document.documentElement.dataset.visualPreviewReady === 'true' && ${currentSlugExpression} === ${JSON.stringify(slug)}`, 18000);
  if (!ready) throw new Error(`Destino não ficou pronto: ${slug}`);
  const pathname = await evaluate(cdp, "location.pathname");
  if (!pathname.endsWith(expectedPath(slug))) throw new Error(`URL inesperada para ${slug}: ${pathname}`);
};

const prepareScenario = async (cdp, slug, scenario) => {
  currentStep = { scenario: `${scenario}_SETUP`, viewport: currentStep.viewport, from: "isolated", action: `Preparar ${slug}`, selector: "CDP Page.navigate", expectedSlug: slug };
  await cdp.send("Page.navigate", { url: `${base}visual-preview/${slug}/` });
  await waitSurface(cdp, slug);
  console.log(JSON.stringify({ SCENARIO: scenario, VIEWPORT: currentStep.viewport, FROM: "isolated", ACTION: "deterministic scenario setup", SELECTOR_OR_ACCESSIBLE_NAME: "CDP Page.navigate", URL_AFTER: await evaluate(cdp, "location.href"), EXPECTED_URL: expectedPath(slug), EXPECTED_SURFACE: slug, OBSERVED_SURFACE: slug, RESULT: "SETUP_PASS" }));
};

const targetSnapshot = async (cdp, selector) => evaluate(cdp, `(() => {
  const candidates=Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
  const el=candidates.find((node)=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none';});
  if(!el)return {candidateCount:candidates.length,target:null};
  const r=el.getBoundingClientRect(); const x=r.left+r.width/2; const y=r.top+r.height/2;
  const scrollables=[]; let parent=el.parentElement;
  while(parent){const s=getComputedStyle(parent);if(/(auto|scroll)/.test(s.overflowY)&&parent.scrollHeight>parent.clientHeight){const pr=parent.getBoundingClientRect();scrollables.push({tag:parent.tagName,scrollTop:parent.scrollTop,scrollHeight:parent.scrollHeight,clientHeight:parent.clientHeight,rect:{left:pr.left,top:pr.top,right:pr.right,bottom:pr.bottom,width:pr.width,height:pr.height}});}parent=parent.parentElement;}
  const point=(x>=0&&x<innerWidth&&y>=0&&y<innerHeight)?document.elementFromPoint(x,y):null;
  const hit=point?{tag:point.tagName,text:(point.textContent||'').trim().replace(/\\s+/g,' ').slice(0,120),href:point.closest('a')?.getAttribute('href')||null,same:point===el||el.contains(point)}:null;
  const clippedByScrollable=scrollables.some((item)=>r.bottom<=item.rect.top||r.top>=item.rect.bottom||r.right<=item.rect.left||r.left>=item.rect.right);
  return {candidateCount:candidates.length,target:{tag:el.tagName,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,160),href:el.getAttribute('href'),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},center:{x,y},viewport:{width:innerWidth,height:innerHeight},inViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,clippedByScrollable,scrollables,elementFromPoint:hit}};
})()`);

const stabilizeTarget = async (cdp, selector) => evaluate(cdp, `new Promise((resolve) => {
  document.querySelectorAll('[data-click-smoke-target]').forEach((node)=>node.removeAttribute('data-click-smoke-target'));
  const candidates=Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
  const el=candidates.find((node)=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none';});
  if(!el){resolve(null);return;}
  el.setAttribute('data-click-smoke-target','true');
  const scrollable=(()=>{let parent=el.parentElement;while(parent){const s=getComputedStyle(parent);if(/(auto|scroll)/.test(s.overflowY)&&parent.scrollHeight>parent.clientHeight)return parent;parent=parent.parentElement;}return null;})();
  el.scrollIntoView({block:'nearest',inline:'nearest'});
  if(scrollable){const er=el.getBoundingClientRect();const pr=scrollable.getBoundingClientRect();scrollable.scrollTop += (er.top+er.height/2)-(pr.top+scrollable.clientHeight/2);}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const r=el.getBoundingClientRect();const x=r.left+r.width/2;const y=r.top+r.height/2;const point=document.elementFromPoint(x,y);
    resolve({x,y,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,160),aria:el.getAttribute('aria-label'),tag:el.tagName,href:el.getAttribute('href'),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},elementFromPoint:point?{tag:point.tagName,text:(point.textContent||'').trim().replace(/\\s+/g,' ').slice(0,120),href:point.closest('a')?.getAttribute('href')||null,same:point===el||el.contains(point)}:null,scrollTop:scrollable?.scrollTop??null});
  }));
})`);

const trustedClick = async (cdp, selector) => {
  const target = await stabilizeTarget(cdp, selector);
  if (!target) return null;
  if (!target.elementFromPoint?.same) throw new Error(`Centro do alvo interceptado para ${selector}: ${JSON.stringify(target)}`);
  clickProbes.length = 0;
  await evaluate(cdp, `(() => { const target=document.querySelector('[data-click-smoke-target="true"]'); if(!target)return false; const probe=(event)=>{const action=event.target instanceof Element?event.target.closest('a,button,[role="button"]'):null; console.log('__CLICK_PROBE__'+JSON.stringify({received:true,defaultPrevented:event.defaultPrevented,targetTag:event.target?.tagName||null,actionTag:action?.tagName||null,href:action?.getAttribute?.('href')||null,trusted:event.isTrusted}));}; document.addEventListener('click',probe,{capture:true,once:true}); return true;})()`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: target.x, y: target.y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: target.x, y: target.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(30);
  return { ...target, probe: clickProbes.at(-1) ?? null };
};
const pressEscape = async (cdp) => {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
};

const selectorForDestination = (slug, navigator = false) => navigator
  ? `[data-preview-navigator] a[href$="/visual-preview/${slug}/"]`
  : `[data-preview-destination="${slug}"]:not([data-preview-navigator] *)`;

const openResponsiveMenu = async (cdp) => {
  if (await trustedClick(cdp, "[data-shell-menu-button]")) {
    await waitFor(cdp, `Boolean(document.querySelector('[data-shell-drawer-content]'))`, 3000);
    return true;
  }
  const publicMenu = `button[aria-label*="menu" i],button[aria-label*="navegação" i],button[aria-label*="navegacao" i]`;
  if (await trustedClick(cdp, publicMenu)) { await sleep(150); return true; }
  return false;
};

const logStep = async (cdp, result, extra = {}) => {
  const url = await evaluate(cdp, "location.href").catch(() => "unavailable");
  const marker = await surfaceMarker(cdp).catch(() => ({}));
  console.log(JSON.stringify({ SCENARIO: currentStep.scenario, VIEWPORT: currentStep.viewport, FROM: currentStep.from, ACTION: currentStep.action, SELECTOR_OR_ACCESSIBLE_NAME: currentStep.selector, URL_AFTER: url, EXPECTED_URL: currentStep.expectedSlug ? expectedPath(currentStep.expectedSlug) : "", EXPECTED_SURFACE: currentStep.expectedSlug, OBSERVED_SURFACE: marker.slug, OBSERVED_TITLE: marker.title, OBSERVED_H1: marker.h1, RESULT: result, ...extra }));
};

const clickDestination = async (cdp, slug, { navigator = false, scenario = "navigation", action = slug } = {}) => {
  const selector = selectorForDestination(slug, navigator);
  const before = await evaluate(cdp, "location.href");
  currentStep = { scenario, viewport: currentStep.viewport, from: await evaluate(cdp, currentSlugExpression), action, selector, expectedSlug: slug };
  console.log(JSON.stringify({ SCENARIO: scenario, VIEWPORT: currentStep.viewport, FROM: currentStep.from, ACTION: action, SELECTOR_OR_ACCESSIBLE_NAME: selector, URL_BEFORE: before, EXPECTED_URL: expectedPath(slug), EXPECTED_SURFACE: slug, RESULT: "START" }));
  if (navigator) {
    const toggle = await trustedClick(cdp, "[data-preview-navigator] > button");
    if (!toggle) throw new Error("Botão do PreviewNavigator não está visível.");
    await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`, 3000);
  }
  let target = await trustedClick(cdp, selector);
  if (!target && !navigator && currentStep.viewport === "mobile") {
    await openResponsiveMenu(cdp);
    target = await trustedClick(cdp, selector);
  }
  if (!target) {
    const available = await evaluate(cdp, `Array.from(document.querySelectorAll('a,button,[role="button"]')).map((el)=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return{tag:el.tagName,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,120),aria:el.getAttribute('aria-label'),href:el.getAttribute('href'),dest:el.dataset.previewDestination||null,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};}).filter(x=>x.visible).slice(0,200)`);
    throw new Error(`Ação real não encontrada para ${slug}. Visíveis: ${JSON.stringify(available)}`);
  }
  currentStep.selector = target.aria || target.text || selector;
  await waitSurface(cdp, slug);
  await logStep(cdp, "PASS", { TRUSTED_CLICK: target.probe?.trusted === true, CLICK_RECEIVED: target.probe?.received === true, DEFAULT_PREVENTED: target.probe?.defaultPrevented ?? null, TARGET_RECT: target.rect, ELEMENT_FROM_POINT: target.elementFromPoint });
};

const browserBackForward = async (cdp, backSlug, forwardSlug, scenario) => {
  currentStep = { scenario, viewport: currentStep.viewport, from: await evaluate(cdp, currentSlugExpression), action: "browser back/forward", selector: "CDP Page.navigateToHistoryEntry", expectedSlug: backSlug };
  const before = await cdp.send("Page.getNavigationHistory");
  const backEntry = before.entries[before.currentIndex - 1];
  if (!backEntry) throw new Error("Histórico não possui entrada anterior.");
  await cdp.send("Page.navigateToHistoryEntry", { entryId: backEntry.id });
  await waitSurface(cdp, backSlug);
  const afterBack = await cdp.send("Page.getNavigationHistory");
  const forwardEntry = afterBack.entries[afterBack.currentIndex + 1];
  if (!forwardEntry) throw new Error("Histórico não possui entrada seguinte.");
  await cdp.send("Page.navigateToHistoryEntry", { entryId: forwardEntry.id });
  await waitSurface(cdp, forwardSlug);
  currentStep.expectedSlug = forwardSlug;
  await logStep(cdp, "PASS", { HISTORY_BACK: backSlug, HISTORY_FORWARD: forwardSlug });
};

const goHistoryTo = async (cdp, slug) => {
  const history = await cdp.send("Page.getNavigationHistory");
  const suffix = expectedPath(slug);
  let entry = null;
  for (let index = history.currentIndex; index >= 0; index -= 1) if (history.entries[index]?.url.includes(suffix)) { entry = history.entries[index]; break; }
  if (!entry) for (const candidate of history.entries) if (candidate.url.includes(suffix)) entry = candidate;
  if (!entry) throw new Error(`Histórico não contém ${slug}.`);
  await cdp.send("Page.navigateToHistoryEntry", { entryId: entry.id });
  await waitSurface(cdp, slug);
};

const validateShellInteractions = async (cdp, context) => {
  if (currentStep.viewport === "desktop") {
    const before = await evaluate(cdp, `document.querySelector('[data-shell-sidebar]')?.dataset.collapsed`);
    const clicked = await trustedClick(cdp, "[data-shell-collapse]");
    if (!clicked) return;
    const changed = await waitFor(cdp, `document.querySelector('[data-shell-sidebar]')?.dataset.collapsed !== ${JSON.stringify(before)}`, 2000);
    if (!changed) throw new Error(`${context}: sidebar collapse não alterou estado.`);
    await trustedClick(cdp, "[data-shell-collapse]");
    console.log(`SIDEBAR_COLLAPSE ${context} PASS`);
    return;
  }
  const menu = await trustedClick(cdp, "[data-shell-menu-button]");
  if (!menu) return;
  const opened = await waitFor(cdp, `Boolean(document.querySelector('[data-shell-drawer-content]'))`, 2000);
  if (!opened) throw new Error(`${context}: drawer mobile não abriu.`);
  await pressEscape(cdp);
  const closed = await waitFor(cdp, `!document.querySelector('[data-shell-drawer-content]')`, 2000);
  if (!closed) throw new Error(`${context}: Escape não fechou drawer.`);
  await sleep(100);
  const focusReturned = await evaluate(cdp, `document.activeElement === document.querySelector('[data-shell-menu-button]')`);
  if (!focusReturned) throw new Error(`${context}: foco não retornou ao botão do menu.`);
  console.log(`MOBILE_DRAWER_ESCAPE_FOCUS ${context} PASS`);
};

const runPublic = async (cdp) => {
  await prepareScenario(cdp, "public/home", "PUBLIC");
  await clickDestination(cdp, "public/login", { scenario: "PUBLIC", action: "Landing → Login" });
  await browserBackForward(cdp, "public/home", "public/login", "PUBLIC_HISTORY");
  await clickDestination(cdp, "public/register", { scenario: "PUBLIC", action: "Login → Cadastro" });
  await goHistoryTo(cdp, "public/login");
  await clickDestination(cdp, "public/forgot-password", { scenario: "PUBLIC", action: "Login → Recuperar senha" });
  await goHistoryTo(cdp, "public/home");
  await clickDestination(cdp, "public/contact", { scenario: "PUBLIC", action: "Landing → Contato" });
  await goHistoryTo(cdp, "public/home");
  await clickDestination(cdp, "public/certificate", { scenario: "PUBLIC", action: "Landing → Certificado" });
  await goHistoryTo(cdp, "public/home");
  await clickDestination(cdp, "commerce/courses", { scenario: "PUBLIC", action: "Landing → Cursos" });
  console.log("PUBLIC_CLICK_NAV=PASS");
};

const runStudent = async (cdp) => {
  await prepareScenario(cdp, "public/login", "STUDENT");
  await clickDestination(cdp, "student/dashboard", { scenario: "STUDENT", action: "Login → Dashboard" });
  await validateShellInteractions(cdp, "STUDENT");
  await clickDestination(cdp, "student/courses", { scenario: "STUDENT", action: "Dashboard → Meus cursos" });
  await browserBackForward(cdp, "student/dashboard", "student/courses", "STUDENT_HISTORY");
  await clickDestination(cdp, "student/course", { scenario: "COURSE_MODULE_LESSON", action: "Meus cursos → Detalhe do curso" });
  await clickDestination(cdp, "student/modules", { scenario: "COURSE_MODULE_LESSON", action: "Curso → Módulo" });
  await clickDestination(cdp, "student/lesson-video", { scenario: "COURSE_MODULE_LESSON", action: "Módulo → Aula/player" });
  await goHistoryTo(cdp, "student/modules");
  for (const [slug, label] of [
    ["student/library", "Biblioteca"], ["student/favorites", "Favoritos"], ["student/certificates", "Certificados"],
    ["student/products", "Produtos"], ["student/orders", "Pedidos"], ["student/payments", "Pagamentos"],
    ["student/notifications", "Notificações"], ["student/support", "Suporte"], ["student/history", "Histórico"], ["student/profile", "Perfil"],
  ]) await clickDestination(cdp, slug, { scenario: "STUDENT", action: label });
  await clickDestination(cdp, "student/profile-edit", { scenario: "STUDENT", action: "Perfil → Editar perfil" });
  await clickDestination(cdp, "student/preferences", { scenario: "STUDENT", action: "Preferências" });
  await clickDestination(cdp, "student/privacy", { scenario: "STUDENT", action: "Privacidade" });
  console.log("STUDENT_CLICK_NAV=PASS");
  console.log("COURSE_MODULE_LESSON_CLICK_NAV=PASS");
};

const runAdmin = async (cdp) => {
  await prepareScenario(cdp, "admin/dashboard", "ADMIN");
  await validateShellInteractions(cdp, "ADMIN");
  await clickDestination(cdp, "admin/courses", { scenario: "ADMIN", action: "Dashboard → Cursos" });
  await browserBackForward(cdp, "admin/dashboard", "admin/courses", "ADMIN_HISTORY");
  await clickDestination(cdp, "admin/course-new", { scenario: "ADMIN", action: "Cursos → Novo curso" });
  await clickDestination(cdp, "admin/courses", { scenario: "ADMIN", action: "Novo curso → Voltar" });
  await clickDestination(cdp, "admin/course-edit", { scenario: "ADMIN", action: "Cursos → Editar curso" });
  await clickDestination(cdp, "admin/course-preview", { scenario: "ADMIN", action: "Editar → Preview" });
  await clickDestination(cdp, "admin/course-edit", { scenario: "ADMIN", action: "Preview → Voltar ao editor" });
  await clickDestination(cdp, "admin/curriculum", { scenario: "ADMIN", action: "Editar → Currículo" });
  await clickDestination(cdp, "admin/module-editor", { scenario: "ADMIN", action: "Currículo → editor de módulo" });
  await clickDestination(cdp, "admin/lesson-editor", { scenario: "ADMIN", action: "Módulo → editor de aula" });
  await clickDestination(cdp, "admin/assets", { scenario: "ADMIN", action: "Aula → assets/mídia" });
  for (const [slug, label] of [["admin/products","Produtos"],["admin/payments","Pagamentos"],["admin/affiliates","Afiliados"],["admin/students","Alunos"],["admin/academic","Acadêmico"],["admin/contacts","Contatos"],["admin/support","Suporte"],["admin/privacy","Privacidade"]]) await clickDestination(cdp, slug, { scenario: "ADMIN", action: label });
  console.log("ADMIN_CLICK_NAV=PASS");
};

const runAffiliate = async (cdp) => {
  await prepareScenario(cdp, "affiliate/active", "AFFILIATE");
  await validateShellInteractions(cdp, "AFFILIATE");
  await clickDestination(cdp, "affiliate/offers", { scenario: "AFFILIATE", action: "Ativo → Ofertas" });
  await browserBackForward(cdp, "affiliate/active", "affiliate/offers", "AFFILIATE_HISTORY");
  for (const [slug,label] of [["affiliate/links","Links"],["affiliate/performance","Performance"],["affiliate/commissions","Comissões"],["affiliate/payouts","Payouts"],["affiliate/events","Histórico"]]) await clickDestination(cdp, slug, { scenario: "AFFILIATE", action: label });
  console.log("AFFILIATE_CLICK_NAV=PASS");
};

const classifyNavigatorTarget = (snapshot) => {
  if (!snapshot?.target) return "ELEMENT_DISCOVERY_BUG";
  if (!snapshot.target.inViewport || snapshot.target.clippedByScrollable) return "SCROLL_VISIBILITY_BUG";
  if (!snapshot.target.elementFromPoint?.same) return "OVERLAY_INTERCEPTION_BUG";
  return "OTHER";
};

const runFocusedCommercial = async (cdp) => {
  currentStep.viewport = "desktop";
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await prepareScenario(cdp, "commerce/checkout-processing", "COMMERCIAL_FOCUSED");
  const selector = selectorForDestination("commerce/checkout-error", true);
  const toggle = await trustedClick(cdp, "[data-preview-navigator] > button");
  if (!toggle) throw new Error("Botão do PreviewNavigator não está visível no teste focado.");
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`, 3000);
  const beforeHistory = await cdp.send("Page.getNavigationHistory");
  const before = await targetSnapshot(cdp, selector);
  const classification = classifyNavigatorTarget(before);
  console.log(JSON.stringify({ SCENARIO:"COMMERCIAL_STATE", VIEWPORT:"desktop", FROM:"commerce/checkout-processing", TARGET:"checkout-error", SELECTOR:selector, TARGET_RECT:before?.target?.rect??null, ELEMENT_FROM_POINT:before?.target?.elementFromPoint??null, HREF:before?.target?.href??null, URL_BEFORE:await evaluate(cdp,"location.href"), EVENT_DISPATCHED:false, CLICK_RECEIVED:false, DEFAULT_PREVENTED:false, HISTORY_BEFORE:{currentIndex:beforeHistory.currentIndex,entries:beforeHistory.entries.length}, HISTORY_AFTER:null, ROOT_CAUSE_CLASSIFICATION:classification, CANDIDATE_COUNT:before?.candidateCount??0, SCROLLABLE_ANCESTORS:before?.target?.scrollables??[] }));
  currentStep = { scenario:"COMMERCIAL_FOCUSED", viewport:"desktop", from:"commerce/checkout-processing", action:"checkout-processing → checkout-error", selector, expectedSlug:"commerce/checkout-error" };
  const target = await trustedClick(cdp, selector);
  if (!target) throw new Error("checkout-error não encontrado no teste focado.");
  await waitSurface(cdp, "commerce/checkout-error");
  const afterHistory = await cdp.send("Page.getNavigationHistory");
  const entryCreated = afterHistory.entries.some((entry)=>entry.url.includes(expectedPath("commerce/checkout-error"))) && afterHistory.entries.length > beforeHistory.entries.length;
  if (!entryCreated) throw new Error("Histórico não recebeu entrada checkout-error.");
  console.log(JSON.stringify({ SCENARIO:"COMMERCIAL_FOCUSED", VIEWPORT:"desktop", FROM:"commerce/checkout-processing", TARGET:"checkout-error", TARGET_RECT:target.rect, ELEMENT_FROM_POINT:target.elementFromPoint, TRUSTED_CLICK:target.probe?.trusted===true, CLICK_RECEIVED:target.probe?.received===true, DEFAULT_PREVENTED:target.probe?.defaultPrevented??null, EXPECTED_SURFACE:"commerce/checkout-error", OBSERVED_SURFACE:await evaluate(cdp,currentSlugExpression), URL_CHANGED:true, HISTORY_ENTRY_CREATED:true, RESULT:"PASS" }));
  await browserBackForward(cdp, "commerce/checkout-processing", "commerce/checkout-error", "COMMERCIAL_FOCUSED_HISTORY");
  console.log("FOCUSED_COMMERCIAL_TEST=PASS");
};

const runCommercial = async (cdp) => {
  await prepareScenario(cdp, "commerce/courses", "COMMERCIAL");
  await clickDestination(cdp, "commerce/marketplace", { scenario: "COMMERCIAL", action: "Cursos → Marketplace" });
  await browserBackForward(cdp, "commerce/courses", "commerce/marketplace", "COMMERCIAL_HISTORY");
  await clickDestination(cdp, "commerce/products", { scenario: "COMMERCIAL", action: "Marketplace → Meus produtos" });
  await goHistoryTo(cdp, "commerce/courses");
  await clickDestination(cdp, "commerce/checkout-processing", { scenario: "COMMERCIAL", action: "Cursos → Checkout processando" });
  await clickDestination(cdp, "commerce/checkout-error", { navigator: true, scenario: "COMMERCIAL_STATE", action: "Abrir estado de erro comprovado" });
  await clickDestination(cdp, "commerce/payment-success", { navigator: true, scenario: "COMMERCIAL_STATE", action: "Abrir estado de sucesso comprovado" });
  console.log("COMMERCIAL_CLICK_NAV=PASS");
};

const saveDiagnostics = async (cdp, error) => {
  await mkdir(diagnosticsDir, { recursive: true });
  const stamp = `${currentStep.viewport}-${currentStep.scenario}`.replace(/[^a-z0-9_-]+/gi, "-");
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).catch(() => null);
  if (screenshot?.data) await writeFile(`${diagnosticsDir}/${stamp}.png`, Buffer.from(screenshot.data, "base64"));
  const dom = await evaluate(cdp, `document.documentElement.outerHTML`).catch(() => "");
  await writeFile(`${diagnosticsDir}/${stamp}.html`, dom);
  const visible = await evaluate(cdp, `Array.from(document.querySelectorAll('a,button,[role="button"]')).map((el)=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return{tag:el.tagName,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,160),aria:el.getAttribute('aria-label'),href:el.getAttribute('href'),dest:el.dataset.previewDestination||null,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};}).filter(x=>x.visible)`).catch(() => []);
  const history = await cdp.send("Page.getNavigationHistory").catch(() => ({}));
  const marker = await surfaceMarker(cdp).catch(() => ({}));
  const payload = { error: String(error?.stack || error), step: currentStep, url: await evaluate(cdp, "location.href").catch(() => ""), marker, visible, history, consoleErrors, clickProbes };
  await writeFile(`${diagnosticsDir}/${stamp}.json`, JSON.stringify(payload, null, 2));
  console.error("CLICK_SMOKE_DIAGNOSTIC", JSON.stringify(payload));
};

const runViewport = async (cdp, viewport) => {
  currentStep.viewport = viewport.name;
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 640 });
  await runPublic(cdp);
  await runStudent(cdp);
  await runAdmin(cdp);
  await runAffiliate(cdp);
  await runCommercial(cdp);
  console.log(`CLICK_SMOKE_${viewport.name.toUpperCase()}=PASS`);
};

const chromePath = findChrome();
const port = 9444;
const chrome = spawn(chromePath, ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--remote-allow-origins=*",`--remote-debugging-port=${port}`,"--user-data-dir=/tmp/visual-preview-click-chrome","about:blank"], { stdio: ["ignore","ignore","ignore"] });
try {
  await waitJson(`http://127.0.0.1:${port}/json/version`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
  client = new Cdp(target.webSocketDebuggerUrl);
  await client.connect(); await client.send("Page.enable"); await client.send("Runtime.enable");
  try {
    await runFocusedCommercial(client);
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) await runViewport(client, viewport);
    console.log("BROWSER_BACK_FORWARD_ALL_AREAS=PASS");
    console.log("PREVIEW_CLICK_SMOKE=PASS");
  } catch (error) {
    await logStep(client, "FAIL", { ERROR: String(error?.message || error) }).catch(() => undefined);
    await saveDiagnostics(client, error);
    throw error;
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => undefined);
  }
} finally { chrome.kill("SIGTERM"); }
