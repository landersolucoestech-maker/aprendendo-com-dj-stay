# Plataforma de cursos e produtos digitais

Repositório técnico da plataforma atualmente identificada pelo nome de projeto **Aprendendo com DJ Stay**. A marca pública definitiva não deve ser inferida a partir do nome do repositório, do projeto Supabase ou de nomenclaturas legadas.

## Estado atual

O desenvolvimento ocorre exclusivamente na branch `dev`. A branch `main` e o projeto Supabase de produção não foram promovidos por esta sequência de trabalho e permanecem sem escrita automática.

A plataforma deixou de ser apenas o protótipo React/Vite herdado. Autenticação, papéis, banco canônico, storage privado, cursos, portal do aluno, marketplace, pagamentos, afiliados, certificados, contatos e observabilidade possuem implementação e contratos automatizados validados no ambiente `dev`.

Isso não significa produção liberada. Homologação financeira no sandbox do provider, configuração externa de webhooks, pentest, teste de carga e revisão final de promoção continuam separados do gate de código.

Consulte a matriz completa em [`docs/STATUS.md`](docs/STATUS.md).

## Escopo

A plataforma é exclusiva de um único instrutor proprietário e possui:

- portal público e autenticação;
- portal do aluno;
- módulo administrativo do instrutor/proprietário;
- cursos, avaliações, progresso e certificados;
- marketplace de produtos digitais próprios;
- pagamentos e programa de afiliados.

Não existe modelo multi-instrutor ou administração externa.

## Stack

- React 18;
- TypeScript;
- Vite;
- React Router;
- TanStack React Query;
- Tailwind CSS e componentes shadcn/Radix;
- Supabase Database, Auth, Storage e Edge Functions.

## Requisitos locais

- Node.js `>=22.16.0 <23`;
- npm `>=10.9.2 <11`.

O package manager oficial é **npm**. Não utilize Bun, pnpm ou Yarn neste repositório.

## Instalação e desenvolvimento

```bash
npm ci
npm run dev
```

Crie localmente o arquivo `.env` e configure somente as variáveis públicas documentadas em [`docs/environment.md`](docs/environment.md).

Arquivos `.env` são locais e não podem ser versionados. Nunca use `service_role`, segredo de webhook ou credencial privada de provider em variáveis `VITE_*`.

## Qualidade

O gate consolidado é:

```bash
npm run check
```

Ele executa lint, contratos, TypeScript, audit de dependências, build e validação dos chunks. No CI, a validação inclui reconstrução local do Supabase, pgTAP, sincronização de tipos e artefatos de supply chain.

Cada execução do CI cria uma issue de evidência. Evidências integralmente verdes são encerradas automaticamente como `completed`. Evidências que registram ao menos uma etapa em `failure` permanecem abertas e acionáveis. Execuções sem `failure`, mas interrompidas com etapas `cancelled` ou `skipped`, são encerradas como `not_planned`, preservando o histórico sem misturá-las com falhas técnicas. O passivo histórico de evidências verdes foi reconciliado na fase B50.

Comandos individuais:

```bash
npm run lint
npm run typecheck
npm run build
```

Build verde não substitui RLS, homologação externa, pentest ou revisão de produção.

## Ambientes

| Branch GitHub | Ambiente Supabase | Project ref | Escrita |
| --- | --- | --- | --- |
| `dev` | desenvolvimento | `jmtyurketfclaneqxohu` | permitida durante as fases autorizadas |
| `main` | produção | `tduvfrxagujryfnqpdmc` | proibida sem autorização explícita |

O projeto legado `uonsgcndzzuclcixoaei` permanece bloqueado e não pode ser utilizado como fallback.

## Fluxo de contribuição

- todas as alterações são realizadas em `dev`;
- commits devem corresponder a uma fase e responsabilidade;
- o pipeline deve bloquear falhas;
- a promoção ocorre por Pull Request `dev → main`;
- merge, deploy e escrita em produção não são automáticos.

## Documentação

- [`docs/STATUS.md`](docs/STATUS.md): estado operacional verificado e limites de homologação;
- [`docs/audit`](docs/audit/README.md): evidências e limites da auditoria;
- [`docs/refactor`](docs/refactor/README.md): execução sequencial das fases;
- [`docs/environment.md`](docs/environment.md): contrato de configuração pública.
