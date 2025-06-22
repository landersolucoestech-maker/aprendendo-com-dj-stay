
# Exemplos do Sistema de Download de Arquivos

Este diretório contém exemplos de como usar o sistema de download de arquivos das aulas.

## Arquivos

### `LessonFilesExample.tsx`
Componente de exemplo que demonstra:

- Como usar o hook `useLessonFiles` para buscar arquivos de uma aula
- Como implementar downloads de samples/loops e projetos Ableton Live
- Como tratar erros e mostrar feedback ao usuário
- Estados de carregamento e erro

## Como usar este exemplo

1. **Visualizar o exemplo:**
   - Importe o componente `LessonFilesExample` em qualquer página
   - Substitua o `exampleLessonId` por um ID real de aula do seu banco

2. **Testar downloads:**
   - Certifique-se de que existem registros na tabela `lesson_files`
   - Verifique se os arquivos estão no Supabase Storage
   - Os buckets `lesson-samples` e `lesson-projects` devem existir

## Estrutura do Sistema

### Hook: `useLessonFiles`
```typescript
// Busca arquivos de uma aula específica
const { data: lessonFiles, isLoading, error } = useLessonFiles(aulaId);
```

### Função: `downloadFileFromStorage`
```typescript
// Baixa arquivo do Supabase Storage
await downloadFileFromStorage(bucketId, filePath, fileName);
```

### Estrutura do Banco
```sql
-- Tabela lesson_files
CREATE TABLE lesson_files (
  id UUID PRIMARY KEY,
  aula_id UUID REFERENCES aulas(id),
  samples_file_path TEXT,      -- Caminho para samples/loops
  project_file_path TEXT,      -- Caminho para projeto Ableton
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Buckets do Storage
- `lesson-samples`: Para arquivos de samples e loops (.zip)
- `lesson-projects`: Para projetos Ableton Live (.als)

## Fluxo de Funcionamento

1. **Busca no Banco**: Hook consulta `lesson_files` pelo `aula_id`
2. **Verificação**: Checa se o caminho do arquivo existe
3. **Download**: Usa Supabase Storage API para baixar
4. **Blob URL**: Cria URL temporária e força download
5. **Cleanup**: Remove URL temporária da memória

## Tratamento de Erros

- Arquivo não encontrado no banco
- Arquivo não existe no storage
- Erro de rede durante download
- Permissões insuficientes

Todos os erros são tratados com toasts informativos para o usuário.
