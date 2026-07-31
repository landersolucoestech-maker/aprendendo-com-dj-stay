# FASE B12 — Gestão de módulos e aulas

## Escopo entregue

O CMS curricular do branch `dev` administra módulos e aulas sem escrita direta nas tabelas. A interface protegida está disponível em `/admin/cursos/:courseId/curriculo` e usa exclusivamente RPCs auditadas.

### Módulos

- criar e editar metadados completos;
- duplicar sem copiar mídia/assets implicitamente;
- reordenar atomicamente;
- marcar como obrigatório;
- configurar preview;
- liberar imediatamente, por agendamento, por dias após matrícula ou após pré-requisitos;
- definir pré-requisitos com bloqueio de ciclos;
- arquivar com as aulas dependentes;
- excluir somente quando não houver dependências.

### Aulas

- criar, editar e duplicar;
- reordenar dentro do módulo;
- mover entre módulos com validação de versões de origem e destino;
- conteúdo textual, vídeo, áudio ou misto;
- duração, obrigatoriedade e regra de conclusão;
- preview, disponibilidade e liberação progressiva;
- pré-requisitos com bloqueio de ciclos;
- arquivamento e exclusão controlada;
- vídeo YouTube/Vimeo normalizado ou vídeo privado;
- áudio privado e materiais complementares vinculados por assets;
- desativação de mídia e arquivamento de materiais.

## Segurança e consistência

- `modulos`, `aulas` e tabelas de dependência usam RLS;
- mutações diretas do papel autenticado foram revogadas;
- todas as operações editoriais exigem `administrador_proprietario` no backend;
- versões otimistas rejeitam atualizações concorrentes;
- publicação do curso exige ao menos uma aula publicada em cada módulo publicado;
- acesso do aluno respeita matrícula, status, janela de disponibilidade, drip e pré-requisitos;
- playback protegido reutiliza o lifecycle privado da FASE B9;
- URLs assinadas nunca são persistidas.

## Testes

A suíte B12 cobre estrutura, módulos, aulas, acesso do aluno, playback, argumentos RPC e índices de chaves estrangeiras. A base backend foi aprovada com 449 testes pgTAP antes da conexão da interface administrativa.

O gate final da fase executa instalação limpa, lint, reconstrução total do Supabase local, pgTAP, geração e sincronização dos tipos, TypeScript estrito sobre os projetos referenciados e build de desenvolvimento.
