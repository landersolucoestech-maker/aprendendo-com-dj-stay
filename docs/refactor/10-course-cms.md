# FASE B11 — CMS de cursos

## Resultado

O CMS de cursos foi reconciliado no branch `dev` e permanece restrito ao papel `administrador_proprietario`.

A implementação cobre criação, edição integral, duplicação, preview, publicação, despublicação, arquivamento e exclusão controlada. Todas as escritas passam por RPCs auditadas; a tabela `courses` não aceita mutação direta pelo papel autenticado.

## Integridade

- formulário carregado a partir do registro persistido completo;
- atualização parcial sem apagar campos omitidos;
- versão otimista com rejeição de gravações obsoletas;
- validação editorial antes da publicação;
- auditoria em `course_editor_events`;
- disponibilidade integrada às regras de matrícula e acesso;
- imagens vinculadas por assets privados, sem URLs permanentes.

## Evidência

A base B11 foi validada por reconstrução limpa do banco, pgTAP, contrato estático, lint, TypeScript e build antes da expansão curricular da FASE B12.
