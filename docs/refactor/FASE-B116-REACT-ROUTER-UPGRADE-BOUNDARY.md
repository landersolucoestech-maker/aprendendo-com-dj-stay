# FASE B116 — Migração coordenada do React Router

## Migração concluída

A branch dev migrou da baseline declarativa react-router-dom@6.30.4 para react-router@8.3.0, sem passagem pela faixa vulnerável intermediária.

A atualização coordenada incluiu:

- react-router@8.3.0;
- Node 22.22.0;
- React e React DOM 19.2.8;
- tipos React 19;
- bibliotecas de UI compatíveis com React 19;
- lockfile regenerado com peer dependencies estritas;
- imports declarativos migrados para react-router;
- exceção temporária de segurança removida;
- npm audit de produção e completo com zero vulnerabilidades.

O pacote react-router-dom foi removido. A aplicação permanece em modo declarativo com BrowserRouter, Routes, Route, Link, Navigate e hooks de navegação. Data Router, Framework Mode, SSR, hydration de servidor e APIs RSC continuam proibidos pelos contratos estáticos.

## Gate

Os contratos exigem versões coordenadas, ausência do pacote legado, zero vulnerabilidades, resolução estrita sem force ou legacy-peer-deps, lockfile sincronizado, lint, testes, TypeScript, build e smoke aprovados.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch main não foi alterada.
- A aprovação em dev não equivale a homologação externa ou promoção para produção.
