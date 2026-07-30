# FASE A3 — Frontend

Status: concluída para todas as páginas, rotas, componentes e hooks de domínio comprovados.

## Rotas ativas

| Rota | Estado |
| --- | --- |
| `/` | entrega o Dashboard sem autenticação |
| `/dashboard` | duplicação da raiz, sem guard |
| `/aula/:lessonId` | acesso direto sem matrícula |
| `/contato` | formulário simulado |
| `/editar-perfil` | rota sem guard e persistência parcial |
| `/acesso-negado` | página estática sem integração com autorização |
| `/pagamento-sucesso` | falso sucesso acessível por URL |
| `/verificar-email` | reenvio simulado |
| `/verificado` | falso estado de verificação |
| `*` | 404 em inglês |

Arquivos `Index`, `Login`, `Register` e `ForgotPassword` existem, mas não possuem rota ativa.

## Achados principais

### AUD-FE-001 — Área privada exposta

`Dashboard` e `Lesson` são acessíveis sem sessão, matrícula ou compra. A última alteração do histórico removeu autenticação e políticas restritivas.

### AUD-FE-002 — Falsos sucessos

Confirmados:

- contato exibe “Mensagem enviada” após `setTimeout`;
- recuperação de senha altera apenas estado local;
- reenvio de confirmação usa `setTimeout`;
- `/verificado` declara conta validada sem comprovação;
- `/pagamento-sucesso` declara pagamento e acesso sem transação;
- perfil confirma campos que não são persistidos;
- certificado é apenas toast;
- downloads conhecidos fabricam blobs no navegador.

### AUD-FE-003 — Conteúdo fictício e claims não comprovados

Foram encontrados:

- `+2.500 alunos`;
- `4.9/5 estrelas`;
- `500M+ streams`;
- `200+ hits`;
- `50+ artistas`;
- `Top 1`;
- depoimentos atribuídos a pessoas reais sem fonte;
- vídeos de depoimento sem mídia;
- preço e parcelamento hardcoded;
- telefone, endereço, horário e e-mails não validados.

### AUD-FE-004 — Branding legado distribuído

`Vivendo da Música` aparece em navegação, rodapé, título, metadados e assets. `DICA DE CRIA` existe no Supabase e `aprendendo-com-dj-stay` no repositório. Não há configuração central de marca.

### AUD-FE-005 — Contratos e tipagem inconsistentes

- múltiplas interfaces duplicadas;
- `any[]` em módulos e cálculo de progresso;
- propriedades duplicadas para a mesma entidade;
- defaults inventados para duração, descrição e vídeo;
- erros de contrato convertidos em conteúdo padrão.

### AUD-FE-006 — UX e navegação quebradas

- links `#` em redes sociais, suporte, termos e área do aluno;
- CTAs apontam para `/matricule-se`, rota removida;
- botão de prévia sem ação;
- botão de vídeo apenas registra `console.log`;
- `/pagamento-sucesso` aponta para `/cursos`, rota inexistente;
- navegação por âncoras é usada em páginas sem as seções correspondentes;
- estados bloqueados continuam navegáveis.

### AUD-FE-007 — Acessibilidade insuficiente

- botões somente com ícone sem nome acessível;
- links sociais sem rótulo;
- iframe sem `sandbox` e `referrerPolicy`;
- `html lang="en"` para conteúdo pt-BR;
- animações sem `prefers-reduced-motion`;
- foco e mensagens dinâmicas não foram tratados sistematicamente.

### AUD-FE-008 — Estado, cache e sessão

- não existe provider central de autenticação;
- React Query não é limpo no logout;
- queries sensíveis usam chaves globais sem usuário em vários pontos;
- listeners de Auth estão espalhados;
- erros de schema são apresentados como erro de internet;
- polling de conexão consulta tabela inexistente a cada 30 segundos.

## Responsividade

Há uso extensivo de classes responsivas Tailwind, mas não existem testes de viewport, touch target ou navegação por teclado. A responsividade não pode ser classificada como validada.

## Próxima fase sequencial

FASE A4 — Backend, Edge Functions e regras de negócio.