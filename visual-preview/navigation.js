import { SURFACES } from "./surfaces.js";

const surfaceSlugs = new Set(SURFACES.map((surface) => surface.slug));
const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
const previewRoot = () => `${window.location.pathname.split("/visual-preview/")[0]}/visual-preview/`;
export const previewUrl = (slug) => `${previewRoot()}${slug}/`;

const exactRoutes = new Map([
  ["/", "public/home"],
  ["/contato", "public/contact"],
  ["/certificado", "public/certificate"],
  ["/login", "public/login"],
  ["/matricule-se", "public/register"],
  ["/esqueceu-senha", "public/forgot-password"],
  ["/redefinir-senha", "public/reset-password"],
  ["/verificar-email", "public/verify-email"],
  ["/verificado", "public/verified"],
  ["/acesso-negado", "public/access-denied"],
  ["/aluno", "student/dashboard"],
  ["/aluno/cursos", "student/courses"],
  ["/aluno/biblioteca", "student/library"],
  ["/aluno/favoritos", "student/favorites"],
  ["/aluno/certificados", "student/certificates"],
  ["/aluno/produtos", "student/products"],
  ["/aluno/pedidos", "student/orders"],
  ["/aluno/pagamentos", "student/payments"],
  ["/aluno/notificacoes", "student/notifications"],
  ["/aluno/suporte", "student/support"],
  ["/aluno/historico", "student/history"],
  ["/aluno/perfil", "student/profile"],
  ["/aluno/perfil/editar", "student/profile-edit"],
  ["/editar-perfil", "student/profile-edit"],
  ["/aluno/preferencias", "student/preferences"],
  ["/aluno/privacidade", "student/privacy"],
  ["/admin", "admin/dashboard"],
  ["/admin/cursos", "admin/courses"],
  ["/admin/cursos/novo", "admin/course-new"],
  ["/admin/produtos", "admin/products"],
  ["/admin/pagamentos", "admin/payments"],
  ["/admin/afiliados", "admin/affiliates"],
  ["/admin/alunos", "admin/students"],
  ["/admin/academico", "admin/academic"],
  ["/admin/contatos", "admin/contacts"],
  ["/admin/suporte", "admin/support"],
  ["/admin/privacidade", "admin/privacy"],
  ["/admin/erros", "admin/errors"],
  ["/cursos", "commerce/courses"],
  ["/marketplace", "commerce/marketplace"],
  ["/meus-produtos", "commerce/products"],
]);

const textRules = [
  [/^(entrar|fazer login|login)$/i, "public/login"],
  [/^(criar conta|cadastre-se|cadastrar|matricule-se)$/i, "public/register"],
  [/^(esqueci minha senha|esqueci a senha|recuperar senha)$/i, "public/forgot-password"],
  [/^(contato|fale conosco)$/i, "public/contact"],
  [/^(certificado|validar certificado)$/i, "public/certificate"],
  [/^(início|inicio|visão geral|dashboard)$/i, "student/dashboard"],
  [/^meus cursos$/i, "student/courses"],
  [/^(continuar estudando|abrir curso|ver curso)$/i, "student/course"],
  [/^(módulos|modulos|ver módulos|ver modulos)$/i, "student/modules"],
  [/^(aula\b|assistir$|abrir aula|assistir aula|continuar aula|próxima aula|proxima aula)/i, "student/lesson-video"],
  [/^(biblioteca|materiais)$/i, "student/library"],
  [/^favoritos$/i, "student/favorites"],
  [/^certificados$/i, "student/certificates"],
  [/^meus produtos$/i, "student/products"],
  [/^pedidos$/i, "student/orders"],
  [/^pagamentos$/i, "student/payments"],
  [/^notificações|notificacoes$/i, "student/notifications"],
  [/^suporte$/i, "student/support"],
  [/^histórico|historico$/i, "student/history"],
  [/^perfil$/i, "student/profile"],
  [/^(editar perfil|editar)$/i, "student/profile-edit"],
  [/^preferências|preferencias$/i, "student/preferences"],
  [/^privacidade$/i, "student/privacy"],
];

