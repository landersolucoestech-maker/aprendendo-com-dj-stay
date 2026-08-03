import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Library,
  Loader2,
} from "lucide-react";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import type { AssetRow } from "@/contracts/storage";
import { useStudentLibraryPage } from "@/hooks/useStudentLibraryPage";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";
import { downloadPrivateAsset } from "@/lib/private-assets";

const pageSize = 20;

const purposeLabels: Record<AssetRow["purpose"], string> = {
  avatar: "Avatar",
  video: "Vídeo",
  audio: "Áudio",
  image: "Imagem",
  document: "Documento",
  sample: "Sample",
  preset: "Preset",
  stem: "Stem",
  project: "Projeto",
  archive: "Arquivo compactado",
  template: "Template",
  support_file: "Arquivo de suporte",
  digital_product: "Produto digital",
};

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StudentLibraryPage = () => {
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const libraryQuery = useStudentLibraryPage(page, pageSize);
  const { toast } = useToast();
  const data = libraryQuery.data;
  const assets = data?.assets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoBack = page > 0;
  const canGoForward = (page + 1) * pageSize < total;

  useEffect(() => {
    if (data && page > 0 && page * pageSize >= data.total) {
      setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1));
    }
  }, [data, page]);

  const handleDownload = async (asset: AssetRow): Promise<void> => {
    setDownloadingId(asset.id);
    try {
      await downloadPrivateAsset(asset);
      toast({
        title: "Download iniciado",
        description: asset.original_name,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download indisponível",
        description: getErrorMessage(
          error,
          "Não foi possível gerar o acesso temporário ao arquivo.",
        ),
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <StudentPortalPageFrame>
      <div className="space-y-6">
        <StudentSectionHeader
          title="Biblioteca"
          description="Materiais privados liberados para sua conta."
        />

        {libraryQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando biblioteca"
            description="Consultando somente os materiais disponíveis para esta conta."
          />
        ) : libraryQuery.error ? (
          <PageState
            variant="error"
            title="Biblioteca indisponível"
            description={getErrorMessage(
              libraryQuery.error,
              "Não foi possível carregar sua biblioteca.",
            )}
          />
        ) : total === 0 ? (
          <PageState
            variant="empty"
            icon={Library}
            title="Nenhum material liberado"
            description="Arquivos publicados e concedidos à sua conta aparecerão aqui."
          />
        ) : (
          <section className="space-y-5" aria-label="Materiais da biblioteca">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {total === 1
                  ? "1 material disponível"
                  : `${total} materiais disponíveis`}
              </span>
              <span>
                Página {page + 1} de {totalPages}
              </span>
            </div>

            {assets.length === 0 ? (
              <PageState
                variant="empty"
                icon={Library}
                title="Nenhum material nesta página"
                description="A página será ajustada automaticamente após a atualização da biblioteca."
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {assets.map((asset) => (
                  <Card key={asset.id} variant="marketplace">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-library/10 p-3 text-library">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Badge variant="outline">{purposeLabels[asset.purpose]}</Badge>
                          <CardTitle className="mt-3 break-words">
                            {asset.original_name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {formatFileSize(asset.size_bytes)} ·{" "}
                            {formatAppDateTime(asset.published_at, {
                              fallback: "Publicação não informada",
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        type="button"
                        variant="context"
                        className="w-full"
                        disabled={downloadingId !== null}
                        onClick={() => void handleDownload(asset)}
                      >
                        {downloadingId === asset.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="h-4 w-4" aria-hidden="true" />
                        )}
                        Baixar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <nav
              className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4"
              aria-label="Paginação da biblioteca"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoBack || libraryQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoForward || libraryQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          </section>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentLibraryPage;
