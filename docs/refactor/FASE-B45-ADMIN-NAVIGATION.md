# Fase B45 — Navegação administrativa unificada

## Objetivo

Eliminar o acesso administrativo fragmentado por URLs manuais e disponibilizar uma navegação única para todas as áreas operacionais já existentes.

## Implementação

O componente `AdminNavigation` é renderizado dentro do próprio `AdminRoute`. Dessa forma, todas as rotas protegidas por `administrador_proprietario`, inclusive páginas de edição e currículo, recebem a navegação sem duplicar código em cada módulo.

Áreas disponíveis:

- Cursos;
- Produtos;
- Pagamentos;
- Afiliados;
- Alunos;
- Contatos;
- Suporte;
- Privacidade;
- Erros de frontend.

## Comportamento

- item ativo identificado pelo `NavLink`;
- navegação horizontal com rolagem em larguras reduzidas;
- foco visível para operação por teclado;
- rótulo acessível `Navegação administrativa`;
- retorno ao portal pelo identificador Administração;
- rotas reais, sem links placeholder;
- layout interno e regras de domínio dos módulos permanecem inalterados.

## Compatibilidade

O menu isolado “CMS de cursos” foi removido de `AdminCourseLayout`, evitando duas navegações concorrentes. A barra global permanece acima das páginas administrativas que já possuem cabeçalhos próprios.

## Verificação

- gate estático `check:admin-navigation`;
- lint;
- TypeScript;
- build e contrato de chunks;
- nenhuma alteração de banco ou dependências.
