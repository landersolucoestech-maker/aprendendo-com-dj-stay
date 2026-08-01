import { History, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFrontendErrorMaintenanceHistory } from "@/hooks/useFrontendErrors";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

export const FrontendErrorMaintenanceHistory = () => {
  const historyQuery = useFrontendErrorMaintenanceHistory(20, 0);

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <History className="h-5 w-5" />
          Histórico de manutenção
        </CardTitle>
        <CardDescription className="text-gray-400">
          Últimas execuções administrativas de retenção. Total registrado: {historyQuery.data?.total ?? 0}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : historyQuery.error ? (
          <p className="text-sm text-red-200">
            {getErrorMessage(historyQuery.error, "Não foi possível carregar o histórico de manutenção.")}
          </p>
        ) : (historyQuery.data?.events ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma manutenção foi executada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Executado em</th>
                  <th className="px-3 py-2">Retenção</th>
                  <th className="px-3 py-2">Corte</th>
                  <th className="px-3 py-2">Removidos</th>
                  <th className="px-3 py-2">Lote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-300">
                {(historyQuery.data?.events ?? []).map((event) => (
                  <tr key={event.id}>
                    <td className="px-3 py-3">{formatAppDateTime(event.created_at)}</td>
                    <td className="px-3 py-3">{event.retention_days} dias</td>
                    <td className="px-3 py-3">{formatAppDateTime(event.cutoff_at)}</td>
                    <td className="px-3 py-3">{event.affected_rows}</td>
                    <td className="px-3 py-3">
                      {typeof event.metadata.batch_limit === "number"
                        ? event.metadata.batch_limit
                        : "Não informado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