const contextualText = (text, currentSlug) => {
  const value = normalizeText(text);
  const area = currentSlug.split("/")[0];

  if (area === "public") {
    if (/^cursos$/.test(value)) return "commerce/courses";
    if (currentSlug === "public/login" && /^(entrar|acessar|acessar portal|entrar no portal)$/.test(value)) return "student/dashboard";
    if (currentSlug === "public/register" && /^(criar conta|cadastrar|matricule-se|continuar)$/.test(value)) return "public/verify-email";
    if (currentSlug === "public/forgot-password" && /^(enviar|enviar link|recuperar senha|continuar)$/.test(value)) return "public/reset-password";
    if (currentSlug === "public/reset-password" && /^(salvar|redefinir senha|continuar|voltar ao login)$/.test(value)) return "public/login";
    if (["public/verify-email", "public/verified"].includes(currentSlug) && /^(entrar|acessar|acessar portal|entrar no portal|continuar)$/.test(value)) return "student/dashboard";
  }
  if (area === "student") {
    if (/^(cursos|comprar cursos)$/.test(value)) return "commerce/courses";
    if (/^(produtos digitais|marketplace|comprar produtos)$/.test(value)) return "commerce/marketplace";
    if (currentSlug === "student/course" && /^módulo\b|^modulo\b/.test(value)) return "student/modules";
  }
  if (area === "admin") {
    const admin = new Map([
      ["dashboard", "admin/dashboard"], ["visão geral", "admin/dashboard"], ["cursos", "admin/courses"],
      ["novo curso", "admin/course-new"], ["editar", "admin/course-edit"], ["editar curso", "admin/course-edit"],
      ["preview", "admin/course-preview"], ["preview do curso", "admin/course-preview"], ["currículo", "admin/curriculum"],
      ["curriculo", "admin/curriculum"], ["módulos", "admin/modules"], ["modulos", "admin/modules"],
      ["aulas", "admin/lessons"], ["editar módulo", "admin/module-editor"], ["editar modulo", "admin/module-editor"],
      ["editor de módulo", "admin/module-editor"], ["editor de modulo", "admin/module-editor"],
      ["editar aula", "admin/lesson-editor"], ["editor de aula", "admin/lesson-editor"],
      ["assets", "admin/assets"], ["materiais", "admin/assets"], ["produtos", "admin/products"],
      ["pagamentos", "admin/payments"], ["afiliados", "admin/affiliates"], ["alunos", "admin/students"],
      ["acadêmico", "admin/academic"], ["academico", "admin/academic"], ["contatos", "admin/contacts"],
      ["suporte", "admin/support"], ["privacidade", "admin/privacy"], ["erros", "admin/errors"],
    ]);
    if (admin.has(value)) return admin.get(value);
  }
  if (area === "affiliate") {
    const affiliate = new Map([
      ["visão geral", "affiliate/active"], ["geral", "affiliate/active"], ["ofertas", "affiliate/offers"],
      ["links", "affiliate/links"], ["performance", "affiliate/performance"], ["cliques", "affiliate/performance"],
      ["conversões", "affiliate/performance"], ["conversoes", "affiliate/performance"], ["comissões", "affiliate/commissions"],
      ["comissoes", "affiliate/commissions"], ["payouts", "affiliate/payouts"], ["histórico", "affiliate/events"],
      ["historico", "affiliate/events"], ["eventos", "affiliate/events"],
    ]);
    if (affiliate.has(value)) return affiliate.get(value);
  }
  if (area === "commerce") {
    if (value === "cursos") return "commerce/courses";
    if (value === "marketplace" || value === "produtos digitais") return "commerce/marketplace";
    if (value === "meus produtos") return "commerce/products";
    if (/^(comprar\b|finalizar compra|ir para checkout|checkout)/.test(value)) return "commerce/checkout-processing";
    if (/^(tentar novamente|falha|erro)$/.test(value)) return "commerce/checkout-error";
    if (/^(confirmado|sucesso|pagamento confirmado)$/.test(value)) return "commerce/payment-success";
    if (/^(expirado|checkout expirado)$/.test(value)) return "commerce/payment-expired";
    if (/^(cancelado|checkout cancelado)$/.test(value)) return "commerce/payment-cancelled";
    if (/^(reembolsado|refunded)$/.test(value)) return "commerce/payment-refunded";
    if (value === "chargeback") return "commerce/payment-chargeback";
  }
  return null;
};

