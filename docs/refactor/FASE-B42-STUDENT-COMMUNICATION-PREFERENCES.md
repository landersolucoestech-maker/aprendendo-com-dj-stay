# FASE B42 — Preferências de comunicação e privacidade do aluno

## Objetivo

Persistir escolhas de comunicação e privacidade vinculadas exclusivamente ao usuário autenticado, com defaults conservadores e consentimento auditável.

## Escopo implementado

- tabela `public.student_communication_preferences` com uma linha por usuário;
- notificações internas transacionais sempre ativas;
- e-mail transacional, atualizações de produto, marketing e analytics opcionais;
- todas as opções externas ou opcionais desativadas por padrão;
- versão e horário do consentimento obrigatórios quando marketing ou analytics são ativados;
- leitura e atualização somente por RPCs vinculadas a `auth.uid()`;
- RLS forçada, política restritiva e nenhum grant direto para `anon` ou `authenticated`;
- wrappers públicos `SECURITY INVOKER` e implementação privada `SECURITY DEFINER`;
- rota protegida `/aluno/preferencias` no Portal do Aluno;
- contratos Zod, hooks React Query, pgTAP e gate estático.

## Fora de escopo

Esta fase não envia e-mails, não integra provedores externos, não cria campanhas e não implementa cookies ou trackers. Ela apenas registra preferências para integrações futuras.

## Regras de consentimento

- notificações internas essenciais não podem ser desativadas;
- marketing e analytics exigem `consent_version` não vazia;
- desativar marketing e analytics remove a versão e o horário do consentimento opcional;
- o histórico operacional continua protegido pelos mecanismos de auditoria existentes.

## Validação

- `supabase/tests/54_student_communication_preferences.test.sql`;
- `scripts/check-student-communication-preferences.mjs`;
- `npm run check:student-communication-preferences`;
- advisors de segurança e performance após a migration.
