# FASE B23 — Identidade visual e design system

## Estado da decisão de marca

A aplicação possui identidade operacional, mas a decisão institucional definitiva ainda não foi fornecida de forma completa. Para impedir que o frontend invente informações de marca, a configuração foi centralizada em `src/config/brand.ts` com estados explícitos.

| Campo | Estado atual |
| --- | --- |
| Nome operacional | Aprendendo com DJ Stay |
| Nome oficial aprovado | Bloqueado — não informado |
| Candidatos registrados | Aprendendo com DJ Stay; Dica de Cria — com DJ Stay |
| Proprietário | LANDER SOLUTIONS |
| Slogan | Bloqueado — não informado |
| Domínio oficial | Bloqueado — não informado |
| Remetente de e-mail | Bloqueado — não informado |
| Redes sociais | Bloqueado — não informadas |
| Logotipo | Provisório, mantendo o asset existente |
| Paleta | Provisória, centralizada em tokens |

A ausência dos campos oficiais é um bloqueio de aprovação de branding, mas não interrompe a correção técnica do design system. Nenhuma página deverá preencher esses campos com conteúdo presumido.

## Arquitetura visual

A identidade é expressa por tokens CSS e mapeada pelo Tailwind. Componentes e páginas não devem utilizar valores hexadecimais ou cores de produto diretamente quando existir token semântico.

### Tokens globais

- `background`, `foreground`, `card`, `popover`;
- `primary`, `secondary`, `muted`, `accent`;
- `destructive`, `success`, `warning`, `info`;
- `border`, `input`, `ring`;
- `surface-raised`, `surface-overlay`, `surface-subtle`;
- sombras `soft`, `raised` e `focus`;
- raio base compartilhado.

### Contextos de produto

Os ambientes compartilham estrutura, tipografia e comportamento, porém possuem acentos distinguíveis:

| Contexto | Token |
| --- | --- |
| Cursos e Portal do Aluno | `course-accent` |
| Marketplace | `marketplace-accent` |
| Afiliados | `affiliate-accent` |
| Administração | `admin-accent` |

O atributo `data-context` altera `--context-accent` sem duplicar componentes ou criar temas paralelos.

## Componentes centrais

### Botões

Variantes disponíveis:

- `default`;
- `brand`;
- `context`;
- `destructive`;
- `success`;
- `warning`;
- `outline`;
- `secondary`;
- `soft`;
- `ghost`;
- `link`.

Tamanhos disponíveis: `xs`, `sm`, `default`, `lg`, `xl` e `icon`.

Estados de foco, hover, active e disabled são definidos no componente, não nas páginas.

### Cards e badges

Cards possuem variantes `default`, `raised`, `muted`, `interactive`, `course`, `marketplace`, `affiliate` e `admin`. Badges possuem variantes semânticas para sucesso, alerta, informação, destruição e os quatro contextos de produto.

As funções de variantes ficam em `card-variants.ts` e `badge-variants.ts`, separadas dos componentes para preservar Fast Refresh sem warnings.

### Campos

`Input` e `Textarea` compartilham:

- superfície semântica;
- hover e foco por contexto;
- `aria-invalid` com estado destrutivo;
- disabled visível;
- ring consistente;
- contraste baseado em tokens.

### Estados de página

`PageState` centraliza loading, erro, vazio e sucesso. O componente fornece iconografia, `role`, `aria-live`, `aria-busy`, ação opcional e apresentação compacta.

### Shells

`AppPageShell` centraliza contexto, largura, grid, cabeçalho, eyebrow, título, descrição, navegação, ações e área principal.

Ambientes migrados para o shell e tokens semânticos:

- administração de cursos por `AdminCourseLayout`;
- marketplace completo;
- Portal do Afiliado completo;
- certificados do aluno;
- biblioteca de produtos digitais;
- navegação pública;
- redirecionamento de afiliado.

## Marketplace

`DigitalMarketplace` utiliza contexto `marketplace`, cards semânticos, badges de licença, estados de catálogo/licença/checkout, botões válidos com `asChild` e grid responsivo. Nenhuma classe preta, branca ou violeta ad hoc permanece na página.