const fromHref = (href, currentSlug) => {
  if (!href || href === "#") return null;
  let url;
  try { url = new URL(href, window.location.href); } catch { return null; }
  if (url.origin !== window.location.origin) return null;

  const root = previewRoot();
  if (url.pathname.startsWith(root)) {
    const slug = url.pathname.slice(root.length).replace(/\/+$/, "");
    return surfaceSlugs.has(slug) ? slug : null;
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/portal" || path === "/dashboard") {
    if (currentSlug.startsWith("admin/")) return "admin/dashboard";
    if (currentSlug.startsWith("affiliate/")) return "affiliate/active";
    return "student/dashboard";
  }
  if (path === "/afiliado") {
    const hashMap = new Map([
      ["#affiliate-overview", "affiliate/active"], ["#affiliate-offers", "affiliate/offers"],
      ["#affiliate-links", "affiliate/links"], ["#affiliate-clicks", "affiliate/performance"],
      ["#affiliate-commissions", "affiliate/commissions"], ["#affiliate-payouts", "affiliate/payouts"],
      ["#affiliate-events", "affiliate/events"],
    ]);
    return hashMap.get(url.hash) || "affiliate/active";
  }
  if (/^\/aluno\/cursos\/[^/]+$/.test(path)) return "student/course";
  if (/^\/aula\/[^/]+$/.test(path)) return "student/lesson-video";
  if (/^\/admin\/cursos\/[^/]+\/editar$/.test(path)) return "admin/course-edit";
  if (/^\/admin\/cursos\/[^/]+\/preview$/.test(path)) return "admin/course-preview";
  if (/^\/admin\/cursos\/[^/]+\/curriculo$/.test(path)) {
    const byText = contextualText(document.activeElement?.textContent, currentSlug);
    return byText || "admin/curriculum";
  }
  if (path === "/pagamento-sucesso") {
    const status = url.searchParams.get("status");
    return ({ processing:"commerce/checkout-processing", error:"commerce/checkout-error", paid:"commerce/payment-success", expired:"commerce/payment-expired", cancelled:"commerce/payment-cancelled", refunded:"commerce/payment-refunded", chargeback:"commerce/payment-chargeback" })[status] || "commerce/payment-success";
  }
  return exactRoutes.get(path) || null;
};

export const resolvePreviewDestination = ({ href, text, currentSlug }) => {
  const textDestination = contextualText(text, currentSlug) || textRules.find(([pattern]) => pattern.test(String(text || "").trim()))?.[1];
  const hrefDestination = fromHref(href, currentSlug);
  return textDestination || hrefDestination || null;
};

const getActionElement = (target) => target instanceof Element ? target.closest("a,button,[role='button']") : null;

export function installPreviewNavigation(currentSlug) {
  const navigate = (slug) => {
    if (!surfaceSlugs.has(slug) || slug === currentSlug) return;
    window.location.assign(previewUrl(slug));
  };

  const decorateModuleSurface = () => {
    if (currentSlug !== "student/course") return;
    for (const heading of document.querySelectorAll("h3")) {
      if (!/^módulo\b|^modulo\b/i.test((heading.textContent || "").trim())) continue;
      const header = heading.closest("div.flex.items-center.justify-between") || heading.parentElement;
      if (!(header instanceof HTMLElement)) continue;
      header.setAttribute("role", "button");
      header.tabIndex = 0;
      header.dataset.previewDestination = "student/modules";
      if (!header.getAttribute("aria-label")) header.setAttribute("aria-label", `Abrir módulo ${(heading.textContent || "").trim()}`);
    }
  };

  const decorate = () => {
    decorateModuleSurface();
    for (const element of document.querySelectorAll("a,button,[role='button']")) {
      if (element.closest("[data-preview-navigator]")) continue;
      if (element.dataset.previewDestination) continue;
      const destination = resolvePreviewDestination({ href: element.getAttribute("href"), text: element.textContent, currentSlug });
      if (destination) element.dataset.previewDestination = destination;
      else delete element.dataset.previewDestination;
    }
  };

  document.addEventListener("click", (event) => {
    const element = getActionElement(event.target);
    if (!element || element.closest("[data-preview-navigator]")) return;
    const destination = element.dataset.previewDestination || resolvePreviewDestination({ href: element.getAttribute("href"), text: element.textContent, currentSlug });
    if (!destination) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(destination);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const element = getActionElement(event.target);
    if (!element || element.tagName === "A" || element.tagName === "BUTTON" || element.closest("[data-preview-navigator]")) return;
    const destination = element.dataset.previewDestination;
    if (!destination) return;
    event.preventDefault();
    navigate(destination);
  }, true);

  const observer = new MutationObserver(decorate);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("load", decorate, { once: true });
  queueMicrotask(decorate);
}
