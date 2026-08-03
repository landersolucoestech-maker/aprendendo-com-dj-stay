import {
  ChevronLeft,
  ChevronRight,
  FileArchive,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { Textarea } from "@/components/ui/textarea";
import type { PrivacyRightsRequestType } from "@/contracts/privacy-rights-requests";
import {
  useCancelPrivacyRightsRequest,
  useCreatePrivacyRightsRequest,
  useMyPrivacyRightsRequests,
} from "@/hooks/usePrivacyRightsRequests";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 10;

const typeLabels = {
  access_export: "Acesso e exportação",
  correction: "Correção de dados",
  deletion: "Exclusão de dados",
} as const;

const statusLabels = {
  submitted: "Recebida",
  in_review: "Em análise",
  completed: "Concluída",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
} as const;

const StudentPrivacyRights = () => {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const requestsQuery = useMyPrivacyRightsRequests(pageSize, page * pageSize);
  const createRequest = useCreatePrivacyRightsRequest();
  const cancelRequest = useCancelPrivacyRightsRequest();
  const [requestType, setRequestType] = useState<PrivacyRightsRequestType>("access_export");
  const [description, setDescription] = useState("");
  const total = requestsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSubmit = async () => {
    try {
      await createRequest.mutateAsync({
        request_type: requestType,
        description,
      });
      setDescription("");
      setPage(0);
      toast({
        title: "Solicitação registrada",
        description: "Você poderá acompanhar o andamento nesta página.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível registrar",
        description: getErrorMessage(error, "Revise os dados e tente novamente."),
      });
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelRequest.mutateAsync(requestId);
      toast({ title: "Solicitação cancelada" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível cancelar",
        description: getErrorMessage(error, "A solicitação pode já estar em análise."),
      });
    }
  };

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          eyebrow="Privacidade"
          title="Seus direitos sobre os dados"
          description="Solicite acesso e exportação, correção ou análise para exclusão dos seus dados."
        />

        <Card variant="course">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Nova solicitação
            </CardTitle>
            <CardDescription>
              A exclusão não é automática. Cada solicitação passa por análise para preservar obrigações legais, financeiras e de segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="privacy-request-type">Tipo da solicitação</Label>
              <select
                id="privacy-request-type"
                value={requestType}
                onChange={(event) => setRequestType(event.target.value as PrivacyRightsRequestType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="access_export">Acesso e exportação</option>
                <option value="correction">Correção de dados</option>
                <option value="deletion">Exclusão de dados</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy-request-description">Detalhes</Label>
              <Textarea
                id="privacy-request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="Descreva quais dados ou informações estão envolvidos."
              />
              <p className="text-xs text-muted-foreground">{description.trim().length}/4000 caracteres</p>
            </div>
            <Button
              type="button"
              disabled={description.trim().length < 10 || createRequest.isPending}
              onClick={() => void handleSubmit()}
            >
              {createRequest.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <FileArchive aria-hidden="true" />
              )}
              Registrar solicitação
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4" aria-labelledby="privacy-request-history">
          <h2 id="privacy-request-history" className="text-xl font-semibold">Histórico</h2>
          {requestsQuery.isLoading ? (
            <PageState variant="loading" title="Carregando solicitações" />
          ) : requestsQuery.error ? (
            <PageState
              variant="error"
              title="Solicitações indisponíveis"
              description={getErrorMessage(requestsQuery.error, "Não foi possível carregar o histórico.")}
            />
          ) : !requestsQuery.data || requestsQuery.data.requests.length === 0 ? (
            <PageState
              variant="empty"
              icon={FileArchive}
              title="Nenhuma solicitação registrada"
              description="Suas solicitações aparecerão aqui com o histórico de andamento."
            />
          ) : (
            <div className="space-y-4">
              {requestsQuery.data.requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{typeLabels[request.request_type]}</CardTitle>
                        <CardDescription className="mt-1">
                          Registrada em {formatAppDateTime(request.created_at)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{statusLabels[request.status]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    {request.admin_notes ? (
                      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                        <p className="font-medium">Retorno da análise</p>
                        <p className="mt-1 text-muted-foreground">{request.admin_notes}</p>
                      </div>
                    ) : null}
                    {request.events.length > 0 ? (
                      <ol className="space-y-2 border-l border-border pl-4 text-xs text-muted-foreground">
                        {request.events.map((event) => (
                          <li key={event.id}>
                            {formatAppDateTime(event.created_at)} · {event.action === "created" ? "Criada" : event.action === "cancelled" ? "Cancelada" : "Status atualizado"}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {request.status === "submitted" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancelRequest.isPending}
                        onClick={() => void handleCancel(request.id)}
                      >
                        <XCircle aria-hidden="true" />
                        Cancelar solicitação
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {total > 0 ? (
          <nav
            className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Paginação das solicitações de privacidade"
          >
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Página {page + 1} de {totalPages} · {total} solicitação(ões)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page === 0 || requestsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page + 1 >= totalPages || requestsQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentPrivacyRights;
