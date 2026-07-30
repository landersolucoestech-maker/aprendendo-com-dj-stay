# FASE B7 — Contratos de dados e RPCs

Status: concluída em `dev` com contratos de runtime, bloqueio de drift e gate automático aprovado.

## Escopo auditado

Foram comparados o schema PostgreSQL canônico, os tipos gerados pelo Supabase, os hooks de domínio, os modelos usados pela interface, o formulário de perfil e os fluxos de leitura e persistência existentes.

O estado atual não possui:

- RPCs PostgreSQL;
- Edge Functions;
- webhooks;
- enums de domínio;
- analytics persistidos;
- contratos financeiros;
- filtros de domínio enviados ao backend.

Esses itens não foram simulados nem criados antecipadamente. Eles deverão ser implementados e validados nas fases funcionais correspondentes.

## Divergências removidas

- casts de respostas Supabase para tipos manuais;
- arrays vazios usados para esconder resposta ausente ou inválida;
- títulos e descrições inventados para dados nulos;
- duração fictícia `15:30`;
- estado de conclusão fixado em `false` sem consultar o progresso;
- download de arquivos gerados artificialmente no navegador;
- parâmetros de mutação de progresso preenchidos silenciosamente com zero ou `false`;
- metadados do usuário convertidos silenciosamente quando possuíam tipo inválido;
- progresso provisório e duplicado na página da aula;
- mensagens técnicas de contrato expostas diretamente ao usuário.

## Contratos implementados

Schemas Zod validam:

- UUIDs;
- timestamps com fuso;
- módulos e aulas;
- URLs HTTPS de vídeo e avatar;
- progresso e limites percentuais;
- parâmetros obrigatórios de atualização de progresso;
- perfil mínimo do aluno;
- metadados editáveis do usuário;
- relações usadas por atividades recentes;
- caminhos de arquivos sem caminho absoluto ou travessia;
- buckets e nomes aceitos pelo fluxo de download existente.

As respostas são validadas imediatamente após o retorno do Supabase e antes de qualquer transformação para a interface.

## Tratamento de falhas

`DataContractError` preserva:

- contexto técnico;
- lista estruturada de issues do Zod;
- stack de erro.

A interface recebe uma mensagem segura e não persiste payloads que falhem na validação. Erros reais de consulta continuam interrompendo o fluxo, sem conversão para valores artificiais.

## Tipos gerados

O arquivo `src/integrations/supabase/types.ts` continua sendo gerado pelo Supabase e não foi editado manualmente nesta fase.

O workflow compara o tipo gerado durante a reconstrução limpa com o tipo versionado. Qualquer drift interrompe o gate.

## Evidência automática

Commit validado:

```text
a8a1bb37858ac53663cfee564e515902f282aea2
```

Workflow run: `30557768404`

| Etapa | Resultado |
| --- | --- |
| `npm ci` | success |
| `npm run lint` | success |
| Supabase CLI | success |
| `supabase start` | success |
| `supabase db reset --local` | success |
| `supabase test db` | success |
| geração de tipos TypeScript | success |
| tipos gerados sem drift | success |
| `npm run typecheck` | success |
| `npm run build:dev` | success |

## Limites

- Storage privado e autorização de download pertencem à FASE B9;
- papéis, matrículas e autorização por recurso pertencem à FASE B8 e fases de domínio;
- pagamentos, pedidos, Pix, webhooks e dados financeiros pertencem às fases de checkout e financeiro;
- produção permaneceu somente leitura;
- nenhum deploy foi executado.
