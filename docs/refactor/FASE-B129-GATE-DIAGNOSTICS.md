# FASE B129 — Diagnósticos persistentes do gate

## Problema comprovado

Etapas executadas com `continue-on-error` preservavam o resultado agregado do gate, mas mensagens internas extensas de `typecheck` e navegador não permaneciam disponíveis nos artefatos. Isso obrigava a inferir a primeira falha a partir do outcome resumido.

## Implementação

O workflow mantém os mesmos comandos bloqueantes e adiciona persistência de stdout e stderr:

- `artifacts/diagnostics/typecheck.log`;
- `artifacts/diagnostics/browser-runtime.log`;
- `artifacts/diagnostics/browser-network.log`;
- `artifacts/diagnostics/browser-navigation.log`.

Cada pipeline usa `set -o pipefail` antes de `tee`. Portanto, o exit code do comando original continua determinando o outcome da etapa; a captura não transforma falha em sucesso.

O artifact `gate-diagnostics-<commit>` possui retenção de um dia e é exportado mesmo quando TypeScript ou navegador falham.

## Evidência de uso

No run do commit `b893e89bed940df5a24a820d66486815db348202`, o artifact mostrou que:

- todos os contratos anteriores haviam passado;
- o navegador B127/B128 e a navegação B125 estavam verdes;
- a única falha restante era `TS18048` em duas linhas do teste da fixture sintética.

A correção foi aplicada sem reduzir contrato, ignorar TypeScript ou alterar runtime.

## Limites

Os logs podem conter mensagens de ferramentas e caminhos do runner, mas não devem conter credenciais. A redação B121 continua aplicada à saída do Supabase CLI.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado.
