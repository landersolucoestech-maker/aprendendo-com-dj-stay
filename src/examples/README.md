# Exemplos de materiais privados

O componente `LessonFilesExample.tsx` demonstra a consulta dos assets publicados de uma aula por meio do hook `useLessonFiles`.

## Contrato atual

- os metadados ficam em `public.assets`;
- o arquivo fica no bucket privado `private-assets`;
- a aplicação referencia o `asset_id`, nunca uma URL permanente;
- o aluno só recebe o asset quando existe grant individual e não expirado;
- o download cria uma URL assinada de curta duração;
- caminhos e buckets públicos não são usados.

```typescript
const { data: assets, isLoading, error } = useLessonFiles(aulaId);

const sample = assets?.find((asset) => asset.purpose === "sample");
if (sample) {
  await downloadFileFromStorage(sample);
}
```

O identificador da aula deve vir da rota ou do domínio real. IDs de fallback e arquivos fictícios são proibidos.
