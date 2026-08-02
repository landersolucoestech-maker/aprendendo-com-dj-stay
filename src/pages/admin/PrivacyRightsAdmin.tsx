import { CheckCircle2, Clock3, FileArchive, Loader2, Search, XCircle } from "lucide-react";
import { useState } from "react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { Textarea } from "@/components/ui/textarea";
import type {
  PrivacyRightsRequest,
  PrivacyRightsRequestStatus,
  PrivacyRightsRequestType,
} from "@/contracts/privacy-rights-requests";
import {
  useAdminPrivacyRightsRequests,
  useAdminUpdatePrivacyRightsRequest,
} from "@/hooks/usePrivacyRightsRequests";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const typeLabels = {
  access_export: "Acesso e exportação",
  correction: "Correção",
  deletion: "Exclusão",
} as const;

const statusLabels = {
  submitted: "Recebida",
  in_review: "Em análise",
  completed: "Concluída",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
} as const;

const AdminRequestCard = ({ request }: { readonly request: PrivacyRightsRequest }) => {
  const { toast } = useToast();
  const updateRequest = useAdminUpdatePrivacyRightsRequest();
  const [notes, setNotes] = useState(request.admin_notes ?? "");

  const updateStatus = async (
    status: "in_review" | "completed" | "rejected",
  ) => {
    try {
      await updateRequest.mutateAsync({
        request_id: request.id,
        status,
        admin_notes: notes.trim() || null,
      });
      toast({ title: "Solicitação atualizada" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível atualizar",
        description: getErrorMessage(error, "Revise a transição e tente novamente."),
      });
    }
  };

  const isFinal = ["completed", "rejected", "cancelled"].includes(request.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{typeLabels[request.request_type]}</CardTitle>
            <CardDescription className="mt-1">
              {request.user_name ?? "Titular sem nome"} · {request.user_email ?? request.user_id}
            </CardDescription>
          </div>
          <Badge variant="outline">{statusLabels[request.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Solicitação
          </p>
          <p className="mt-2 text-sm">{request.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Recebida em {formatAppDateTime(request.created_at)}
          </p>
        </div>

        {request.events.length > 0 ? (
          <ol className="space-y-2 border-l border-border pl-4 text-xs text-muted-foreground">
            {request.events.map((event) => (
              <li key={event.id}>
                {formatAppDateTime(event.created_at)} · {event.action}
                {event.from_status && event.to_status
                  ? ` · ${statusLabels[event.from_status]} → ${statusLabels[event.to_status]}`
                  : ""}
              </li>
            ))}
          </ol>
        ) : null}

        {!isFinal ? (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="space-y-2">
              <Label htmlFor={`admin-notes-${request.id}`}>Observações da análise</Label>
              <Textarea
                id={`admin-notes-${request.id}`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="Registre o resultado, providências ou justificativa."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {request.status === "submitted" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateRequest.isPending}
                  onClick={() => void updateStatus("in_review")}
                >
                  <Clock3 aria-hidden="true" />
                  Iniciar análise
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={updateRequest.isPending}
                onClick={() => void updateStatus("completed")}
              >
                {updateRequest.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 aria-hidden="true" />
                )}
                Concluir
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={updateRequest.isPending || notes.trim().length === 0}
                onClick={() => void updateStatus("rejected")}
              >
                <XCircle aria-hidden="true" />
                Rejeitar
              </Button>
            </div>
          </div>
        ) : request.admin_notes ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Observações finais</p>
            <p className="mt-1 text-muted-foreground">{request.admin_notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const PrivacyRightsAdmin = () => {
  const [status, setStatus] = useState<PrivacyRightsRequestStatus | null>(null);
  const [requestType, setRequestType] = useState<PrivacyRightsRequestType | null>(null);
  const requestsQuery = useAdminPrivacyRightsRequests(status, requestType);

  return (
    <AppPageShell
      context="admin"
      eyebrow="Administração"
      title="Direitos de privacidade"
      description="Analise solicitações dos titulares sem executar exclusões automáticas."
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <FileArchive className="h-4 w-4" aria-hidden="true" />
          {requestsQuery.data?.total ?? 0} solicitações
        </span>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="privacy-admin-status">Status</Label>
              <select
                id="privacy-admin-status"
                value={status ?? ""}
                onChange={(event) =>
                  setStatus((event.target.value || null) as PrivacyRightsRequestStatus | null)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="submitted">Recebidas</option>
                <option value="in_review">Em análise</option>
                <option value="completed">Concluídas</option>
                <option value="rejected">Rejeitadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy-admin-type">Tipo</Label>
              <select
                id="privacy-admin-type"
                value={requestType ?? ""}
                onChange={(event) =>
                  setRequestType((event.target.value || null) as PrivacyRightsRequestType | null)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="access_export">Acesso e exportação</option>
                <option value="correction">Correção</option>
                <option value="deletion">Exclusão</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {requestsQuery.isLoading ? (
          <PageState variant="loading" title="Carregando solicitações" />
        ) : requestsQuery.error ? (
          <PageState
            variant="error"
            title="Solicitações indisponíveis"
            description={getErrorMessage(requestsQuery.error, "Não foi possível consultar as solicitações.")}
          />
        ) : !requestsQuery.data || requestsQuery.data.requests.length === 0 ? (
          <PageState
            variant="empty"
            icon={Search}
            title="Nenhuma solicitação encontrada"
            description="Ajuste os filtros ou aguarde novas solicitações."
          />
        ) : (
          <section className="space-y-4" aria-label="Solicitações de direitos de privacidade">
            {requestsQuery.data.requests.map((request) => (
              <AdminRequestCard key={request.id} request={request} />
            ))}
          </section>
        )}
      </div>
    </AppPageShell>
  );
};

export default PrivacyRightsAdmin;
