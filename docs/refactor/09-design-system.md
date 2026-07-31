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

### Cards

Variantes disponíveis:

- `default`;
- `raised`;
- `muted`;
- `interactive`;
- `course`;
- `marketplace`;
- `affiliate`;
- `admin`.

### Badges

Variantes semânticas para status e contextos: `success`, `warning`, `info`, `destructive`, `course`, `marketplace`, `affiliate` e `admin`.

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

`AppPageShell` centraliza:

- contexto do produto;
- largura e grid;
- cabeçalho;
- eyebrow;
- título;
- descrição;
- navegação;
- ações;
- área principal.

`AdminCourseLayout` já utiliza esse shell. Navegação pública e redirecionamento de afiliado também foram migrados para tokens semânticos.

## Compatibilidade e migração

As classes legadas `btn-brand`, `btn-neon` e `glass-card` permanecem temporariamente como aliases semânticos para não quebrar telas ainda não migradas. Novos componentes não devem utilizá-las. A remoção ocorrerá após a migração dos ambientes público, aluno, marketplace, afiliados, administração, player e checkout.

## Acessibilidade incorporada

Mesmo pertencendo formalmente à B24, o núcleo visual já preserva:

- foco visível global;
- ring semântico;
- `prefers-reduced-motion`;
- estados ARIA em campos e estados de página;
- ícones decorativos ocultos de tecnologias assistivas nos shells migrados;
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

- migrar shells do Portal do Aluno;
- migrar marketplace;
- migrar Portal de Afiliados;
- migrar páginas administrativas restantes;
- migrar autenticação e páginas públicas;
- migrar player e checkout;
- eliminar aliases legados após comprovar ausência de uso;
- revisar responsividade em desktop, tablet e mobile;
- registrar aprovação final da marca quando os dados forem fornecidos.