## Portal do Afiliado

`AffiliatePortal` utiliza contexto `affiliate`, cards financeiros, badges de status, estados de perfil, tabela acessível, ações com rótulos e áreas vazias padronizadas. Perfil, links, ofertas, comissões e repasses continuam usando os mesmos hooks e contratos persistidos.

## Portal do Aluno — páginas isoladas

`Certificates` utiliza contexto `course`, estados padronizados, cards de certificado, badges de validade e ações sem aninhamento inválido. Emissões e revogações continuam derivadas exclusivamente do backend.

`MyDigitalProducts` utiliza contexto `marketplace`, detalhes semânticos de acesso e licença, estados de entregáveis e downloads privados. A página não declara acesso a partir de redirecionamento de pagamento e preserva as validações de grant.

O shell principal `StudentPortal` ainda será migrado em lote próprio por concentrar dashboard, cursos, biblioteca, pedidos, pagamentos, histórico e perfil em um arquivo extenso.

## Compatibilidade e migração

As classes legadas `btn-brand`, `btn-neon` e `glass-card` permanecem temporariamente como aliases semânticos para não quebrar telas ainda não migradas. Novos componentes não devem utilizá-las. A remoção ocorrerá após a migração dos ambientes restantes.

## Acessibilidade incorporada

Mesmo pertencendo formalmente à B24, o núcleo visual já preserva:

- foco visível global;
- ring semântico;
- `prefers-reduced-motion`;
- estados ARIA em campos e estados de página;
- ícones decorativos ocultos nos shells migrados;
- cabeçalhos com `scope` em tabelas migradas;
- nomes acessíveis em botões somente com ícone;
- touch targets mínimos nos botões padrão.

A validação completa de WCAG, teclado, landmarks, modais, tabelas e leitores de tela permanece na B24.

## Rastreabilidade

| Requisito | Implementação |
| --- | --- |
| REQ-BRAND-001 — decisão de marca sem conteúdo inventado | `src/config/brand.ts` |
| REQ-DS-001 — tokens centralizados | `src/index.css`, `tailwind.config.ts` |
| REQ-DS-002 — contextos relacionados e distinguíveis | `data-context`, tokens de curso, marketplace, afiliado e admin |
| REQ-DS-003 — componentes com estados consistentes | button, card, badge, input, textarea |
| REQ-DS-004 — estados vazios/loading/erro/sucesso | `src/components/ui/page-state.tsx` |
| REQ-DS-005 — shell responsivo comum | `src/components/layout/AppPageShell.tsx` |
| REQ-DS-006 — administração sem hardcodes de cor | `src/components/admin/AdminCourseLayout.tsx` |
| REQ-DS-007 — marketplace contextual | `src/pages/marketplace/DigitalMarketplace.tsx` |
| REQ-DS-008 — afiliados contextual | `src/pages/affiliate/AffiliatePortal.tsx` |
| REQ-DS-009 — certificados do aluno | `src/pages/student/Certificates.tsx` |
| REQ-DS-010 — biblioteca digital do aluno | `src/pages/student/MyDigitalProducts.tsx` |
| TEST-DS-001 — contrato estático | `scripts/check-design-system-contract.mjs` |

## Rollback

A fase não altera banco, migrations, RLS ou dados. O rollback consiste em reverter os commits de frontend e documentação. Os aliases legados reduzem o risco de regressão durante a migração gradual.

## Bloqueios

- aprovação do nome oficial;
- aprovação do slogan;
- definição do domínio;
- definição do remetente de e-mail;
- definição das redes sociais oficiais;
- aprovação do logotipo e da paleta definitiva.

## Pendências sequenciais da B23

- migrar o shell principal do Portal do Aluno;
- migrar páginas administrativas restantes;
- migrar autenticação e páginas públicas restantes;
- migrar player e checkout;
- eliminar aliases legados após comprovar ausência de uso;
- revisar responsividade em desktop, tablet e mobile;
- registrar aprovação final da marca quando os dados forem fornecidos.
