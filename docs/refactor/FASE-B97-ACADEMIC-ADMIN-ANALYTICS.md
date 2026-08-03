# FASE B97 — Analytics acadêmico administrativo

## Objetivo

Adicionar ao portal do proprietário uma visão acadêmica agregada por período e por curso, baseada exclusivamente em matrículas, currículo publicado e progresso persistido. O read model não lista alunos, não expõe dados pessoais e não transforma ausência de atividade em uma conclusão comportamental.

## Coorte

A coorte considera matrículas cuja data de início pertence ao intervalo solicitado. O período padrão é de 30 dias e o intervalo máximo aceito é de 366 dias.

O filtro opcional de curso restringe a mesma coorte sem alterar a semântica das métricas. Todos os indicadores, distribuições e resultados por curso derivam desse conjunto persistido.

## Conclusão e progresso

Uma matrícula é considerada integralmente concluída somente quando há conclusão de 100% das aulas publicadas do curso. Módulos e aulas em rascunho, arquivados ou fora do currículo publicado não entram no denominador.

O progresso agregado utiliza os registros persistidos de visualização e conclusão. A distribuição é apresentada em seis faixas coerentes com a quantidade total de matrículas da coorte.

## Atividade recente

A métrica **sem atividade recente** considera matrículas ativas cuja última visualização persistida está além do limite selecionado, entre 7 e 180 dias.

Sem atividade recente não significa abandono. O sistema não possui evidência suficiente para afirmar desistência, evasão ou abandono comprovado; portanto, esses termos não são usados no payload nem na interface.

## Read model

A migration `20260803033000_academic_admin_analytics.sql` adiciona:

- `private.get_academic_admin_analytics(...)` como função `SECURITY DEFINER`;
- `public.get_academic_admin_analytics(...)` como wrapper `SECURITY INVOKER`;
- autorização obrigatória do papel `administrador_proprietario`;
- validação do período e do limite de inatividade;
- agregação temporal no fuso `America/Sao_Paulo`;
- distribuição por status da matrícula;
- distribuição por faixa de progresso;
- consolidação do resultado por curso.

## Métricas

O read model retorna, de forma agregada:

- total de matrículas da coorte;
- matrículas ativas, concluídas, suspensas e expiradas;
- matrículas ativas sem atividade recente;
- percentual médio de conclusão;
- quantidade de matrículas com 100% das aulas publicadas concluídas;
- distribuição de progresso;
- resultado por curso.

## Segurança e privacidade

- `anon` não pode executar a RPC;
- usuários autenticados sem papel de proprietário recebem `ADMIN_REQUIRED`;
- o payload não contém nome, e-mail, metadados de autenticação ou identificadores pessoais de alunos;
- a interface é somente leitura;
- o schema privado permanece inacessível pela Data API;
- nenhuma métrica infere abandono a partir de inatividade.

## Interface

A rota `/admin/academico` apresenta:

- filtros rápidos de 7, 30, 90 e 365 dias;
- seleção do limite de inatividade em 7, 14, 30 ou 60 dias;
- indicadores consolidados da coorte;
- distribuição de progresso;
- resultado por curso;
- atalhos para alunos e cursos.

## Cobertura

O pgTAP B97 possui 38 asserções e valida autorização, limites temporais, inatividade, filtro por curso, currículo publicado, conclusão integral e coerência das distribuições.

A suíte unitária valida a estrutura estrita do payload, a coerência entre coorte, status, progresso e inatividade, além de rejeitar campos pessoais e alegações de abandono não suportadas.

O contrato estático B97 permanece encadeado ao gate de certificados e administração acadêmica.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B97 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.
