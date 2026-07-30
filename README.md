# Plataforma de cursos e produtos digitais

Repositório técnico da plataforma atualmente identificada pelo nome de projeto **Aprendendo com DJ Stay**. A marca pública definitiva ainda depende de decisão formal e não deve ser inferida a partir do nome do repositório, do projeto Supabase ou de nomenclaturas legadas.

## Estado atual

O projeto está em refatoração integral na branch `dev`. A branch `main` permanece como referência de produção e não recebe alterações automáticas.

O código herdado é um protótipo React/Vite com integrações incompletas. Autenticação, autorização, banco canônico, storage privado, pagamentos, Pix, marketplace e afiliados ainda não devem ser considerados operacionais. O diagnóstico completo está em [`docs/audit`](docs/audit).

## Stack atual

- React 18;
- TypeScript;
- Vite;
- React Router;
- TanStack React Query;
- Tailwind CSS e componentes shadcn/Radix;
- Supabase.

## Requisitos locais

- Node.js `>=22.16.0 <23`;
- npm `>=10.9.2 <11`.

O package manager oficial é **npm**. Não utilize Bun, pnpm ou Yarn neste repositório.

## Instalação

```bash
npm ci
```

## Desenvolvimento

1. Crie localmente o arquivo `.env`;
2. configure somente as variáveis públicas documentadas em [`docs/environment.md`](docs/environment.md);
3. execute:

```bash
npm run dev
```

Arquivos `.env` são locais e não podem ser versionados. Nunca use `service_role`, segredo de webhook ou credencial de provider em variáveis `VITE_*`.

## Qualidade

```bash
npm run lint
npm run typecheck
npm run build
```

O comando consolidado é:

```bash
npm run check
```

A ausência de erro no build não substitui testes, validação de RLS, homologação ou revisão de produção.

## Ambientes

| Branch GitHub | Ambiente Supabase | Project ref | Escrita |
| --- | --- | --- | --- |
| `dev` | desenvolvimento | `jmtyurketfclaneqxohu` | permitida durante as fases autorizadas |
| `main` | produção | `tduvfrxagujryfnqpdmc` | proibida sem autorização explícita |

O projeto legado `uonsgcndzzuclcixoaei` permanece bloqueado para reconciliação e não pode ser utilizado como fallback.

## Fluxo de contribuição

- todas as alterações são realizadas em `dev`;
- commits devem corresponder a uma fase e responsabilidade;
- o pipeline deve bloquear falhas;
- a promoção ocorre por Pull Request `dev → main`;
- merge e escrita em produção não são automáticos.

## Documentação

- [`docs/audit`](docs/audit): auditoria e matriz de achados;
- [`docs/refactor`](docs/refactor): execução sequencial da refatoração;
- [`docs/environment.md`](docs/environment.md): contrato de configuração pública.
